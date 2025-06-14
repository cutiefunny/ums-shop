'use client';

import React from 'react';
import styles from '../app/auth.module.css'; // 기존 스타일 재사용

/**
 * 확인/알림용 모달 컴포넌트
 * @param {object} props
 * @param {boolean} props.isOpen - 모달 표시 여부
 * @param {string} props.title - 모달 제목
 * @param {string} props.message - 모달 메시지
 * @param {string} props.buttonText - 버튼 텍스트
 * @param {() => void} props.onConfirm - 확인 버튼 클릭 시 실행할 함수
 */
export default function ConfirmationModal({ isOpen, title, message, buttonText, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalMessage}>{message}</p>
        <button onClick={onConfirm} className={styles.button}>
          {buttonText}
        </button>
      </div>
    </div>
  );
}