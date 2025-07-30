// app/admin/order-management/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from '../common.module.css'; // CSS Modules 임포트
import OrderStatusModal from './components/OrderStatusModal'; // 새 모달 컴포넌트 임포트
import StatusHistoryModal from './components/StatusHistoryModal'; // 히스토리 모달 컴포넌트 임포트
import { useRouter } from 'next/navigation'; // Next.js router 임포트

// DynamoDB 관련 import (클라이언트 컴포넌트에서 직접 접근)
// WARN: 클라이언트 컴포넌트에서 AWS 자격 증명을 직접 사용하는 것은 보안상 위험합니다.
// 프로덕션 환경에서는 반드시 Next.js API Routes를 통해 서버 사이드에서 통신하도록 리팩토링하세요.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { useAdminModal } from '@/contexts/AdminModalContext';

// DynamoDB 클라이언트 초기화
const client = new DynamoDBClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION, // .env.local 또는 .env.production에 설정
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// DynamoDB 테이블 이름 (환경 변수에서 가져옴)
const ORDER_MANAGEMENT_TABLE_NAME = process.env.NEXT_PUBLIC_DYNAMODB_TABLE_ORDERS || 'order-management';


const ITEMS_PER_PAGE = 10;
const ORDER_STATUS_OPTIONS = ['All', 'Order', 'Paypal', 'PayInCash', 'EMS', 'Delivered'];

export default function OrderManagementPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // 주문 상태 모달 관련 상태
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState(null); // { orderId, currentStatus, statusHistory }

  // 주문 히스토리 모달 관련 상태
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryData, setSelectedHistoryData] = useState(null); // { orderId, historyArray }

  // Next.js router를 임포트합니다.
  const router = useRouter();

  // AdminModalContext 훅 사용
  const { showAdminNotificationModal, showAdminConfirmationModal } = useAdminModal();


  // API를 통해 주문 데이터를 가져오는 함수 (Next.js API Route를 호출하도록 수정)
  async function fetchOrders() {
    try {
      setLoading(true);
      setError(null);
      
      // Next.js API Route를 호출합니다. 이 API Route는 서버에서 DynamoDB와 통신합니다.
      const response = await fetch('/api/orders'); // GET /api/orders 호출
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // createdAt 필드를 기준으로 내림차순 정렬
      const sortedData = (data || []).sort((a, b) => {
        // createdAt이 없는 경우를 대비하여 기본값을 제공하거나, 적절히 처리
        const dateA = new Date(a.createdAt || 0); // createdAt이 없으면 UNIX Epoch로 간주
        const dateB = new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime(); // 내림차순 정렬 (최신 날짜가 위로)
      });
      setOrders(sortedData);
      
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(`Failed to load orders: ${err.message}`);
      showAdminNotificationModal(`주문 목록을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // 컴포넌트 마운트 시 주문 데이터를 가져옵니다.
  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      const matchesSearch =
        order.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.shipName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        filterStatus === 'All' || order.status?.toLowerCase() === filterStatus.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [orders, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const currentOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Status 셀 클릭 시 모달을 여는 함수
  const handleOpenStatusModal = (event, order) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setModalPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    });
    // 현재 주문의 statusHistory도 함께 전달
    setSelectedOrderForStatus({ orderId: order.orderId, currentStatus: order.status, statusHistory: order.statusHistory || [] }); 
    setShowStatusModal(true);
  };

  // 모달에서 상태 선택 시 실제 API를 호출하는 함수 (Next.js API Route를 호출하도록 수정)
  const handleSelectStatus = async (newStatus) => {
    if (!selectedOrderForStatus) return;

    const { orderId, currentStatus, statusHistory } = selectedOrderForStatus;
    console.log(`Order ${orderId} status changed from ${currentStatus} to: ${newStatus}`);
    
    // 새 상태 히스토리 항목 생성
    const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        oldStatus: currentStatus,
        newStatus: newStatus,
        changedBy: 'Admin', // 또는 로그인한 관리자 정보
    };
    const updatedStatusHistory = [...statusHistory, newHistoryEntry]; // 기존 히스토리에 새 항목 추가

    try {
      // Next.js API Route를 호출합니다. 이 API Route는 서버에서 DynamoDB와 통신합니다.
      const response = await fetch(`/api/orders/${orderId}`, { // PUT /api/orders/[orderId] 호출
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // 'status' 필드와 'statusHistory' 필드를 모두 업데이트 요청
        body: JSON.stringify({ status: newStatus, statusHistory: updatedStatusHistory }), 
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update status for order ${orderId}`);
      }

      console.log('Status and history updated successfully in DB:', newStatus);

      // UI 업데이트 (API 호출 후 데이터 재요청)
      fetchOrders(); // 전체 목록을 다시 불러와서 최신 상태 반영
      showAdminNotificationModal(`주문 ${orderId}의 상태가 ${newStatus}로 업데이트되었습니다.`);
      setShowStatusModal(false); 

    } catch (err) {
      console.error("Error updating order status:", err);
      setError(`Failed to update status: ${err.message}`);
      showAdminNotificationModal(`상태 업데이트 중 오류가 발생했습니다: ${err.message}`);
    }
  };


  const handleDetailClick = (orderId) => {
    // router.push를 사용하여 상세 페이지로 이동
    router.push(`/admin/order-management/${orderId}`); // orderId를 동적 경로로 전달
  };

  const handleHistoryClick = (orderId, historyData) => { // historyData 파라미터 추가
    setSelectedHistoryData(historyData);
    setShowHistoryModal(true);
    // showAdminNotificationModal(`Order ${orderId} 히스토리 확인 기능은 미구현입니다.`); // 기존 alert 대신 모달 사용
    // router.push(`/admin/order-management/${orderId}/history`); // 히스토리 상세 페이지로 이동
  };

  const handleDeleteClick = async (orderId) => { // 비동기 함수로 변경
    showAdminConfirmationModal(
      `정말로 주문 ${orderId}를 삭제하시겠습니까?`,
      async () => { // onConfirm 콜백
        console.log(`Deleting order ${orderId}`);
        try {
          // Next.js API Route를 호출하여 서버에서 DynamoDB와 통신합니다.
          const response = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE', // DELETE /api/orders/[orderId] 호출
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to delete order ${orderId}`);
          }

          console.log(`Order ${orderId} deleted successfully.`);
          fetchOrders(); // 삭제 후 목록 다시 불러오기
          showAdminNotificationModal(`주문 ${orderId}이(가) 삭제되었습니다.`);
        } catch (err) {
          console.error("Error deleting order:", err);
          setError(`Failed to delete order: ${err.message}`);
          showAdminNotificationModal(`주문 삭제 중 오류가 발생했습니다: ${err.message}`);
        }
      },
      () => { // onCancel 콜백 (취소 시 아무것도 안 함)
        console.log('주문 삭제 취소됨');
      }
    );
  };

  const getStatusColorClass = (status) => {
    switch (status?.toLowerCase()) { // status가 undefined일 경우를 대비하여 ?. 추가
      case 'order': return styles.statusOrder;
      case 'paypal': return styles.statusPaypal;
      case 'pay in cash': return styles.statusPayInCash;
      case 'ems': return styles.statusEms;
      case 'delivered': return styles.statusDelivered;
      default: return '';
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading orders...</div>;
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
            placeholder="Name, Ship Name"
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          <button className={styles.searchButton}>Search</button>
        </div>
      <div className={styles.filterGroup}>
        <select
          value={filterStatus}
          onChange={handleFilterChange}
          className={styles.filterSelect}
        >
          {ORDER_STATUS_OPTIONS.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      </header>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Name + Email</th>
            <th>Ship Name</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {/* currentOrders가 null일 때 렌더링 방지 */}
          {currentOrders && currentOrders.length > 0 ? (
            currentOrders.map(order => (
              <tr key={order.orderId}>
                <td>{order.orderId}</td>
                <td>{order.date}</td>
                <td>{order.userName} <br/> {order.userEmail}</td>
                <td>{order.shipName}</td>
                <td>${order.totalAmount?.toFixed(2)}</td>
                {/* Status 셀을 클릭 가능하게 변경하고 모달을 띄웁니다. */}
                <td onClick={(e) => handleOpenStatusModal(e, order)} style={{ cursor: 'pointer' }}>
                  <span className={`${styles.statusSelect} ${getStatusColorClass(order.status)}`}>
                    {order.status.replace(/ /g, '')} {/* 공백 제거 */}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button onClick={() => handleDetailClick(order.orderId)} className={styles.actionButton}>
                      {/* 상세 보기 아이콘: /images/write.png */}
                      <img src="/images/write.png" alt="Detail" style={{ width: 25, height: 25 }} />
                    </button>
                    <button onClick={() => handleHistoryClick(order.orderId, order.statusHistory)} className={styles.actionButton}> {/* statusHistory 전달 */}
                      {/* 히스토리 확인 아이콘: /images/history.png */}
                      <img src="/images/history.png" alt="History" style={{ width: 25, height: 25 }} />
                    </button>
                    <button onClick={() => handleDeleteClick(order.orderId)} className={styles.actionButton}>
                      {/* 삭제 아이콘: /images/delete.png */}
                      <img src="/images/delete.png" alt="Delete" style={{ width: 25, height: 25 }} />
                    </button>
                  </div>
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
            key={page}
            onClick={() => handlePageChange(page)}
            className={`${styles.paginationButton} ${currentPage === page ? styles.active : ''}`}
          >
            {page}
          </button>
        ))}
      </div>

      {showStatusModal && selectedOrderForStatus && (
        <OrderStatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          onSelectStatus={handleSelectStatus}
          currentStatus={selectedOrderForStatus.currentStatus}
          position={modalPosition}
        />
      )}

      {showHistoryModal && selectedHistoryData && (
        <StatusHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          historyData={selectedHistoryData}
        />
      )}
    </div>
  );
}
