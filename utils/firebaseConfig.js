// utils/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAKUyV7f6Gb_ZpmbIQ2mthHkdsZ9VS7Yvg",
  authDomain: "ums-shop.firebaseapp.com",
  projectId: "ums-shop",
  storageBucket: "ums-shop.appspot.com",
  messagingSenderId: "869574680544",
  appId: "1:869574680544:web:468245771096d03b8f5585",
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Messaging 서비스 가져오기
let messaging;
if (typeof window !== 'undefined') { // 브라우저 환경에서만 실행되도록 조건부 로딩
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.error("Error initializing Firebase Messaging:", e);
  }
}

export { app, messaging };