'use client';

import React, { createContext, useState, useContext, useCallback } from 'react';
import NotificationModal from '@/components/NotificationModal';

const ModalContext = createContext(null);

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isVisible: false,
    message: '',
    onOk: null,
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

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}
      <NotificationModal
        isVisible={modalState.isVisible}
        message={modalState.message}
        onOk={modalState.onOk}
        onClose={hideModal}
      />
    </ModalContext.Provider>
  );
};