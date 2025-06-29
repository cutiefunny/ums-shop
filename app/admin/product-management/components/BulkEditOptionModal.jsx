// app/admin/product-management/components/BulkEditOptionModal.jsx
'use client';

import React, { useRef, useEffect } from 'react';
import styles from './product-modal.module.css'; // 새로운 CSS 모듈 사용 (아래에서 생성)

/**
 * 일괄 수정 옵션 선택 모달 컴포넌트
 * @param {object} props
 * @param {boolean} props.isOpen - 모달 표시 여부
 * @param {function} props.onClose - 모달 닫기 함수
 * @param {function} props.onSelectOption - 옵션 선택 시 호출될 콜백 ('유통기한' 또는 '납기일')
 */
export default function BulkEditOptionModal({ isOpen, onClose, onSelectOption }) {
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
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} ref={modalRef}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>일괄 수정 옵션 선택</h2>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.buttonGroup}>
            <button 
              onClick={() => onSelectOption('유통기한')} 
              className={styles.modalOptionButton}
            >
              유통기한 수정
            </button>
            <button 
              onClick={() => onSelectOption('납기일')} 
              className={styles.modalOptionButton}
            >
              납기일 수정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
