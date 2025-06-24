// utils/auth.js
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10; // bcrypt 솔트 생성 라운드 수

/**
 * 비밀번호를 해싱합니다.
 * @param {string} password - 해싱할 평문 비밀번호
 * @returns {Promise<string>} 해싱된 비밀번호
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

/**
 * 평문 비밀번호와 해싱된 비밀번호를 비교합니다.
 * @param {string} password - 비교할 평문 비밀번호
 * @param {string} hashedPassword - 데이터베이스에 저장된 해싱된 비밀번호
 * @returns {Promise<boolean>} 일치 여부
 */
export async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}
