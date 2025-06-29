// contexts/AdminModalContext.js
'use client'; // 클라이언트 컴포넌트임을 명시

import React, { createContext, useContext, useState } from 'react';

// AdminModalContext를 생성합니다.
const AdminModalContext = createContext(undefined);

export function AdminModalContextProvider({ children }) {
  // 모달 상태를 관리하는 useState 훅
  const [modalState, setModalState] = useState({ 
    isOpen: false, 
    type: null, // 'notification' 또는 'confirmation'
    message: '', 
    onConfirm: null, 
    onCancel: null 
  });

  // 알림 모달을 보여주는 함수
  const showAdminNotificationModal = (message) => {
    setModalState({ isOpen: true, type: 'notification', message });
  };

  // 확인 모달을 보여주는 함수
  const showAdminConfirmationModal = (message, onConfirm, onCancel) => {
    setModalState({ isOpen: true, type: 'confirmation', message, onConfirm, onCancel });
  };

  // 모든 모달을 닫는 함수
  const closeAdminModal = () => {
    setModalState({ isOpen: false, type: null, message: '', onConfirm: null, onCancel: null }); 
  };

  // 컨텍스트 프로바이더가 자식 컴포넌트들에게 모달 상태와 함수를 제공합니다.
  return (
    <AdminModalContext.Provider value={{
      modalState,
      showAdminNotificationModal,
      showAdminConfirmationModal,
      closeAdminModal
    }}>
      {children}
    </AdminModalContext.Provider>
  );
}

// AdminModalContext를 사용하기 위한 커스텀 훅
export function useAdminModal() {
  const context = useContext(AdminModalContext);
  if (context === undefined) {
    // 프로바이더 외부에서 훅이 호출될 경우 에러 발생
    throw new Error('useAdminModal must be used within an AdminModalContextProvider');
  }
  return context;
}
