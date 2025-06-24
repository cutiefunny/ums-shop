// app/admin/order-management/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './order-management.module.css'; // CSS Modules 임포트
import OrderStatusModal from './components/OrderStatusModal'; // 새 모달 컴포넌트 임포트
import { useRouter } from 'next/navigation'; // Next.js router 임포트

// Mock 데이터 (실제로는 API에서 가져올 데이터)
const MOCK_ORDERS = [
  {
    orderId: 'ORD-10001',
    date: '2025.06.12',
    userName: 'John Smith',
    userEmail: 'john@example.com',
    shipName: 'Ocean Explorer',
    total: 324.97,
    status: 'Delivered',
  },
  {
    orderId: 'ORD-10002',
    date: '2025.06.11',
    userName: 'Sarah Johnson',
    userEmail: 'sarah@example.com',
    shipName: 'Sea Voyager',
    total: 512.50,
    status: 'Order',
  },
  {
    orderId: 'ORD-10003',
    date: '2025.06.10',
    userName: 'Michael Brown',
    userEmail: 'michael@example.com',
    shipName: 'Coastal Cruiser',
    total: 120.00,
    status: 'Paypal',
  },
  {
    orderId: 'ORD-10004',
    date: '2025.06.09',
    userName: 'Emily Davis',
    userEmail: 'emily@example.com',
    shipName: 'Wave Rider',
    total: 89.99,
    status: 'PayInCash',
  },
  {
    orderId: 'ORD-10005',
    date: '2025.06.08',
    userName: 'David Wilson',
    userEmail: 'david@example.com',
    shipName: 'Starlight',
    total: 750.00,
    status: 'EMS',
  },
  {
    orderId: 'ORD-10006',
    date: '2025.06.07',
    userName: 'Olivia Martinez',
    userEmail: 'olivia@example.com',
    shipName: 'Golden Sun',
    total: 199.99,
    status: 'Delivered',
  },
  {
    orderId: 'ORD-10007',
    date: '2025.06.06',
    userName: 'James Garcia',
    userEmail: 'james@example.com',
    shipName: 'Blue Ocean',
    total: 45.00,
    status: 'Order',
  },
  {
    orderId: 'ORD-10008',
    date: '2025.06.05',
    userName: 'Sophia Rodriguez',
    userEmail: 'sophia@example.com',
    shipName: 'Sea Breeze',
    total: 999.00,
    status: 'Paypal',
  },
];

const ITEMS_PER_PAGE = 5;
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
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState(null); // { orderId, currentStatus }

  // Next.js router를 임포트합니다.
  const router = useRouter();


  // API를 통해 주문 데이터를 가져오는 함수 (mock data 대신 사용 예정)
  async function fetchOrders() {
    try {
      setLoading(true);
      setError(null);
      // 실제 API 엔드포인트: /api/orders (이 API는 별도로 구현해야 함)
      // const response = await fetch('/api/orders');
      // if (!response.ok) {
      //   throw new Error(`HTTP error! status: ${response.status}`);
      // }
      // const data = await response.json();
      // setOrders(data || []);

      // Mock 데이터 사용
      setOrders(MOCK_ORDERS);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load orders. Please check your network or server configuration.");
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
        order.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.shipName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        filterStatus === 'All' || order.status.toLowerCase() === filterStatus.toLowerCase();
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
    setSelectedOrderForStatus({ orderId: order.orderId, currentStatus: order.status });
    setShowStatusModal(true);
  };

  // 모달에서 상태 선택 시 실제 API를 호출하는 함수
  const handleSelectStatus = async (newStatus) => {
    if (!selectedOrderForStatus) return;

    const orderId = selectedOrderForStatus.orderId;
    console.log(`Order ${orderId} status changed to: ${newStatus}`);
    
    // 실제 API 호출 로직 (예: PUT /api/orders/[orderId])
    try {
      // const response = await fetch(`/api/orders/${orderId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status: newStatus }),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || `Failed to update status for order ${orderId}`);
      // }
      // console.log('Status updated successfully in DB:', newStatus);

      // Mock 데이터 업데이트 (UI 즉시 반영)
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.orderId === orderId ? { ...order, status: newStatus } : order
        )
      );
      alert(`Order ${orderId} status updated to ${newStatus}.`); // 사용자에게 알림
      setShowStatusModal(false); // 모달 닫기
    } catch (err) {
      console.error("Error updating order status:", err);
      setError(`Failed to update status: ${err.message}`);
      alert(`Error updating status: ${err.message}`);
    }
  };


  const handleDetailClick = (orderId) => {
    // router.push를 사용하여 상세 페이지로 이동
    router.push(`/admin/order-management/${orderId}`); // orderId를 동적 경로로 전달
  };

  const handleHistoryClick = (orderId) => {
    alert(`Order ${orderId} 히스토리 확인 (미구현)`);
    // router.push(`/admin/order-management/${orderId}/history`);
  };

  const handleDeleteClick = (orderId) => {
    if (confirm(`Are you sure you want to delete order ${orderId}?`)) {
      console.log(`Deleting order ${orderId}`);
      // 실제 API 호출 로직 (예: DELETE /api/orders/[orderId])
      // setOrders(prevOrders => prevOrders.filter(order => order.orderId !== orderId));
      alert(`Order ${orderId} deleted (미구현).`);
    }
  };

  const getStatusColorClass = (status) => {
    switch (status.toLowerCase()) {
      case 'order': return styles.statusOrder;
      case 'paypal': return styles.statusPaypal;
      case 'payincash': return styles.statusPayInCash;
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
        <h1 className={styles.title}>Order Management</h1>
      </header>

      <div className={styles.controls}>
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
          {currentOrders.length > 0 ? (
            currentOrders.map(order => (
              <tr key={order.orderId}>
                <td>{order.orderId}</td>
                <td>{order.date}</td>
                <td>{order.userName} <br/> {order.userEmail}</td>
                <td>{order.shipName}</td>
                <td>${order.total.toFixed(2)}</td>
                {/* Status 셀을 클릭 가능하게 변경하고 모달을 띄웁니다. */}
                <td onClick={(e) => handleOpenStatusModal(e, order)} style={{ cursor: 'pointer' }}>
                  <span className={`${styles.statusSelect} ${getStatusColorClass(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button onClick={() => handleDetailClick(order.orderId)} className={styles.actionButton}>
                      {/* 상세 보기 아이콘: /images/write.png */}
                      <img src="/images/write.png" alt="Detail" style={{ width: 25, height: 25 }} />
                    </button>
                    <button onClick={() => handleHistoryClick(order.orderId)} className={styles.actionButton}>
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
    </div>
  );
}
