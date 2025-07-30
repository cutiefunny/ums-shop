'use client';

import React, { createContext, useState, useContext, useCallback } from 'react';
import NotificationModal from '@/components/NotificationModal';
import ConfirmationModal from '@/components/ConfirmationModal'; // ConfirmationModal 임포트

const ModalContext = createContext(null);

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isVisible: false,
    message: '',
    onOk: null,
  });

  // ConfirmationModal을 위한 새로운 상태
  const [confirmationModalState, setConfirmationModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    buttonText: 'Confirm', // 기본 버튼 텍스트
    onConfirm: null,
    onCancel: null,
  });


  const showModal = useCallback((message, onOkCallback) => {
    setModalState({
      isVisible: true,
      message,
      onOk: onOkCallback,
    });
  }, []);

  const hideModal = useCallback(() => {
    setModalState(prevState => ({ ...prevState, isVisible: false }));
  }, []);

  // ConfirmationModal을 보여주는 함수
  const showConfirmationModal = useCallback((title, message, onConfirmCallback, onCancelCallback, buttonText = '확인') => {
    setConfirmationModalState({
      isOpen: true,
      title,
      message,
      buttonText,
      onConfirm: onConfirmCallback,
      onCancel: onCancelCallback,
    });
  }, []);

  // ConfirmationModal을 숨기는 함수
  const hideConfirmationModal = useCallback(() => {
    setConfirmationModalState(prevState => ({ ...prevState, isOpen: false }));
  }, []);


  return (
    <ModalContext.Provider value={{ showModal, showConfirmationModal }}> {/* showConfirmationModal도 컨텍스트에 추가 */}
      {children}
      <NotificationModal
        isVisible={modalState.isVisible}
        message={modalState.message}
        onOk={modalState.onOk}
        onClose={hideModal}
      />
      {/* ConfirmationModal 렌더링 */}
      <ConfirmationModal
        isOpen={confirmationModalState.isOpen}
        title={confirmationModalState.title}
        message={confirmationModalState.message}
        buttonText={confirmationModalState.buttonText}
        onConfirm={() => {
          if (confirmationModalState.onConfirm) {
            confirmationModalState.onConfirm();
          }
          hideConfirmationModal();
        }}
        onCancel={() => {
          if (confirmationModalState.onCancel) {
            confirmationModalState.onCancel();
          }
          hideConfirmationModal();
        }}
      />
    </ModalContext.Provider>
  );
};