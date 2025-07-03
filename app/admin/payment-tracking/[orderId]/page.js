// app/admin/payment-tracking/[orderId]/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './payment-detail.module.css'; // 새로 생성할 CSS 모듈

// AdminModalContext 훅 사용
import { useAdminModal } from '@/contexts/AdminModalContext';

import PaymentInfoModal from '@/components/PaymentInfoModal'; 

export default function PaymentDetailPage() {
  const params = useParams();
  const orderId = params.orderId; // URL 파라미터에서 orderId 가져오기

  const [orderDetail, setOrderDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false); // 결제 정보 모달 표시 여부

    const [receivedBy, setReceivedBy] = useState(''); // 'Received By' 입력 필드 값
    const [receivedDate, setReceivedDate] = useState(''); // 'Received Date' 입력 필드 값
    const [note, setNote] = useState(''); // 'Note' 입력 필드 값
    
    const handleSavePaymentInfo = () => {
        // TODO: 결제 정보 업데이트 로직 구현 (필요하다면)
        showAdminNotificationModal('저장 기능은 미구현입니다.');
    };

  const router = useRouter();
  const { showAdminNotificationModal } = useAdminModal();

  const fetchOrderDetail = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setError('Order ID is missing.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 백엔드 API 호출: /api/admin/payment-tracking/[orderId]
      const response = await fetch(`/api/admin/payment-tracking/${orderId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setOrderDetail(data);
    } catch (err) {
      console.error("Error fetching order details:", err);
      setError(`주문 상세 정보를 불러오는 데 실패했습니다: ${err.message}`);
      showAdminNotificationModal(`주문 상세 정보를 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [orderId, showAdminNotificationModal]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleGoBack = () => {
    router.back(); // 이전 페이지로 돌아가기
  };

  const handleSave = () => {
    // TODO: 결제 정보 업데이트 로직 구현 (필요하다면)
    showAdminNotificationModal('저장 기능은 미구현입니다.');
  };

  if (loading) {
    return <div className={styles.container}>Loading order details...</div>;
  }

  if (error) {
    return <div className={`${styles.container} ${styles.errorText}`}>Error: {error}</div>;
  }

  if (!orderDetail) {
    return <div className={styles.container}>No order details found for ID: {orderId}</div>;
  }

  // 이미지에 있는 "Placed on 2025. 5. 10. at 오후 7:30:00" 형식으로 날짜 포맷
  const formatPlacedDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const formattedHours = hours % 12 || 12; // 0시를 12시로 표시

    return `Placed on ${year}. ${month}. ${day}. at ${ampm} ${formattedHours}:${minutes.toString().padStart(2, '0')}:00`;
  };

    const showPaymentInfoModal = () => {
        setShowPaymentModal(true);
    };

    const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={handleGoBack}>&times;</button>
        
        {/* Placed on Date */}
        <div className={styles.placedOnDate}>
          {formatPlacedDate(orderDetail.orderDate)}
        </div>

        {/* Customer Information & Payment Information */}
        <div className={styles.infoSectionContainer}>
          <div className={styles.infoSection}>
            <h3 className={styles.sectionTitle}>Customer Information</h3>
            <p><strong>Name:</strong> {orderDetail.customerName || 'N/A'}</p>
            <p><strong>Email:</strong> {orderDetail.userEmail || 'N/A'}</p>
            <p><strong>Phone:</strong> {orderDetail.customerPhone || 'N/A'}</p>
          </div>

          <div className={styles.infoSection} onClick ={() => showPaymentInfoModal()}>
            <h3 className={styles.sectionTitle}>Payment Information</h3>
            <p><strong>Payment Method:</strong> {orderDetail.paymentMethod || 'N/A'}</p>
            <p><strong>Transaction ID:</strong> {orderDetail.transactionId || 'N/A'}</p>
            <p><strong>Total:</strong> ${orderDetail.paymentTotalAmount?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        {/* Order Items */}
        <div className={styles.orderItemsSection}>
          <h3 className={styles.sectionTitle}>Order Items</h3>
          <table className={styles.orderItemsTable}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orderDetail.orderItems && orderDetail.orderItems.length > 0 ? (
                orderDetail.orderItems.map((item, index) => (
                  <tr key={item.productId || index}>
                    <td>
                      {item.name || 'N/A'}<br/>
                      <span className={styles.sku}>SKU: {item.sku || 'N/A'}</span>
                    </td>
                    <td>{item.quantity || 0}</td>
                    <td>${item.unitPrice?.toFixed(2) || '0.00'}</td>
                    <td>${(item.quantity * item.unitPrice)?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center' }}>No items in this order.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className={styles.totalsSection}>
          <p><strong>Subtotal:</strong> ${orderDetail.subtotal?.toFixed(2) || '0.00'}</p>
          <p><strong>Shipping:</strong> ${orderDetail.shippingFee?.toFixed(2) || '0.00'}</p>
          <p><strong>Tax:</strong> ${orderDetail.tax?.toFixed(2) || '0.00'}</p>
          <p className={styles.grandTotal}><strong>Total:</strong> ${orderDetail.total?.toFixed(2) || '0.00'}</p>
        </div>

        {showPaymentModal && (
            <PaymentInfoModal
            orderDetail={orderDetail}
            receivedBy={receivedBy}
            setReceivedBy={setReceivedBy}
            receivedDate={receivedDate}
            setReceivedDate={setReceivedDate}
            note={note}
            setNote={setNote}
            onSave={handleSavePaymentInfo}
            onClose={handleClosePaymentModal}
            />
        )}

        <button className={styles.saveButton} onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}