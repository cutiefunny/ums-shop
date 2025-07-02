// components/admin/category-management/modals/CategoryTypeSelectionModal.js
import React from 'react';
import styles from './modal.module.css'; // 모달 스타일 임포트

export default function CategoryTypeSelectionModal({ onClose, onSelectType }) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        <h2 className={styles.modalTitle}>Add New Category</h2>
        <div className={styles.categoryTypeSelection}>
          <button className={styles.categoryTypeButton} onClick={() => onSelectType('main')}>
            Main Category
          </button>
          <button className={styles.categoryTypeButton} onClick={() => onSelectType('surve1')}>
            Surve Category 1
          </button>
          <button className={styles.categoryTypeButton} onClick={() => onSelectType('surve2')}>
            Surve Category 2
          </button>
        </div>
      </div>
    </div>
  );
}