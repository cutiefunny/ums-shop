// components/admin/category-management/modals/AddSurve2CategoryModal.js
import React, { useState, useEffect } from 'react';
import styles from './modal.module.css';

export default function AddSurve2CategoryModal({ onClose, onAddCategory, mainCategories, isEditMode, initialData, onEditCategory }) {
  const [selectedMainCategory, setSelectedMainCategory] = useState('');
  const [selectedSurve1Category, setSelectedSurve1Category] = useState('');
  const [surve2Name, setSurve2Name] = useState('');
  const [categoryCode, setCategoryCode] = useState('');

  const [surve1Options, setSurve1Options] = useState([]);

  // 수정 모드일 때 초기 데이터로 폼 채우기
  useEffect(() => {
    if (isEditMode && initialData) {

      setSelectedMainCategory(initialData.mainCategoryId || '');
      setSelectedSurve1Category(initialData.surve1CategoryId || '');
      setSurve2Name(initialData.name || '');
      setCategoryCode(initialData.code || '');
    } else {
      // 추가 모드일 때 폼 초기화 및 첫 번째 Main Category 선택
      setSurve2Name('');
      setCategoryCode('');
      if (mainCategories && mainCategories.length > 0) {
        setSelectedMainCategory(mainCategories[0].categoryId);
      } else {
        setSelectedMainCategory('');
      }
      setSelectedSurve1Category(''); // Surve1도 초기화
    }
  }, [isEditMode, initialData, mainCategories]);

  // 선택된 Main Category에 따라 Surve Category 1 목록 필터링 및 로드
  useEffect(() => {
    const fetchSurve1Options = async () => {
        if (selectedMainCategory) {
            try {
                const response = await fetch(`/api/categories?level=surve1&parentId=${selectedMainCategory}`);
                const data = await response.json();
                setSurve1Options(data);
                // 수정 모드일 때는 initialData의 surve1CategoryId를 기본 선택값으로, 아니면 첫 번째 항목
                if (isEditMode && initialData?.subCategory1Id && data.some(item => item.categoryId === initialData.subCategory1Id)) {
                    setSelectedSurve1Category(initialData.subCategory1Id);
                } else if (data.length > 0) {
                    setSelectedSurve1Category(data[0].categoryId);
                } else {
                    setSelectedSurve1Category('');
                }
            } catch (error) {
                console.error("Error fetching surve1 categories for dropdown:", error);
                setSurve1Options([]);
                setSelectedSurve1Category('');
            }
        } else {
            setSurve1Options([]);
            setSelectedSurve1Category('');
        }
    };
    fetchSurve1Options();
  }, [selectedMainCategory, isEditMode, initialData]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMainCategory || !selectedSurve1Category || !surve2Name) {
      alert('All fields are required.');
      return;
    }

    if (isEditMode && initialData?.categoryId) { // 수정 모드
        onEditCategory({
            categoryId: initialData.categoryId, // subCategory2Id가 categoryId로 매핑됨
            name: surve2Name,
            code: categoryCode,
            subCategory1Id: selectedSurve1Category // 부모 ID도 업데이트될 수 있도록 포함
        });
    } else { // 추가 모드
        const formData = new FormData();
        formData.append('type', 'surve2');
        formData.append('mainCategoryId', selectedMainCategory); // 백엔드에서 필요시 사용
        formData.append('surve1CategoryId', selectedSurve1Category);
        formData.append('name', surve2Name);
        formData.append('code', categoryCode);
        onAddCategory(formData);
    }
    onClose();
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        <h2 className={styles.modalTitle}>{isEditMode ? 'Edit Surve Category 2' : 'Add Surve Category 2'}</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="mainCategorySelect">Main Category</label>
            <select
              id="mainCategorySelect"
              value={selectedMainCategory}
              onChange={(e) => setSelectedMainCategory(e.target.value)}
              required
              disabled={isEditMode} // 수정 모드에서는 부모 카테고리 변경 불가
            >
              {mainCategories.map((cat) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="surve1CategorySelect">Surve Category 1</label>
            <select
              id="surve1CategorySelect"
              value={selectedSurve1Category}
              onChange={(e) => setSelectedSurve1Category(e.target.value)}
              required
              disabled={isEditMode || !selectedMainCategory || surve1Options.length === 0} // 수정 모드, 또는 Main 선택 없거나 옵션 없으면 비활성화
            >
              {surve1Options.length > 0 ? (
                surve1Options.map((cat) => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    {cat.name}
                  </option>
                ))
              ) : (
                <option value="">No Surve 1 Categories available</option>
              )}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="surve2CategoryName">Surve Category 2 Name</label>
            <input
              type="text"
              id="surve2CategoryName"
              value={surve2Name}
              onChange={(e) => setSurve2Name(e.target.value)}
              placeholder="e.g., Jelly"
              required
            />
          </div>
          <button type="submit" className={styles.modalButton}>{isEditMode ? 'Save Changes' : 'Add'}</button>
        </form>
      </div>
    </div>
  );
}