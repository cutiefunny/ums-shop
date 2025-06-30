// app/admin/category-management/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Image 컴포넌트 사용을 위해 임포트
import { useRouter } from 'next/navigation';
import styles from './category-management.module.css'; // 새로 생성한 CSS 모듈 임포트

// AdminModalContext 훅 사용
import { useAdminModal } from '@/contexts/AdminModalContext';

// 임시 Mock 데이터 (실제 DynamoDB 연동 시 대체될 부분)
const MOCK_CATEGORIES = [
  { categoryId: 'health-wellness', name: 'Health & Wellness', code: 'HEA', subCategory1Count: 3, subCategory2Count: 5, status: 'Active', order: 1 },
  { categoryId: 'food-beverages', name: 'Food & Beverages', code: 'FOO', subCategory1Count: 2, subCategory2Count: 4, status: 'Active', order: 2 },
  { categoryId: 'fashion-lifestyle', name: 'Fashion & Lifestyle', code: 'FAS', subCategory1Count: 1, subCategory2Count: 2, status: 'Inactive', order: 3 },
  { categoryId: 'electronics-gadgets', name: 'Electronics & Gadgets', code: 'ELE', subCategory1Count: 0, subCategory2Count: 0, status: 'Active', order: 4 },
  { categoryId: 'tech-communication', name: 'Tech & Communication', code: 'TEC', subCategory1Count: 1, subCategory2Count: 1, status: 'Active', order: 5 },
  { categoryId: 'personal-care-grooming', name: 'Personal Care & Grooming', code: 'PER', subCategory1Count: 2, subCategory2Count: 3, status: 'Active', order: 6 },
  { categoryId: 'kids-essentials', name: 'Kids\' Essentials', code: 'KID', subCategory1Count: 0, subCategory2Count: 0, status: 'Inactive', order: 7 },
  { categoryId: 'outdoor-sports-leisure', name: 'Outdoor, Sports & Leisure', code: 'OUT', subCategory1Count: 1, subCategory2Count: 0, status: 'Active', order: 8 },
  { categoryId: 'cabin-care-home-comforts', name: 'Cabin Care & Home Comforts', code: 'CLC', subCategory1Count: 2, subCategory2Count: 2, status: 'Active', order: 9 },
  { categoryId: 'korean-souvenirs-gifts', name: 'Korean Souvenirs & Gifts', code: 'GIF', subCategory1Count: 0, subCategory2Count: 0, status: 'Active', order: 10 },
];


const ITEMS_PER_PAGE = 5; // 페이지당 항목 수

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Active', 'Inactive'
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();
  const { showAdminNotificationModal, showAdminConfirmationModal } = useAdminModal();

  // API를 통해 카테고리 데이터를 가져오는 함수
  async function fetchCategories() {
    try {
      setLoading(true);
      setError(null);
      // TODO: 실제 DynamoDB API Route 호출 (예: /api/admin/categories)
      // const response = await fetch('/api/admin/categories');
      // if (!response.ok) {
      //   throw new Error(`HTTP error! status: ${response.status}`);
      // }
      // const data = await response.json();
      // setCategories(data || []);

      // Mock 데이터 사용
      setCategories(MOCK_CATEGORIES);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(`카테고리 목록을 불러오는 데 실패했습니다: ${err.message}`);
      showAdminNotificationModal(`카테고리 목록을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    return categories
      .filter(category => {
        const matchesSearch =
          category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter =
          filterStatus === 'All' || category.status === filterStatus;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => a.order - b.order); // Order by 'order' field
  }, [categories, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE);
  const currentCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCategories.slice(startIndex, endIndex);
  }, [filteredCategories, currentPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterStatusChange = (e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleStatusToggle = async (categoryId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    console.log(`Category ${categoryId} status changed to: ${newStatus}`);

    try {
      // TODO: 실제 DynamoDB API 호출 (PUT /api/admin/categories/[categoryId])
      // const response = await fetch(`/api/admin/categories/${categoryId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status: newStatus }),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || `Failed to update status for category ${categoryId}`);
      // }

      setCategories(prevCategories =>
        prevCategories.map(category =>
          category.categoryId === categoryId ? { ...category, status: newStatus } : category
        )
      );
      showAdminNotificationModal(`카테고리 ${categoryId}의 상태가 ${newStatus}로 변경되었습니다.`);
    } catch (err) {
      console.error("Error updating category status:", err);
      showAdminNotificationModal(`카테고리 상태 변경 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  const handleEditCategory = (categoryId) => {
    showAdminNotificationModal(`카테고리 ${categoryId} 수정 (미구현)`);
    // router.push(`/admin/category-management/${categoryId}/edit`);
  };

  const handleDeleteCategory = async (categoryId) => {
    showAdminConfirmationModal(
      `정말로 카테고리 ${categoryId}를 삭제하시겠습니까?`,
      async () => {
        setLoading(true);
        setError(null);
        try {
          // TODO: 실제 DynamoDB API 호출 (DELETE /api/admin/categories/[categoryId])
          // const response = await fetch(`/api/admin/categories/${categoryId}`, {
          //   method: 'DELETE',
          // });
          // if (!response.ok) {
          //   const errorData = await response.json();
          //   throw new Error(errorData.message || `Failed to delete category ${categoryId}`);
          // }

          setCategories(prevCategories => prevCategories.filter(c => c.categoryId !== categoryId));
          showAdminNotificationModal(`카테고리 ${categoryId}이(가) 삭제되었습니다.`);
        } catch (err) {
          console.error("Error deleting category:", err);
          showAdminNotificationModal(`카테고리 삭제 중 오류가 발생했습니다: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      () => {
        console.log('카테고리 삭제 취소됨');
      }
    );
  };

  const handleAddCategory = () => {
    showAdminNotificationModal('새 카테고리 추가 (미구현)');
    // router.push('/admin/category-management/new');
  };

  const handleReorder = async (categoryId, direction) => {
    // 순서 변경 로직
    // 현재 `categories` 배열을 복사하여 수정
    const updatedCategories = [...categories].sort((a, b) => a.order - b.order); // order 기준으로 정렬
    const index = updatedCategories.findIndex(c => c.categoryId === categoryId);

    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      // 위로 이동: 현재 항목과 바로 위 항목의 order 값을 교환
      const prevCategory = updatedCategories[index - 1];
      const currentCategory = updatedCategories[index];

      // order 값 교환
      const tempOrder = currentCategory.order;
      currentCategory.order = prevCategory.order;
      prevCategory.order = tempOrder;

      // 배열에서 위치도 변경 (선택 사항, order만 변경하고 다시 정렬해도 됨)
      [updatedCategories[index], updatedCategories[index - 1]] = [updatedCategories[index - 1], updatedCategories[index]];

    } else if (direction === 'down' && index < updatedCategories.length - 1) {
      // 아래로 이동: 현재 항목과 바로 아래 항목의 order 값을 교환
      const nextCategory = updatedCategories[index + 1];
      const currentCategory = updatedCategories[index];

      // order 값 교환
      const tempOrder = currentCategory.order;
      currentCategory.order = nextCategory.order;
      nextCategory.order = tempOrder;

      // 배열에서 위치도 변경
      [updatedCategories[index], updatedCategories[index + 1]] = [updatedCategories[index + 1], updatedCategories[index]];
    }

    // 변경된 order 값을 서버에 반영해야 합니다.
    // 여기서는 목업 데이터만 업데이트하고, 실제로는 각 카테고리들의 order를 PUT 요청으로 업데이트해야 합니다.
    setCategories(updatedCategories);

    showAdminNotificationModal('카테고리 순서가 변경되었습니다. 저장 버튼을 눌러 적용하세요.');
  };

  const handleSaveAllChanges = async () => {
    showAdminConfirmationModal(
      '변경된 모든 카테고리 순서를 저장하시겠습니까?',
      async () => {
        setLoading(true);
        setError(null);
        try {
          // TODO: 모든 카테고리의 변경된 order 값을 DynamoDB에 일괄 업데이트하는 API 호출
          // (BatchWriteItem 또는 개별 PUT 요청)
          // 예시:
          // const updatePromises = categories.map(category =>
          //   fetch(`/api/admin/categories/${category.categoryId}`, {
          //     method: 'PUT',
          //     headers: { 'Content-Type': 'application/json' },
          //     body: JSON.stringify({ order: category.order }),
          //   })
          // );
          // await Promise.allSettled(updatePromises);
          
          showAdminNotificationModal('모든 변경 사항이 성공적으로 저장되었습니다.');
        } catch (err) {
          console.error("Error saving all changes:", err);
          showAdminNotificationModal(`변경 사항 저장 중 오류가 발생했습니다: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      () => {
        console.log('저장 취소됨');
      }
    );
  };


  if (loading) {
    return <div className={styles.container}>Loading categories...</div>;
  }

  if (error) {
    return <div className={`${styles.container} ${styles.errorText}`}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {/* 이미지에 없는 기능이지만, 예시로 남겨둠 */}
          {/* <button className={styles.uploadButton}>Upload</button>
          <button className={styles.excelButton}>EXCELL</button>
          <button className={styles.pdfButton}>PDF</button> */}
        </div>
        <div className={styles.headerRight}>
          <button onClick={handleAddCategory} className={styles.addButton}>+ Add</button>
        </div>
      </header>

      <div className={styles.controls}>
        <div className={styles.searchGroup}>
          <input
            type="text"
            placeholder="Search Main Category or Code"
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          <button className={styles.searchButton}>Search</button>
        </div>
        <div className={styles.filterGroup}>
          <select value={filterStatus} onChange={handleFilterStatusChange} className={styles.filterSelect}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Main Category</th>
            <th>Surve Category 1</th>
            <th>Surve Category 2</th>
            <th>Status</th>
            <th>Actions</th>
            <th>Number</th>
          </tr>
        </thead>
        <tbody>
          {currentCategories.length > 0 ? (
            currentCategories.map(category => (
              <tr key={category.categoryId}>
                <td>{category.name} ({category.code})</td>
                <td>{category.subCategory1Count} sub-categories</td> {/* 목업 데이터 */}
                <td>{category.subCategory2Count} sub-categories</td> {/* 목업 데이터 */}
                <td>
                  <button onClick={() => handleStatusToggle(category.categoryId, category.status)} className={styles.statusToggle}>
                    {category.status === 'Active' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a1.8 1.8 0 0 1 0-2.66m3.18-3.18A8.82 8.82 0 0 1 12 5c7 0 10 7 10 7a1.8 1.8 0 0 1 0 2.66"/><path d="M10 10l4 4"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <button onClick={() => handleEditCategory(category.categoryId)} className={styles.actionButton}>
                      <img src="/images/write.png" alt="Edit" />
                    </button>
                    <button onClick={() => handleDeleteCategory(category.categoryId)} className={styles.actionButton}>
                      <img src="/images/delete.png" alt="Delete" />
                    </button>
                  </div>
                </td>
                <td>
                  <div className={styles.reorderButtons}>
                    <button onClick={() => handleReorder(category.categoryId, 'up')} className={styles.reorderButton}>▲</button>
                    <button onClick={() => handleReorder(category.categoryId, 'down')} className={styles.reorderButton}>▼</button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                No categories found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={styles.pagination}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`${styles.paginationButton} ${currentPage === page ? styles.active : ''}`}
          >
            {page}
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button onClick={handleSaveAllChanges} className={styles.saveAllButton}>Save All Changes</button>
      </div>
    </div>
  );
}