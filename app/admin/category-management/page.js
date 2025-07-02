'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
// Image 컴포넌트 사용을 위해 임포트 (src 직접 사용 시 img 태그로 대체)
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './category-management.module.css';

// AdminModalContext 훅 사용
import { useAdminModal } from '@/contexts/AdminModalContext';

// 모달 컴포넌트 임포트
import CategoryTypeSelectionModal from './modals/CategoryTypeSelectionModal';
import AddMainCategoryModal from './modals/AddMainCategoryModal';
import AddSurve1CategoryModal from './modals/AddSurve1CategoryModal';
import AddSurve2CategoryModal from './modals/AddSurve2CategoryModal';


const ITEMS_PER_PAGE = 5; // 페이지당 항목 수

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Active', 'Inactive'
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('main'); // State for active tab: 'main', 'surve1', 'surve2'
  const [mainCategoryParentId, setMainCategoryParentId] = useState(null); // 선택된 메인 카테고리의 ID 저장
  const [surve1ParentId, setSurve1ParentId] = useState(null); // 선택된 Surve1 카테고리의 ID 저장
  const [surve1ParentName, setSurve1ParentName] = useState(''); // Surve1 카테고리 이름 저장

  // 탭별로 캐시된 데이터를 저장하는 상태 추가
  const [cachedData, setCachedData] = useState({
    main: [],
    surve1: {}, // {parentId: dataArray} 형태로 저장
    surve2: {}, // {parentId: dataArray} 형태로 저장
  });

  // 수정 모드 관련 상태 추가
  const [editingCategory, setEditingCategory] = useState(null); // 수정할 카테고리 객체
  const [editingCategoryType, setEditingCategoryType] = useState(null); // 'main', 'surve1', 'surve2'


  // 모달 제어 상태
  const [showTypeSelectionModal, setShowTypeSelectionModal] = useState(false);
  const [showAddMainModal, setShowAddMainModal] = useState(false);
  const [showAddSurve1Modal, setShowAddSurve1Modal] = useState(false);
  const [showAddSurve2Modal, setShowAddSurve2Modal] = useState(false);


  const router = useRouter();
  const { showAdminNotificationModal, showAdminConfirmationModal } = useAdminModal();

  // API를 통해 카테고리 데이터를 가져오는 함수
  const fetchCategories = useCallback(async (categoryType, parentId = null) => {
    try {
      setLoading(true);
      setError(null);
      
      let apiUrl = `/api/categories?level=${categoryType}`;
      if (parentId) {
        apiUrl += `&parentId=${parentId}`;
      }

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // 캐시 데이터 업데이트
      setCachedData(prevCache => {
        if (categoryType === 'main') {
          return { ...prevCache, main: data };
        } else if (categoryType === 'surve1' && parentId) {
          return { ...prevCache, surve1: { ...prevCache.surve1, [parentId]: data } };
        } else if (categoryType === 'surve2' && parentId) {
          return { ...prevCache, surve2: { ...prevCache.surve2, [parentId]: data } };
        }
        return prevCache;
      });
      
      // 현재 화면에 표시될 카테고리 데이터 업데이트
      setCategories(data || []);

    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(`카테고리 목록을 불러오는 데 실패했습니다: ${err.message}`);
      showAdminNotificationModal(`카테고리 목록을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [showAdminNotificationModal]);

  // activeTab 또는 parentId가 변경될 때 데이터를 가져오는 useEffect
  useEffect(() => {
    setCurrentPage(1); // 탭이 변경될 때마다 페이지 초기화

    if (activeTab === 'main') {
        if (cachedData.main.length === 0) {
            fetchCategories('main');
        } else {
            setCategories(cachedData.main);
            setLoading(false);
        }
    } else if (activeTab === 'surve1' && mainCategoryParentId) {
        if (!cachedData.surve1[mainCategoryParentId]) {
            fetchCategories('surve1', mainCategoryParentId);
        } else {
            setCategories(cachedData.surve1[mainCategoryParentId]);
            setLoading(false);
        }
    } else if (activeTab === 'surve2' && surve1ParentId) {
        if (!cachedData.surve2[surve1ParentId]) {
            fetchCategories('surve2', surve1ParentId);
        } else {
            setCategories(cachedData.surve2[surve1ParentId]);
            setLoading(false);
        }
    }
  }, [activeTab, mainCategoryParentId, surve1ParentId, fetchCategories, cachedData]);
  
  // 모든 메인 카테고리 데이터를 미리 가져옴 (breadcrumbs 및 부모 이름 조회를 위함)
  useEffect(() => {
    if (cachedData.main.length === 0) {
        fetchCategories('main');
    }
  }, [fetchCategories, cachedData.main.length]);


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
      const response = await fetch(`/api/categories/${categoryId}`, { // URL 변경
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update status for category ${categoryId}`);
      }

      // 상태 토글 후 현재 탭의 데이터를 다시 가져와서 업데이트하여 최신 상태 반영
      if (activeTab === 'main') {
          fetchCategories('main');
      } else if (activeTab === 'surve1' && mainCategoryParentId) {
          fetchCategories('surve1', mainCategoryParentId);
      } else if (activeTab === 'surve2' && surve1ParentId) {
          fetchCategories('surve2', surve1ParentId);
      }

    } catch (err) {
      console.error("Error updating category status:", err);
      showAdminNotificationModal(`카테고리 상태 변경 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  const handleEditCategory = (categoryId) => {
    // 현재 activeTab에 맞는 카테고리 데이터를 찾습니다.
    const categoryToEdit = currentCategories.find(c => c.categoryId === categoryId);
    if (!categoryToEdit) {
      showAdminNotificationModal('수정할 카테고리 데이터를 찾을 수 없습니다.');
      return;
    }

    categoryToEdit.mainCategoryId = mainCategoryParentId;
    categoryToEdit.surve1CategoryId = surve1ParentId;

    setEditingCategory(categoryToEdit); // 수정할 카테고리 객체 설정
    console.log('Editing category:', categoryToEdit);
    setEditingCategoryType(activeTab); // 수정할 카테고리의 타입 설정 (main, surve1, surve2)

    // activeTab에 따라 적절한 모달을 띄웁니다.
    if (activeTab === 'main') {
      setShowAddMainModal(true);
    } else if (activeTab === 'surve1') {
      setShowAddSurve1Modal(true);
    } else if (activeTab === 'surve2') {
      setShowAddSurve2Modal(true);
    }
  };

   const handleDeleteCategory = async (categoryId) => {
    // 1. 카테고리 유형 및 연관된 상품 필드 식별
    let productApiQueryParam;
    let categoryNameForMessage = ''; // 메시지에 표시할 카테고리 이름
    
    // 현재 activeTab을 기준으로 어떤 테이블의 카테고리인지 판단
    if (activeTab === 'main') {
        productApiQueryParam = `mainCategoryId=${categoryId}`;
        categoryNameForMessage = currentCategories.find(c => c.categoryId === categoryId)?.name || categoryId;
    } else if (activeTab === 'surve1') {
        productApiQueryParam = `subCategory1Id=${categoryId}`;
        categoryNameForMessage = currentCategories.find(c => c.categoryId === categoryId)?.name || categoryId;
    } else if (activeTab === 'surve2') {
        productApiQueryParam = `subCategory2Id=${categoryId}`;
        categoryNameForMessage = currentCategories.find(c => c.categoryId === categoryId)?.name || categoryId;
    } else {
        showAdminNotificationModal('알 수 없는 카테고리 유형입니다.');
        return;
    }

    setLoading(true);
    setError(null);

    try {
        // 2. 상품 연관성 확인 API 호출
        // 가정: /api/products/check 엔드포인트가 해당 카테고리에 속한 상품 목록을 반환
        const productResponse = await fetch(`/api/products/check?${productApiQueryParam}`);
        
        if (!productResponse.ok) {
            const errorData = await productResponse.json();
            throw new Error(errorData.message || `상품 연관성 확인 실패: ${productResponse.status}`);
        }
        const products = await productResponse.json();

        // 3. 관련 상품이 있는지 확인
        if (products && products.length > 0) {
            showAdminNotificationModal(`'${categoryNameForMessage}' 카테고리는 사용 중인 상품이 있어 삭제할 수 없습니다.`);
            setLoading(false);
            return; // 삭제 진행을 중단
        }

        // 4. 상품 연관성이 없으면 삭제 확인 모달 띄우고 실제 삭제 진행
        showAdminConfirmationModal(
            `정말로 '${categoryNameForMessage}' 카테고리를 삭제하시겠습니까?`,
            async () => {
                try {
                    const response = await fetch(`/api/categories/${categoryId}`, {
                        method: 'DELETE',
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `카테고리 삭제 실패: ${response.status}`);
                    }

                    // 삭제 후 현재 탭의 데이터를 다시 가져와서 업데이트
                    if (activeTab === 'main') {
                        fetchCategories('main');
                    } else if (activeTab === 'surve1' && mainCategoryParentId) {
                        fetchCategories('surve1', mainCategoryParentId);
                    } else if (activeTab === 'surve2' && surve1ParentId) {
                        fetchCategories('surve2', surve1ParentId);
                    }

                    showAdminNotificationModal(`'${categoryNameForMessage}' 카테고리가 삭제되었습니다.`);
                } catch (err) {
                    console.error("Error deleting category:", err);
                    showAdminNotificationModal(`카테고리 삭제 중 오류가 발생했습니다: ${err.message}`);
                } finally {
                    setLoading(false);
                }
            },
            () => {
                console.log('카테고리 삭제 취소됨');
                setLoading(false); // 취소 시 로딩 해제
            }
        );

    } catch (err) {
        console.error("Error checking product association:", err);
        setError(`상품 연관성 확인 중 오류가 발생했습니다: ${err.message}`);
        showAdminNotificationModal(`상품 연관성 확인 중 오류가 발생했습니다: ${err.message}`);
        setLoading(false); // 오류 발생 시 로딩 해제
    }
  };

  // 'Add' 버튼 클릭 시 첫 번째 모달 열기
  const handleAddCategoryClick = () => {
    setShowTypeSelectionModal(true);
  };

  // 첫 번째 모달에서 카테고리 유형 선택 시
  const handleCategoryTypeSelect = (type) => {
    setShowTypeSelectionModal(false); // 유형 선택 모달 닫기
    if (type === 'main') {
      setShowAddMainModal(true);
    } else if (type === 'surve1') {
      setShowAddSurve1Modal(true);
    } else if (type === 'surve2') {
      setShowAddSurve2Modal(true);
    }
  };

  // 카테고리 추가 모달에서 'Add' 버튼 클릭 시
  const handleAddCategory = async (newCategoryData) => {
    console.log('Adding category:', newCategoryData);
    let endpoint = '/api/categories'; // 새 카테고리 생성 API (POST)

    try {
        // 실제 DynamoDB에 새 항목을 추가하는 API (POST) 호출 로직 구현
        const response = await fetch(endpoint, { method: 'POST', body: newCategoryData });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to add category ${newCategoryData.name}`);
        }

        // 추가 성공 후 데이터 새로고침
        if (newCategoryData.type === 'main') {
            fetchCategories('main');
        } else if (newCategoryData.type === 'surve1' && newCategoryData.mainCategoryId) {
            fetchCategories('surve1', newCategoryData.mainCategoryId);
        } else if (newCategoryData.type === 'surve2' && newCategoryData.surve1CategoryId) {
            fetchCategories('surve2', newCategoryData.surve1CategoryId);
        }

    } catch (err) {
        console.error("Error adding category:", err);
        showAdminNotificationModal(`카테고리 추가 중 오류가 발생했습니다: ${err.message}`);
    }
  };

const handleEditCategorySave = async (updatedCategoryData) => {
    console.log('Attempting to update category:', updatedCategoryData);
    // updatedCategoryData에서 categoryId를 분리하고, 나머지 데이터는 업데이트 본문에 사용
    const { categoryId, type, imageFile, ...dataToUpdate } = updatedCategoryData; 
    
    // 이미지 파일이 새롭게 선택된 경우 (현재는 이름/코드/상태/순서만 업데이트)
    // 이미지 변경 로직은 별도로 복잡하게 구현되어야 합니다 (S3 기존 파일 삭제, 새 파일 업로드, URL 업데이트).
    // 여기서는 imageFile이 FormData에 담겨 전달될 수 있지만, JSON.stringify에서는 제외됨.
    // 만약 이미지도 업데이트하려면, imageFile을 Base64로 변환하거나, 별도 API 호출이 필요합니다.

    try {
        const response = await fetch(`/api/categories/${categoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }, // PUT 요청은 FormData가 아닌 JSON 사용
            body: JSON.stringify(dataToUpdate), 
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to update category ${categoryId}.`);
        }

        const responseData = await response.json();
        showAdminNotificationModal(`카테고리 '${responseData.name || categoryId}'이(가) 성공적으로 수정되었습니다.`);
        
        // 수정 후 데이터 새로고침
        if (activeTab === 'main') {
            fetchCategories('main');
        } else if (activeTab === 'surve1' && mainCategoryParentId) {
            fetchCategories('surve1', mainCategoryParentId);
        } else if (activeTab === 'surve2' && surve1ParentId) {
            fetchCategories('surve2', surve1ParentId);
        }

    } catch (err) {
        console.error("Error updating category:", err);
        showAdminNotificationModal(`카테고리 수정 중 오류가 발생했습니다: ${err.message}`);
    } finally {
        // 모달 닫기 및 편집 상태 초기화
        setEditingCategory(null);
        setEditingCategoryType(null);
        setShowAddMainModal(false); 
        setShowAddSurve1Modal(false);
        setShowAddSurve2Modal(false);
    }
  };


// 순서 변경 핸들러
// reorder 동작 시 해당 카테고리(item)의 order 필드를 즉시 PUT 요청으로 업데이트합니다.
const handleReorder = useCallback(async (categoryId, direction) => { 
    // 현재 categories 상태를 복사하고, order 필드를 기준으로 정렬합니다.
    // 이렇게 하면 배열의 인덱스와 order 값의 순서가 일치하게 됩니다.
    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
    
    // 정렬된 배열에서 해당 카테고리의 인덱스를 찾습니다.
    const index = sortedCategories.findIndex(c => c.categoryId === categoryId);

    if (index === -1) {
        console.warn(`Category with ID ${categoryId} not found in current view for reorder.`);
        return;
    }

    let targetIndex = -1;
    if (direction === 'up' && index > 0) {
        targetIndex = index - 1;
    } else if (direction === 'down' && index < sortedCategories.length - 1) {
        targetIndex = index + 1;
    }

    if (targetIndex !== -1) {
        // Step 1: 두 항목의 order 값을 교환
        const tempOrder = sortedCategories[index].order;
        sortedCategories[index].order = sortedCategories[targetIndex].order;
        sortedCategories[targetIndex].order = tempOrder;
        
        // Step 2: 배열 내에서 두 항목의 위치를 교환
        [sortedCategories[index], sortedCategories[targetIndex]] = [sortedCategories[targetIndex], sortedCategories[index]];
    } else {
        showAdminNotificationModal('더 이상 순서를 변경할 수 없습니다.');
        return;
    }

    // 로컬 상태 업데이트 (화면 즉시 반영)
    // sortedCategories는 이미 order 기준으로 정렬되어 있으므로, 이대로 setCategories 해도 됩니다.
    // 하지만, filteredCategories는 useMemo 안에서 다시 정렬되므로 큰 문제는 없습니다.
    setCategories(sortedCategories); 
    
    // 변경된 두 카테고리의 order 값을 서버에 업데이트 (개별 PUT 요청)
    try {
        const categoryToUpdate1 = sortedCategories[index];
        const categoryToUpdate2 = sortedCategories[targetIndex];

        const updatePromises = [
            fetch(`/api/categories/${categoryToUpdate1.categoryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: categoryToUpdate1.order }),
            }),
            fetch(`/api/categories/${categoryToUpdate2.categoryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: categoryToUpdate2.order }),
            }),
        ];
        
        const results = await Promise.allSettled(updatePromises); 
        
        const failedUpdates = results.filter(result => result.status === 'rejected');
        if (failedUpdates.length > 0) {
            console.error("Some order updates failed:", failedUpdates);
            showAdminNotificationModal(`일부 카테고리 순서 업데이트에 실패했습니다. 오류: ${failedUpdates[0].reason?.message || '알 수 없음'}`);
        } else {
            //showAdminNotificationModal('카테고리 순서가 변경되었습니다.'); 
        }

    } catch (err) {
        console.error("Critical error during order update fetch:", err);
        showAdminNotificationModal(`카테고리 순서 변경 중 치명적인 오류가 발생했습니다: ${err.message}`);
    }

}, [categories, showAdminNotificationModal, fetchCategories]);


  // handleSaveAllChanges는 이제 불필요할 수 있습니다.
  // 각 reorder 또는 status toggle마다 즉시 API를 호출하므로.
  // 다만, 여러 항목을 동시에 변경하고 한 번에 저장하는 시나리오라면 유지.
  // 현재 handleReorder에서 개별 업데이트를 수행하므로, Save All Changes는 제거하거나 재정의 필요.
  const handleSaveAllChanges = async () => {
     showAdminNotificationModal('모든 변경 사항은 개별 작업 시 즉시 저장됩니다. 이 버튼은 더 이상 필요하지 않습니다.');
     // 또는 여기에 일괄 저장 로직 (예: 변경된 항목들만 모아서 BatchWriteItem 호출) 구현
  };


  /**
   * Main Category 행 클릭 시 호출되는 핸들러 (-> Surve 1 이동)
   * @param {string} categoryId - 클릭된 메인 카테고리의 ID
   */
  const handleMainCategoryRowClick = (categoryId) => {
    setActiveTab('surve1');
    setMainCategoryParentId(categoryId);
    setSurve1ParentId(null);
    setCurrentPage(1);
  };

  /**
   * Surve Category 1 행 클릭 시 호출되는 핸들러 (-> Surve 2 이동)
   * @param {string} categoryId - 클릭된 Surve 1 카테고리의 ID
   */
  const handleSurve1CategoryRowClick = (categoryId, categoryName) => {
    setActiveTab('surve2');
    setSurve1ParentId(categoryId);
    setSurve1ParentName(categoryName); // Surve 1 카테고리 이름 저장
    setCurrentPage(1);
  };

  /**
   * 탭 클릭 시 호출되는 핸들러
   * @param {string} tab - 클릭된 탭의 이름 ('main', 'surve1', 'surve2')
   * @param {string | null} parentId - 탭 이동 시 필요한 부모 ID (mainCategoryParentId)
   * @param {string | null} subId - 탭 이동 시 필요한 서브 ID (surve1ParentId)
   */
  const handleTabClick = (tab, parentId = null, subId = null) => {
    setActiveTab(tab);
    setMainCategoryParentId(parentId);
    setSurve1ParentId(subId);
    setCurrentPage(1);

    let dataToLoad = [];
    if (tab === 'main') {
      dataToLoad = cachedData.main;
    } else if (tab === 'surve1' && parentId) {
      dataToLoad = cachedData.surve1[parentId] || [];
    } else if (tab === 'surve2' && subId) {
      dataToLoad = cachedData.surve2[subId] || [];
    }
    
    if (dataToLoad.length > 0) {
      setCategories(dataToLoad);
      setLoading(false);
      setError(null);
    } else {
        // 캐시된 데이터가 없는 경우, useEffect가 API를 호출하도록 허용
        setLoading(true); // 로딩 스피너 표시
    }
  };


  /**
   * breadcrumbs 기능을 위한 함수
   */
  const getBreadcrumbs = () => {
    const mainCrumb = { label: 'Main Category', tab: 'main', parentId: null, subId: null };
    let breadcrumbs = [mainCrumb];

    // Main Category breadcrumb 추가
    if (mainCategoryParentId) {
        const mainCat = cachedData.main.find(c => c.categoryId === mainCategoryParentId);
        breadcrumbs.push({ 
            label: mainCat?.name || mainCategoryParentId, 
            tab: 'surve1', 
            parentId: mainCategoryParentId, 
            subId: null 
        });
    }
    
    // Surve1 Category breadcrumb 추가
    if (surve1ParentId) {
        const currentMainCategoryId = mainCategoryParentId || surve1ParentId.split('-sub1-')[0];
        const mainCat = cachedData.main.find(m => m.categoryId === currentMainCategoryId);

        if (breadcrumbs.length === 1 && currentMainCategoryId && mainCat) { // Main category breadcrumb이 없을 경우 추가
            breadcrumbs.push({ label: mainCat.name, tab: 'surve1', parentId: currentMainCategoryId, subId: null });
        }
        
        const surve1Cat = mainCat?.subCategory1s?.find(s1 => s1.subCategoryId === surve1ParentId);

        breadcrumbs.push({ 
            label: surve1Cat?.name || surve1ParentId, 
            tab: 'surve2', 
            parentId: currentMainCategoryId, 
            subId: surve1ParentId 
        });
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Surve Category 1의 이름을 찾는 헬퍼 함수
  const getSurve1CategoryDisplayName = useCallback(() => {
    return surve1ParentName;
  }, [surve1ParentName]);

  if (loading) {
    return <div className={styles.container}>Loading categories...</div>;
  }

  if (error) {
    return <div className={`${styles.container} ${styles.errorText}`}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.searchGroup}>
          <input
            type="text"
            placeholder="Search Products"
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          <button className={styles.searchButton}>Search</button>
        </div>
        <button onClick={handleAddCategoryClick} className={styles.addButton}>+ Add</button> {/* 변경된 핸들러 호출 */}
      </header>
      

      <div className={styles.controls}>
        <div className={styles.tabNav}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'main' ? styles.activeTab : ''}`}
            onClick={() => handleTabClick('main', null, null)}
          >
            Main Category
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'surve1' ? styles.activeTab : ''}`}
            onClick={() => handleTabClick('surve1', mainCategoryParentId, null)}
            disabled={!mainCategoryParentId} // 메인 카테고리가 선택되지 않으면 비활성화
          >
            Surve Category 1
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'surve2' ? styles.activeTab : ''}`}
            onClick={() => handleTabClick('surve2', mainCategoryParentId, surve1ParentId)}
            disabled={!surve1ParentId} // Surve 1 카테고리가 선택되지 않으면 비활성화
          >
            Surve Category 2
          </button>
        </div>
        <div className={styles.filterGroup}>
          <select value={filterStatus} onChange={handleFilterStatusChange} className={styles.filterSelect}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>
      
      <table className={styles.table}><thead>
        <tr>
          {activeTab === 'main' && (<>
              <th>Main Category</th>
              <th>Status</th>
              <th>Actions</th>
              <th>Number</th>
          </>)}
          {activeTab === 'surve1' && (<>
              <th>Main Category</th>
              <th>Surve Category 1</th>
              <th>Status</th>
              <th>Actions</th>
              <th>Number</th>
          </>)}
          {activeTab === 'surve2' && (<>
              <th>Main Category</th>
              <th>Surve Category 1</th>
              <th>Surve Category 2</th>
              <th>Status</th>
              <th>Actions</th>
              <th>Number</th>
          </>)}
        </tr>
      </thead><tbody>
        {currentCategories.length > 0 ? (
          currentCategories.map(category => (
            <tr 
                key={category.categoryId} 
                onClick={() => {
                    if (activeTab === 'main') handleMainCategoryRowClick(category.categoryId);
                    if (activeTab === 'surve1') handleSurve1CategoryRowClick(category.categoryId, category.name);
                }} 
                className={(activeTab === 'main' || activeTab === 'surve1') ? styles.clickableRow : ''}
            >
              {activeTab === 'main' && (<>
                  <td>{category.name}</td>
                  <td>{category.status == 'Active' ? <img src="/images/active.png" alt="Active" onClick={(e) => { e.stopPropagation(); handleStatusToggle(category.categoryId, 'Active'); }} style={{ cursor: 'pointer' }} /> : <img src="/images/inactive.png" alt="Inactive" onClick={(e) => { e.stopPropagation(); handleStatusToggle(category.categoryId, 'Inactive'); }} style={{ cursor: 'pointer' }} />}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button onClick={(e) => { e.stopPropagation(); handleEditCategory(category.categoryId); }} className={styles.actionButton}>
                        <img src="/images/write.png" alt="Edit" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.categoryId); }} className={styles.actionButton}>
                        <img src="/images/delete.png" alt="Delete" />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className={styles.reorderButtons}>
                      <button onClick={(e) => { e.stopPropagation(); handleReorder(category.categoryId, 'up'); }} className={styles.reorderButton}>▲</button>
                      <button onClick={(e) => { e.stopPropagation(); handleReorder(category.categoryId, 'down'); }} className={styles.reorderButton}>▼</button>
                    </div>
                  </td>
              </>)}
              {activeTab === 'surve1' && (<>
                  <td>
                    {/* Display Main Category Name */}
                    {cachedData.main.find(c => c.categoryId === mainCategoryParentId)?.name || 'N/A'}
                  </td>
                  <td>{category.name}</td>
                  <td>{category.status == 'Active' ? <img src="/images/active.png" alt="Active" onClick={(e) => { e.stopPropagation(); handleStatusToggle(category.categoryId, 'Active'); }} style={{ cursor: 'pointer' }} /> : <img src="/images/inactive.png" alt="Inactive" onClick={(e) => { e.stopPropagation(); handleStatusToggle(category.categoryId, 'Inactive'); }} style={{ cursor: 'pointer' }} />}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button onClick={(e) => { e.stopPropagation(); handleEditCategory(category.categoryId); }} className={styles.actionButton}>
                        <img src="/images/write.png" alt="Edit" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.categoryId); }} className={styles.actionButton}>
                        <img src="/images/delete.png" alt="Delete" />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className={styles.reorderButtons}>
                      <button onClick={(e) => { e.stopPropagation(); handleReorder(category.categoryId, 'up'); }} className={styles.reorderButton}>▲</button>
                      <button onClick={(e) => { e.stopPropagation(); handleReorder(category.categoryId, 'down'); }} className={styles.reorderButton}>▼</button>
                    </div>
                  </td>
              </>)}
              {activeTab === 'surve2' && (<>
                  <td>
                     {/* Display Main Category Name */}
                     {cachedData.main.find(c => c.categoryId === mainCategoryParentId)?.name || 'N/A'}
                  </td>
                  <td>
                     {/* Display Surve 1 Category Name - Corrected Logic using getSurve1CategoryDisplayName */}
                     {getSurve1CategoryDisplayName()}
                  </td>
                  <td>{category.name}</td>
                  <td>{category.status == 'Active' ? <img src="/images/active.png" alt="Active" onClick={(e) => { e.stopPropagation(); handleStatusToggle(category.categoryId, 'Active'); }} style={{ cursor: 'pointer' }} /> : <img src="/images/inactive.png" alt="Inactive" onClick={(e) => { e.stopPropagation(); handleStatusToggle(category.categoryId, 'Inactive'); }} style={{ cursor: 'pointer' }} />}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button onClick={(e) => { e.stopPropagation(); handleEditCategory(category.categoryId); }} className={styles.actionButton}>
                        <img src="/images/write.png" alt="Edit" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.categoryId); }} className={styles.actionButton}>
                        <img src="/images/delete.png" alt="Delete" />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className={styles.reorderButtons}>
                      <button onClick={(e) => { e.stopPropagation(); handleReorder(category.categoryId, 'up'); }} className={styles.reorderButton}>▲</button>
                      <button onClick={(e) => { e.stopPropagation(); handleReorder(category.categoryId, 'down'); }} className={styles.reorderButton}>▼</button>
                    </div>
                  </td>
              </>)}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
              No categories found.
            </td>
          </tr>
        )}
      </tbody></table>

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

      <div className={styles.footer}>
        <button onClick={handleSaveAllChanges} className={styles.saveAllButton}>Save</button>
      </div>

      {/* 모달 렌더링 */}
      {showTypeSelectionModal && (
        <CategoryTypeSelectionModal
          onClose={() => setShowTypeSelectionModal(false)}
          onSelectType={handleCategoryTypeSelect}
        />
      )}
      {showAddMainModal && (
        <AddMainCategoryModal
          onClose={() => setShowAddMainModal(false)}
          onAddCategory={handleAddCategory}
          isEditMode={editingCategoryType === 'main'} // Edit 모드임을 알리는 prop
          initialData={editingCategory} // 초기 데이터 전달
          onEditCategory={handleEditCategorySave} // 수정 완료 시 호출될 콜백
        />
      )}
      {showAddSurve1Modal && (
        <AddSurve1CategoryModal
          onClose={() => setShowAddSurve1Modal(false)}
          onAddCategory={handleAddCategory}
          mainCategories={cachedData.main}
          isEditMode={editingCategoryType === 'surve1'}
          initialData={editingCategory}
          onEditCategory={handleEditCategorySave}
        />
      )}
      {showAddSurve2Modal && (
        <AddSurve2CategoryModal
          onClose={() => setShowAddSurve2Modal(false)}
          onAddCategory={handleAddCategory}
          mainCategories={cachedData.main}
          isEditMode={editingCategoryType === 'surve2'}
          initialData={editingCategory}
          onEditCategory={handleEditCategorySave}
        />
      )}
    </div>
  );
}