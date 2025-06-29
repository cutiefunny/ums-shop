// app/admin/product-management/components/BulkDateEditModal.jsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './product-modal.module.css'; // product-modal.module.css 재사용

/**
 * 유통기한 일괄 수정을 위한 날짜 입력 모달 컴포넌트
 * @param {object} props
 * @param {boolean} props.isOpen - 모달 표시 여부
 * @param {function} props.onClose - 모달 닫기 함수
 * @param {function} props.onSave - 날짜 저장 시 호출될 콜백 (날짜 문자열을 인자로 받음)
 * @param {string} props.title - 모달 제목
 */
export default function BulkDateEditModal({ isOpen, onClose, onSave, title }) {
  const [dateValue, setDateValue] = useState('');
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
        setDateValue('');
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSaveClick = () => {
    if (!dateValue) {
      alert('날짜를 입력해주세요.'); // TODO: AdminNotificationModal로 변경
      return;
    }
    // 날짜 형식 검증 (간단한 YYYY-MM-DD 형식만 허용)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateValue)) {
        alert('날짜 형식이 올바르지 않습니다 (YYYY-MM-DD).'); // TODO: AdminNotificationModal로 변경
        return;
    }

    if (onSave) {
      onSave(dateValue);
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
            type="date" // HTML5 date input
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className={styles.modalInput}
            placeholder="YYYY-MM-DD"
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
