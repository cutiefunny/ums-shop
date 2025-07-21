// public/firebase-messaging-sw.js
// Firebase SDK 초기화 (서비스 워커용)
// 이 파일은 Firebase 콘솔에서 제공하는 스니펫을 사용합니다.
// 프로젝트에 따라 버전과 구성이 다를 수 있습니다.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase 프로젝트 설정 객체. 이 정보는 YOUR_API_KEY 등과 같이 실제 값으로 대체되어야 합니다.
const firebaseConfig = {
  apiKey: "AIzaSyAKUyV7f6Gb_ZpmbIQ2mthHkdsZ9VS7Yvg",
  authDomain: "ums-shop.firebaseapp.com",
  projectId: "ums-shop",
  storageBucket: "ums-shop.appspot.com",
  messagingSenderId: "869574680544",
  appId: "1:869574680544:web:468245771096d03b8f5585",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 백그라운드 메시지 수신 처리
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/images/icon-144.png' // PWA 아이콘 경로 (public 폴더 기준)
    // ... 기타 옵션 (image, badge, vibrate 등)
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 이벤트 처리 (선택 사항)
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // 알림 닫기

  // 알림 클릭 시 특정 URL로 이동
  event.waitUntil(
    clients.openWindow('/') // 앱의 메인 페이지 또는 알림 관련 페이지로 이동
  );
});

// 참고: next-pwa와 함께 사용할 경우 sw.js 또는 workbox-*.js에 이 코드를 포함시켜야 할 수 있습니다.
// 현재 ums-shop은 public/sw.js를 사용하고 있으므로,
// public/sw.js 파일 상단에 이 firebase-messaging-sw.js의 내용을 복사하거나
// importScripts('./firebase-messaging-sw.js'); 와 같이 임포트 할 수 있습니다.