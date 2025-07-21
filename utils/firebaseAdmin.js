// utils/firebaseAdmin.js
import admin from 'firebase-admin';

// 환경 변수에서 서비스 계정 키 가져오기
// FIREBASE_SERVICE_ACCOUNT_KEY는 JSON 문자열이어야 하며, .env.local에 저장됩니다.
// 예: FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "...", ...}'
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!serviceAccount) {
  console.error('Firebase Admin SDK: FIREBASE_SERVICE_ACCOUNT_KEY 환경 변수가 설정되지 않았습니다.');
  // 개발 환경에서만 오류를 발생시키거나, 프로덕션에서는 로그만 남길 수 있습니다.
  // throw new Error('Firebase Admin SDK: Service account key is not set in environment variables.');
}

// Firebase Admin SDK 초기화 (앱이 이미 초기화되지 않은 경우에만)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
}

const firebaseAdmin = admin;
export { firebaseAdmin };