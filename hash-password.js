// hash-password.js
import { hashPassword } from './utils/auth.js'; // utils/auth.js 경로에 맞게 조정

async function generateAdminPassword() {
  const plainPassword = '123456'; // 사용할 평문 비밀번호
  const hashedPassword = await hashPassword(plainPassword);
  console.log('Hashed Password:', hashedPassword);
  // 솔트는 해싱된 비밀번호 안에 포함되어 있으므로 따로 저장할 필요 없습니다.
}

generateAdminPassword();