// utils/jwt.js
// import jwt from 'jsonwebtoken'; // jsonwebtoken 제거
import { SignJWT, jwtVerify } from 'jose'; // jose 라이브러리 임포트

const JWT_SECRET = process.env.JWT_SECRET; // .env.local에서 가져옴

/**
 * JWT 토큰을 생성합니다.
 * @param {object} payload - 토큰에 포함될 페이로드 (예: userId, role)
 * @param {string} expiresIn - 토큰 만료 시간 (예: '1h', '7d')
 * @returns {Promise<string>} 생성된 JWT 토큰
 */
export async function generateToken(payload, expiresIn = '1h') {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  const secret = new TextEncoder().encode(JWT_SECRET); // 비밀 키를 Uint8Array로 변환
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' }) // HS256 알고리즘 사용
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * JWT 토큰을 검증하고 페이로드를 반환합니다.
 * @param {string} token - 검증할 JWT 토큰
 * @returns {Promise<object | null>} 유효한 경우 페이로드, 그렇지 않으면 null
 */
export async function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  const secret = new TextEncoder().encode(JWT_SECRET); // 비밀 키를 Uint8Array로 변환
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'], // 사용된 알고리즘 명시
    });
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
}
