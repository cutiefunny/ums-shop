'use client';

import React, { useState, useEffect } from 'react';
import styles from '../products.module.css';

const CloseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const SORT_OPTIONS = ['Latest Items', 'Low to High', 'High to Low'];

export default function SortModal({ isOpen, onClose, currentOption, onApply }) {
  // 모달 내부에서만 사용할 임시 선택 상태
  const [selectedOption, setSelectedOption] = useState(currentOption);

  // 모달이 열릴 때마다 현재 적용된 정렬 기준으로 선택 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setSelectedOption(currentOption);
    }
  }, [isOpen, currentOption]);

  if (!isOpen) {
    return null;
  }

  const handleApply = () => {
    onApply(selectedOption);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Filter</h3>
          <button onClick={onClose} className={styles.iconButton}><CloseIcon /></button>
        </div>
        <div className={styles.sortOptionsContainer}>
          {SORT_OPTIONS.map(option => (
            <label key={option} className={styles.radioLabel}>
              <input
                type="radio"
                name="sort-option"
                value={option}
                checked={selectedOption === option}
                onChange={() => setSelectedOption(option)}
              />
              <span className={styles.radioText}>{option}</span>
            </label>
          ))}
        </div>
        <button onClick={handleApply} className={styles.applyButton}>
          View results
        </button>
      </div>
    </div>
  );
}