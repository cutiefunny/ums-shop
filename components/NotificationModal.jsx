'use client';

import React from 'react';
import styles from './modal.module.css'; // 모달 전용 CSS 파일을 사용합니다.

export default function NotificationModal({ isVisible, message, onOk, onClose }) {
  if (!isVisible) {
    return null;
  }

  const handleOkClick = () => {
    // onOk 콜백이 있으면 실행합니다.
    if (onOk) {
      onOk();
    }
    onClose(); // 모달을 닫습니다.
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <button onClick={handleOkClick} className={styles.okButton}>
          OK
        </button>
      </div>
    </div>
  );
}