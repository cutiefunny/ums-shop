// components/admin/category-management/modals/AddMainCategoryModal.js
import React, { useState, useEffect } from 'react';
import styles from './modal.module.css';

export default function AddMainCategoryModal({ onClose, onAddCategory, isEditMode, initialData, onEditCategory }) {
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState(null); // File 객체
  const [previewUrl, setPreviewUrl] = useState(null); // 미리보기 URL
  const [initialImageUrl, setInitialImageUrl] = useState(null); // 기존 이미지 URL 저장
  const [code, setCode] = useState(''); // Main Category에도 code 필드 추가 가정

  // 수정 모드일 때 초기 데이터로 폼 채우기
  useEffect(() => {
    if (isEditMode && initialData) {
      setName(initialData.name || '');
      setCode(initialData.code || '');
      setInitialImageUrl(initialData.imageUrl || null); // 기존 이미지 URL
      setPreviewUrl(initialData.imageUrl || null); // 미리보기를 기존 이미지로 설정
      setImageFile(null); // 새로운 파일 선택을 위한 초기화
    } else {
      // 추가 모드일 때 폼 초기화
      setName('');
      setCode('');
      setImageFile(null);
      setPreviewUrl(null);
      setInitialImageUrl(null);
    }
  }, [isEditMode, initialData]);

  // imageFile이 변경될 때 미리보기 URL 업데이트
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url); // cleanup
    } else if (!isEditMode) { // 추가 모드에서 파일이 없으면 미리보기 제거
      setPreviewUrl(null);
    }
    // isEditMode이고 imageFile이 null이면 initialImageUrl 유지
  }, [imageFile, isEditMode]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      alert('Main Category Name is required.');
      return;
    }

    const formData = new FormData();
    formData.append('type', 'main'); // 타입은 항상 'main'
    formData.append('name', name);
    formData.append('code', code); // code 필드 추가

    // 수정 모드일 때는 categoryId를 전달
    if (isEditMode && initialData?.categoryId) {
        formData.append('categoryId', initialData.categoryId); // PUT 요청을 위한 ID
        // 이미지 파일이 새로 선택되었다면 (기존 이미지와 다를 경우)
        if (imageFile) {
            formData.append('imageFile', imageFile); // File 객체 추가 (백엔드에서 S3 업로드 처리)
        } else if (initialImageUrl) {
            // 이미지를 변경하지 않았지만 기존 이미지가 있는 경우, URL 유지
            formData.append('imageUrl', initialImageUrl);
        }
        // onEditCategory는 FormData를 받지 않으므로, 필요한 데이터만 객체로 전달
        onEditCategory({ 
            categoryId: initialData.categoryId, 
            name, 
            code, 
            imageUrl: imageFile ? previewUrl : initialImageUrl // 새 이미지면 새 URL, 아니면 기존 URL
            // imageFile 자체는 FormData에 담겨 전달될 것이므로 여기서는 URL만 전달
        });
    } else {
        // 추가 모드일 때는 imageFile 객체 자체를 FormData에 추가
        if (imageFile) {
            formData.append('imageFile', imageFile);
        }
        onAddCategory(formData);
    }
    onClose();
  };

  const handleImageChange = (e) => {
    const file = e.target.files ? e.target.files?.[0] : null;
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
    } else {
      setImageFile(null);
      alert('Only image files are allowed.');
      e.target.value = '';
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        <h2 className={styles.modalTitle}>{isEditMode ? 'Edit Main Category' : 'Add Main Category'}</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="mainCategoryName">Main Category Name</label>
            <input
              type="text"
              id="mainCategoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Health & Wellness"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="mainCategoryImage">Image</label>
            <input
              type="file"
              id="mainCategoryImage"
              accept="image/*"
              onChange={handleImageChange}
            />
            <p className={styles.fileUploadInfo}>규격 400X400px 이미지만 업로드 가능합니다.</p>
            {previewUrl && (
              <div className={styles.imagePreviewContainer}>
                <img src={previewUrl} alt="Image Preview" className={styles.imagePreview} />
              </div>
            )}
          </div>
          <button type="submit" className={styles.modalButton}>{isEditMode ? 'Save Changes' : 'Add'}</button>
        </form>
      </div>
    </div>
  );
}