// app/admin/delivery-status/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './delivery-status.module.css'; // 새로운 CSS 모듈 생성 필요

// AdminModalContext 훅 사용 (알림/확인 모달)
import { useAdminModal } from '@/contexts/AdminModalContext';

const ITEMS_PER_PAGE = 10; // 페이지당 항목 수

export default function DeliveryStatusPage() {
  const [deliveryItems, setDeliveryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState(''); // 검색어 (Name, Ship Name)
  const [statusFilter, setStatusFilter] = useState('All'); // 배송 상태 필터 ('All', 'In Delivery', 'Delivered')
  const [currentPage, setCurrentPage] = useState(1);

  // 모달 관련 상태
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null); // 모달에 표시될 변경될 상태
  const [modalTrackingNumber, setModalTrackingNumber] = useState(''); // 모달 내 운송장 번호

  const router = useRouter();
  const { showAdminNotificationModal } = useAdminModal();

  /**
   * API를 통해 배송 상태 아이템들을 가져오는 함수
   * 백엔드에서 order-management와 delivery-status를 조인하여 데이터를 반환해야 합니다.
   * @param {object} filters - 검색 및 필터링 조건을 포함하는 객체
   * @param {string} [filters.searchTerm] - 검색어 (이름, 선박명 등)
   * @param {string} [filters.status] - 배송 상태 필터 (In Delivery, Delivered)
   */
  const fetchDeliveryItems = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      let apiUrl = `/api/admin/delivery-status`;
      const queryParams = new URLSearchParams();

      if (filters.searchTerm) {
        queryParams.append('searchTerm', filters.searchTerm);
      }
      if (filters.status && filters.status !== 'All') {
        queryParams.append('status', filters.status);
      }

      if (queryParams.toString()) {
        apiUrl += `?${queryParams.toString()}`;
      }
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDeliveryItems(data || []);
    } catch (err) {
      console.error("Error fetching delivery items:", err);
      setError(`배송 상태 목록을 불러오는 데 실패했습니다: ${err.message}`);
      showAdminNotificationModal(`배송 상태 목록을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [showAdminNotificationModal]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchDeliveryItems();
  }, [fetchDeliveryItems]);

  /**
   * 필터링 및 검색된 항목 계산
   * 클라이언트 사이드에서 필터링 및 정렬을 수행합니다.
   */
  const filteredAndSearchedItems = useMemo(() => {
    let items = deliveryItems;

    // 검색어 필터링 (Name, Ship Name)
    if (searchTerm) {
      items = items.filter(item =>  
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.shipName?.toLowerCase().includes(searchTerm.toLowerCase()) 
      );
    }

    // 상태 필터링
    if (statusFilter !== 'All') {
      items = items.filter(item => item.status === statusFilter);
    }

    // 날짜 기준으로 최신 오더 우선 정렬
    return items.sort((a, b) => { 
        if (a.date && b.date) {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB.getTime() - dateA.getTime();
        }
        return 0;
    });
  }, [deliveryItems, searchTerm, statusFilter]);

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

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1); // 필터 변경 시 페이지 초기화
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  /**
   * 배송 상태 변경 버튼 클릭 핸들러 (모달 열기)
   * @param {string} orderId - 주문 ID
   * @param {string} currentStatus - 현재 배송 상태
   * @param {string} trackingNumber - 현재 운송장 번호
   */
  const handleUpdateDeliveryStatus = (orderId, currentStatus, trackingNumber) => {
    const newStatus = currentStatus === 'In Delivery' ? 'Delivered' : 'In Delivery';
    setSelectedOrderId(orderId);
    setSelectedStatus(newStatus);
    setModalTrackingNumber(trackingNumber === '-' ? '' : trackingNumber); // '-'이면 빈 문자열로 초기화
    setShowUpdateModal(true); // 모달 표시
  };

  /**
   * 모달에서 'Save Changes' 버튼 클릭 시 실제 업데이트 수행
   */
  const handleConfirmUpdateDeliveryStatus = async () => {
    if (!selectedOrderId || !selectedStatus) return;

    try {
      // PATCH API 호출
      const response = await fetch(`/api/admin/delivery-status/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({  
          orderId: selectedOrderId,  
          status: selectedStatus,
          trackingNumber: modalTrackingNumber // 운송장 번호도 함께 전송
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `배송 상태 업데이트 실패: ${response.status}`);
      }

      // 성공 시 로컬 상태 업데이트
      setDeliveryItems(prevItems => prevItems.map(item =>  
        item.orderId === selectedOrderId 
          ? { ...item, status: selectedStatus, trackingNumber: modalTrackingNumber || '-' } // 운송장 번호도 업데이트
          : item 
      ));
      
      showAdminNotificationModal(`주문 ${selectedOrderId}의 배송 상태가 '${selectedStatus}'로 변경되었습니다.`);
      setShowUpdateModal(false); // 모달 닫기
      setSelectedOrderId(null); // 상태 초기화
      setSelectedStatus(null);
      setModalTrackingNumber('');

    } catch (err) {
      console.error("Error updating delivery status:", err);
      showAdminNotificationModal(`배송 상태 변경 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  /**
   * 모달 닫기 핸들러
   */
  const handleCloseUpdateModal = () => {
    setShowUpdateModal(false);
    setSelectedOrderId(null);
    setSelectedStatus(null);
    setModalTrackingNumber('');
  };

  if (loading) {
    return <div className={styles.container}>배송 상태를 불러오는 중...</div>;
  }

  if (error) {
    return <div className={`${styles.container} ${styles.errorText}`}>오류: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.searchGroup}>
          <input
            type="text"
            placeholder="Name, Ship Name"
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          <button 
            className={styles.searchButton} 
            onClick={() => fetchDeliveryItems({searchTerm, status: statusFilter})}
          >
            search
          </button>
        </div>
        <div className={styles.filterGroup}>
          <select value={statusFilter} onChange={handleStatusFilterChange} className={styles.filterSelect}>
            <option value="All">All</option>
            <option value="In Delivery">In Delivery</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
      </header>
      
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Order ID</th> 
            <th>Name</th> 
            <th>Date</th>
            <th>Status</th> 
            <th>Tracking #</th> 
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length > 0 ? (
            currentItems.map(item => (
              <tr key={item.orderId}>
                <td>{item.orderId}</td>
                <td>{item.name}</td> 
                <td>{item.date}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[item.status?.replace(/\s/g, '')]}`}>
                    {item.status}
                  </span>
                </td> 
                <td>{item.trackingNumber || '-'}</td> 
                <td>
                  <button 
                    onClick={() => handleUpdateDeliveryStatus(item.orderId, item.status, item.trackingNumber)} 
                    className={`${styles.actionButton} ${item.status === 'Delivered' ? styles.markInDelivery : styles.markDelivered}`}
                  >
                    {item.status === 'Delivered' ? 'Mark as Delivered' : 'Mark as In Delivery'}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                배송 항목을 찾을 수 없습니다.
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
      <div className={styles.note}>
        <p>배송지가 항구일 경우 / EMS 일 경우 상태 확인 필요</p>
      </div>

      {/* 배송 상태 업데이트 모달 */}
      {showUpdateModal && selectedOrderId && selectedStatus && (
        <div className={styles.updateModalBackdrop}>
          <div className={styles.updateModalContent}>
            <button className={styles.updateModalCloseButton} onClick={handleCloseUpdateModal}>&times;</button>
            <h3 className={styles.updateModalTitle}>
              {selectedStatus === 'Delivered' ? 'Mark as Delivered' : 'Mark as In Delivery'}
            </h3>
            <p className={styles.updateModalSubtitle}>
              Update the delivery status for order {selectedOrderId}.
            </p>

            <div className={styles.updateModalField}>
              <label htmlFor="trackingNumber">Tracking Number (Optional)</label>
              <input
                type="text"
                id="trackingNumber"
                value={modalTrackingNumber}
                onChange={(e) => setModalTrackingNumber(e.target.value)}
                className={styles.updateModalInput}
                placeholder="운송장 번호를 입력하세요"
              />
            </div>

            <div className={styles.updateModalActions}>
              <button className={styles.updateModalCancelButton} onClick={handleCloseUpdateModal}>
                Cancel
              </button>
              <button 
                className={styles.updateModalSaveButton} 
                onClick={handleConfirmUpdateDeliveryStatus}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
