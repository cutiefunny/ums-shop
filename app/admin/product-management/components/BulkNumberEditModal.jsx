// app/admin/product-management/components/BulkNumberEditModal.jsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './product-modal.module.css'; // product-modal.module.css 재사용

/**
 * 납기일 일괄 수정을 위한 숫자 입력 모달 컴포넌트
 * @param {object} props
 * @param {boolean} props.isOpen - 모달 표시 여부
 * @param {function} props.onClose - 모달 닫기 함수
 * @param {function} props.onSave - 숫자 저장 시 호출될 콜백 (숫자 값을 인자로 받음)
 * @param {string} props.title - 모달 제목
 */
export default function BulkNumberEditModal({ isOpen, onClose, onSave, title }) {
  const [numberValue, setNumberValue] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    } else {
      document.removeEventListener('keydown', handleEscape);
    };

    // 모달이 열릴 때마다 입력값 초기화
    if (isOpen) {
        setNumberValue('');
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSaveClick = () => {
    const parsedValue = parseInt(numberValue);
    if (isNaN(parsedValue)) {
      alert('유효한 숫자를 입력해주세요.'); // TODO: AdminNotificationModal로 변경
      return;
    }
    if (onSave) {
      onSave(parsedValue);
    }
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} ref={modalRef}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          <input
            type="number" // 숫자 입력
            value={numberValue}
            onChange={(e) => setNumberValue(e.target.value)}
            className={styles.modalInput}
            placeholder="숫자 입력"
          />
        </div>
        <div className={styles.modalFooter}>
          <button onClick={handleSaveClick} className={styles.modalOkayButton}>
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
