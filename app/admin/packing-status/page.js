'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../common.module.css';

// AdminModalContext 훅 사용 (알림/확인 모달)
import { useAdminModal } from '@/contexts/AdminModalContext';

// PDF 다운로드 라이브러리 (예시: jsPDF 또는 react-to-pdf 등)
// 여기서는 실제 PDF 생성 코드는 제외하고, API 호출만 가정합니다.
// import jsPDF from 'jspdf'; 
// import 'jspdf-autotable'; // 테이블 생성을 위해 필요할 수 있음

const ITEMS_PER_PAGE = 10; // 페이지당 항목 수

export default function PackingStatusPage() {
  const [packingItems, setPackingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState(''); // 검색어 (Products, Ship Name)
  const [selectedShipName, setSelectedShipName] = useState('All'); // 선박명 필터
  const [packingFilter, setPackingFilter] = useState('All'); // 포장상태 필터 ('All', 'Packed', 'Unpacked')
  const [currentPage, setCurrentPage] = useState(1);
  const [shipNames, setShipNames] = useState([]); // 선박명 드롭다운 옵션

  const router = useRouter();
  const { showAdminNotificationModal } = useAdminModal();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const packingStatusDashboard = urlParams.get('packingStatusDashboard');

    if (packingStatusDashboard) {
      setPackingFilter(packingStatusDashboard);
    }
  }, []);

  // API를 통해 포장 상태 아이템들을 가져오는 함수
  const fetchPackingItems = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      let apiUrl = `/api/admin/packing-status`; // 이 API는 모든 관련 상품 데이터를 가져와야 합니다.
      const queryParams = new URLSearchParams();

      // 필터 적용 (서버 사이드에서 필터링하는 것이 효율적)
      if (filters.searchTerm) {
        queryParams.append('searchTerm', filters.searchTerm);
      }
      if (filters.shipName && filters.shipName !== 'All') {
        queryParams.append('shipName', filters.shipName);
      }
      if (filters.packingStatus && filters.packingStatus !== 'All') {
        queryParams.append('packingStatus', filters.packingStatus === 'Packed' ? 'true' : 'false');
      }

      if (queryParams.toString()) {
        apiUrl += `?${queryParams.toString()}`;
      }
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPackingItems(data || []);
    } catch (err) {
      console.error("Error fetching packing items:", err);
      setError(`포장 상태 목록을 불러오는 데 실패했습니다: ${err.message}`);
      showAdminNotificationModal(`포장 상태 목록을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [showAdminNotificationModal]);

  // 선박명 목록을 가져오는 함수
  const fetchShipNames = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/shipnames'); // 선박명 목록 API
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Fetched ship names:", data); // 디버깅용 로그
      setShipNames(['All', ...data]); // 'All' 옵션 추가
    } catch (err) {
      console.error("Error fetching ship names:", err);
      showAdminNotificationModal(`선박명 목록을 불러오는 데 실패했습니다: ${err.message}`);
    }
  }, [showAdminNotificationModal]);

  // 컴포넌트 마운트 시 데이터 및 선박명 목록 로드
  useEffect(() => {
    fetchPackingItems();
    fetchShipNames();
  }, [fetchPackingItems, fetchShipNames]);

  // 필터링된 항목 계산 (클라이언트 필터링)
  const filteredAndSearchedItems = useMemo(() => {
    let items = packingItems;

    // 검색어 필터링 (상품명 또는 선박명)
    if (searchTerm) {
      items = items.filter(item => 
        item.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.shipName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 선박명 필터링
    if (selectedShipName !== 'All') {
      items = items.filter(item => item.shipName === selectedShipName);
    }

    // 포장상태 필터링
    if (packingFilter !== 'All') {
    const isPacked = packingFilter === 'Packed';
    items = items.filter(item => String(item.packing).toLowerCase() === String(isPacked).toLowerCase());
    }

    // 오더 번호 기준으로 정렬 (최신 오더 우선)
    return items.sort((a, b) => {
        // order_id가 문자열인 경우 적절히 비교하거나, 생성일시 필드 사용
        if (a.order_id < b.order_id) return 1;
        if (a.order_id > b.order_id) return -1;
        return 0;
    });
  }, [packingItems, searchTerm, selectedShipName, packingFilter]);

  const totalPages = Math.ceil(filteredAndSearchedItems.length / ITEMS_PER_PAGE);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSearchedItems.slice(startIndex, endIndex);
  }, [filteredAndSearchedItems, currentPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // 검색어 변경 시 페이지 초기화
  };

  const handleShipNameChange = (e) => {
    setSelectedShipName(e.target.value);
    setCurrentPage(1); // 필터 변경 시 페이지 초기화
  };

  const handlePackingFilterChange = (e) => {
    setPackingFilter(e.target.value);
    setCurrentPage(1); // 필터 변경 시 페이지 초기화
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // 포장상태 체크박스 변경 핸들러
  const handlePackingStatusChange = async (orderId, productId, currentPackingStatus) => {
    // packing_status는 boolean이라고 가정 (true: 포장 완료, false: 포장 미완료)
    const newPackingStatus = currentPackingStatus === "true" ? false : true; // 현재 상태 반전
    console.log(`Order ${orderId}, Product ${productId} packing status changed to: ${newPackingStatus}`);

    try {
      // PATCH API 호출
      // 백엔드 API는 orderId와 productId (또는 order_item_id)를 받아 포장 상태를 업데이트하고 히스토리를 기록해야 합니다.
      // API 예시: PATCH /api/admin/packing-status/update
      const response = await fetch(`/api/admin/packing-status/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          productId, 
          packingStatus: newPackingStatus 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `포장 상태 업데이트 실패: ${response.status}`);
      }

      // 성공 시 로컬 상태 업데이트
      setPackingItems(prevItems => prevItems.map(item => 
        item.order_id === orderId && item.product_id === productId // item_id 또는 product_id로 정확히 식별
          ? { ...item, packing: newPackingStatus }
          : item
      ));
      
      showAdminNotificationModal(`주문 ${orderId} - 상품 ${productId}의 포장 상태가 ${newPackingStatus ? '완료' : '미완료'}로 변경되었습니다.`);

    } catch (err) {
      console.error("Error updating packing status:", err);
      showAdminNotificationModal(`포장 상태 변경 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  // 상세보기 버튼 클릭 핸들러
  const handleDetailView = (orderId) => {
    router.push(`/admin/order-management/${orderId}`); // 해당 오더 상세 페이지로 이동
  };

  // PDF 다운로드 핸들러
  const handleDownloadPdf = async () => {
    showAdminNotificationModal('PDF 파일 다운로드 중입니다...');
    try {
      // PDF 생성을 위한 백엔드 API 호출
      // 필터링된 데이터를 기준으로 PDF를 생성하도록 쿼리 파라미터를 넘길 수 있습니다.
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('searchTerm', searchTerm);
      if (selectedShipName !== 'All') queryParams.append('shipName', selectedShipName);
      if (packingFilter !== 'All') queryParams.append('packingStatus', packingFilter === 'Packed' ? 'true' : 'false');

      const response = await fetch(`/api/admin/packing-pdf?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`PDF 다운로드 실패: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `packing_status_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url); // URL 객체 해제

      showAdminNotificationModal('PDF 파일이 성공적으로 다운로드되었습니다.');

    } catch (err) {
      console.error("Error downloading PDF:", err);
      showAdminNotificationModal(`PDF 다운로드 중 오류가 발생했습니다: ${err.message}`);
    }
  };


  if (loading) {
    return <div className={styles.container}>Loading packing status...</div>;
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
            placeholder="Search Products, Ship Name"
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          <button className={styles.searchButton} onClick={() => fetchPackingItems({searchTerm, selectedShipName, packingFilter})}>Search</button>
        </div>
        <div className={styles.filterGroup}>
            <button className={styles.downloadButton} onClick={handleDownloadPdf}>Download</button>
            <select value={selectedShipName} onChange={handleShipNameChange} className={styles.filterSelect}>
                {shipNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                ))}
            </select>
            <select value={packingFilter} onChange={handlePackingFilterChange} className={styles.filterSelect}>
                <option value="All">All</option>
                <option value="Packed">Packing</option>
                <option value="Unpacked">unPacking</option>
            </select>
        </div>
      </header>
      
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Ship Name</th>
            <th>Product</th>
            <th>Stock</th>
            <th>Packing</th>
            <th>Detail view</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length > 0 ? (
            currentItems.map(item => (
              <tr key={item.order_id + item.product_id}>
                <td>{item.order_id}</td>
                <td>{item.shipName}</td>
                <td>{item.product}</td>
                <td>{item.stock}</td>
                <td>
                  <input
                        type="checkbox"
                        checked={item.packing === true || item.packing === 'true'} 
                        onChange={() => handlePackingStatusChange(item.order_id, item.product_id, item.packing)}
                        className={styles.checkbox}
                    />
                </td>
                <td>
                  <button onClick={() => handleDetailView(item.order_id)} className={styles.detailButton}>
                    View
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                No packing items found.
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
    </div>
  );
}