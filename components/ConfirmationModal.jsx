'use client';

import React from 'react';
import styles from './modal.module.css'; // 모달 전용 CSS 파일을 사용합니다.

/**
 * 확인/알림용 모달 컴포넌트
 * @param {object} props
 * @param {boolean} props.isOpen - 모달 표시 여부
 * @param {string} props.title - 모달 제목
 * @param {string} props.message - 모달 메시지
 * @param {string} props.buttonText - 버튼 텍스트
 * @param {() => void} props.onConfirm - 확인 버튼 클릭 시 실행할 함수
 * @param {() => void} props.onCancel - 취소 버튼 클릭 시 실행할 함수
 */
export default function ConfirmationModal({ isOpen, title, message, buttonText, onConfirm, onCancel }) {
  if (!isOpen) return null;

  // 모달 외부 클릭 시 닫기 기능 추가
  const handleOverlayClick = (e) => {
    if (e.target.className.includes(styles.modalOverlay)) {
      onCancel();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalMessage}>{message}</p>
        <div className={styles.buttonContainer}>
          <button onClick={onConfirm} className={styles.okButton}>
            {buttonText}
          </button>
          <button onClick={onCancel} className={styles.cancelButton}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}