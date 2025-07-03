// app/admin/payment-tracking/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './payment-tracking.module.css'; 

// AdminModalContext 훅 사용 (알림/확인 모달)
import { useAdminModal } from '@/contexts/AdminModalContext';

const ITEMS_PER_PAGE = 10; // 페이지당 항목 수

export default function PaymentTrackingPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState(''); 
  const [orderStatusFilter, setOrderStatusFilter] = useState('All'); // 결제 상태 필터 (payment-information의 status)
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All'); // 결제 방법 필터 (payment-information의 paymentMethod)
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();
  const { showAdminNotificationModal } = useAdminModal();

  /**
   * API를 통해 주문 데이터를 가져오는 함수.
   * 이 API는 order-management와 payment-information을 조인하여 데이터를 반환해야 합니다.
   * 반환되는 데이터는 orderId, totalAmount, orderDate, customerName, paymentMethod, status 필드를 포함해야 합니다.
   * @param {object} filters - 검색 및 필터링 조건을 포함하는 객체
   * @param {string} [filters.searchTerm] - 검색어 (주문 ID 또는 고객 이름)
   * @param {string} [filters.status] - 결제 상태 필터 (Completed, Failed, Cancelled, Pending 등)
   * @param {string} [filters.paymentMethod] - 결제 방법 필터 (Credit Card, PayPal, Cash 등)
   */
  const fetchOrders = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      let apiUrl = `/api/admin/payment-tracking`;
      const queryParams = new URLSearchParams();

      if (filters.searchTerm) {
        queryParams.append('searchTerm', filters.searchTerm);
      }
      // 'status' 필터는 payment-information의 status 필드를 나타냅니다.
      if (filters.status && filters.status !== 'All') {
        queryParams.append('status', filters.status);
      }
      // 'paymentMethod' 필터는 payment-information의 paymentMethod 필드를 나타냅니다.
      if (filters.paymentMethod && filters.paymentMethod !== 'All') {
        queryParams.append('paymentMethod', filters.paymentMethod);
      }

      if (queryParams.toString()) {
        apiUrl += `?${queryParams.toString()}`;
      }
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // 백엔드에서 조인된 데이터가 올바른 형식으로 온다고 가정합니다.
      // 예시 데이터 구조: { orderId, totalAmount, orderDate, customerName, paymentMethod, status }
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(`주문 목록을 불러오는 데 실패했습니다: ${err.message}`);
      showAdminNotificationModal(`주문 목록을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [showAdminNotificationModal]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /**
   * 필터링 및 정렬된 주문 목록을 계산하는 useMemo.
   * 검색어, 결제 상태 필터, 결제 방법 필터에 따라 목록을 필터링하고,
   * 날짜를 기준으로 최신 주문부터 정렬합니다.
   */
  const filteredOrders = useMemo(() => {
    let items = orders;

    // 검색어 필터링 (orderId 또는 customerName)
    if (searchTerm) {
      items = items.filter(order =>
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 결제 상태 필터링 (payment-information의 status 필드)
    if (orderStatusFilter !== 'All') {
      items = items.filter(order => order.status === orderStatusFilter);
    }

    // 결제 방법 필터링 (payment-information의 paymentMethod 필드)
    if (paymentMethodFilter !== 'All') {
      items = items.filter(order => order.paymentMethod === paymentMethodFilter);
    }

    // 날짜 필드를 기준으로 최신 주문부터 정렬
    // orderDate가 ISO 8601 문자열이라고 가정하고 Date 객체로 변환하여 비교합니다.
    return items.sort((a, b) => {
      const dateA = new Date(a.orderDate);
      const dateB = new Date(b.orderDate);
      return dateB.getTime() - dateA.getTime(); // 최신 날짜가 먼저 오도록 내림차순 정렬
    });
  }, [orders, searchTerm, orderStatusFilter, paymentMethodFilter]);

  // 현재 페이지에 표시될 주문 목록과 총 페이지 수 계산
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const currentOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage]);

  // 검색어 입력 변경 핸들러
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // 검색어 변경 시 페이지 초기화
  };

  // 결제 상태 필터 변경 핸들러
  const handleOrderStatusFilterChange = (e) => {
    setOrderStatusFilter(e.target.value);
    setCurrentPage(1); // 필터 변경 시 페이지 초기화
  };

  // 결제 방법 필터 변경 핸들러
  const handlePaymentMethodFilterChange = (e) => {
    setPaymentMethodFilter(e.target.value);
    setCurrentPage(1); // 필터 변경 시 페이지 초기화
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // 상세보기 버튼 클릭 핸들러
  const handleViewDetails = (orderId) => {
    router.push(`/admin/payment-tracking/${orderId}`); // 해당 주문 상세 페이지로 이동
  };

  if (loading) {
    return <div className={styles.container}>Loading payment tracking data...</div>;
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
            placeholder="Search Orders..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          <button 
            className={styles.searchButton} 
            onClick={() => fetchOrders({
              searchTerm, 
              status: orderStatusFilter, // 'status' 쿼리 파라미터에 orderStatusFilter 값 전달
              paymentMethod: paymentMethodFilter // 'paymentMethod' 쿼리 파라미터에 paymentMethodFilter 값 전달
            })}
          >
            Search
          </button>
        </div>
        <div className={styles.filterGroup}>
          {/* 결제 상태 필터 드롭다운 (payment-information의 status) */}
          <select value={orderStatusFilter} onChange={handleOrderStatusFilterChange} className={styles.filterSelect}>
            <option value="All">All Status</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Pending">Pending</option>
          </select>
          {/* 결제 종류 필터 드롭다운 (payment-information의 paymentMethod) */}
          <select value={paymentMethodFilter} onChange={handlePaymentMethodFilterChange} className={styles.filterSelect}>
            <option value="All">All Methods</option>
            <option value="Credit Card">Credit Card</option>
            <option value="PayPal">PayPal</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </header>
      
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Order ID</th> 
            <th>Amount</th>  
            <th>Date</th>
            <th>Name</th>    
            <th>Pay</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentOrders.length > 0 ? (
            currentOrders.map(order => (
              <tr key={order.orderId}>
                <td>{order.orderId}</td>
                <td>${order.totalAmount?.toFixed(2) || '0.00'}</td> 
                <td>{order.orderDate?.split('T')[0] || 'N/A'}</td>
                <td>{order.customerName || 'N/A'}</td> 
                <td>{order.paymentMethod || 'N/A'}</td>
                <td>
                  <span className={`${styles.status} ${styles[order.status?.toLowerCase()==='completed' ? 'completed' : 'failed']}`}>
                    {order.status || 'N/A'}
                  </span>
                </td>
                <td>
                  <button onClick={() => handleViewDetails(order.orderId)} className={styles.viewButton}>
                    View
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                No orders found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={styles.pagination}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={`page-${page}`}
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
