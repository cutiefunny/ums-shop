// components/admin/category-management/modals/AddSurve1CategoryModal.js
import React, { useState, useEffect } from 'react';
import styles from './modal.module.css';

export default function AddSurve1CategoryModal({ onClose, onAddCategory, mainCategories, isEditMode, initialData, onEditCategory }) {
  const [selectedMainCategory, setSelectedMainCategory] = useState('');
  const [surve1Name, setSurve1Name] = useState('');
  const [code, setCode] = useState(''); // Surve1에도 code 필드 추가 가정

  // 수정 모드일 때 초기 데이터로 폼 채우기
  useEffect(() => {
    if (isEditMode && initialData) {
      setSelectedMainCategory(initialData.mainCategoryId || '');
      setSurve1Name(initialData.name || '');
      setCode(initialData.code || '');
      console.log('Initial Data:', initialData);
    } else {
      // 추가 모드일 때 폼 초기화 및 첫 번째 Main Category 선택
      setSurve1Name('');
      setCode('');
      if (mainCategories && mainCategories.length > 0) {
        setSelectedMainCategory(mainCategories[0].categoryId);
      } else {
        setSelectedMainCategory('');
      }
    }
  }, [isEditMode, initialData, mainCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMainCategory || !surve1Name) {
      alert('Main Category and Surve Category 1 Name are required.');
      return;
    }

    if (isEditMode && initialData?.categoryId) { // 수정 모드
        onEditCategory({
            categoryId: initialData.categoryId, // subCategory1Id가 categoryId로 매핑됨
            name: surve1Name,
            code,
            mainCategoryId: selectedMainCategory // 부모 ID도 업데이트될 수 있도록 포함
        });
    } else { // 추가 모드
        const formData = new FormData();
        formData.append('type', 'surve1');
        formData.append('mainCategoryId', selectedMainCategory);
        formData.append('name', surve1Name);
        formData.append('code', code);
        onAddCategory(formData);
    }
    onClose();
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        <h2 className={styles.modalTitle}>{isEditMode ? 'Edit Surve Category 1' : 'Add Surve Category 1'}</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="mainCategorySelect">Main Category</label>
            <select
              id="mainCategorySelect"
              value={selectedMainCategory}
              onChange={(e) => setSelectedMainCategory(e.target.value)}
              required
              disabled={isEditMode} // 수정 모드에서는 부모 카테고리 변경 불가 (ID 변경 방지)
            >
              {mainCategories.map((cat) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="surve1CategoryName">Surve Category 1 Name</label>
            <input
              type="text"
              id="surve1CategoryName"
              value={surve1Name}
              onChange={(e) => setSurve1Name(e.target.value)}
              placeholder="e.g., Herbal Extracts & Supplements"
              required
            />
          </div>
          <button type="submit" className={styles.modalButton}>{isEditMode ? 'Save Changes' : 'Add'}</button>
        </form>
      </div>
    </div>
  );
}