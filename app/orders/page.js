// app/orders/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './orders.module.css';
import BottomNav from '../home/components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import PaymentInfoModal from '@/components/PaymentInfoModal';
import moment from 'moment';
import Link from 'next/link'; // Link 컴포넌트 추가
import ProductCard from '@/components/ProductCardOrders'; // ProductCard 컴포넌트 임포트

// 아이콘 컴포넌트
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;

export default function OrdersPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const { showModal } = useModal();

  const [allOrders, setAllOrders] = useState([]); // 모든 주문 데이터
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeStatusTab, setActiveStatusTab] = useState('Order'); // Order, Payment, Delivered
  const [activeSubFilter, setActiveSubFilter] = useState('All'); // Order Request, Order Confirmed, Paypal, Pay in Cash, EMS, Delivered

  const [showPaymentDetailModal, setShowPaymentDetailModal] = useState(false);
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState(null);

  // PaymentInfoModal에 전달할 상태 (더미 값)
  const [receivedBy, setReceivedBy] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [note, setNote] = useState('');

  // 로그인 상태 확인 및 리다이렉트
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/');
    }
  }, [isLoggedIn, router]);

  // 주문 데이터 불러오기
  const fetchOrders = useCallback(async () => {
    if (!isLoggedIn || !user?.email) { // user.email이 없으면 바로 리턴
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 사용자 이메일을 쿼리 파라미터로 추가
      const response = await fetch(`/api/orders?userEmail=${encodeURIComponent(user.email)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // 최근 6개월간의 주문만 필터링
      const sixMonthsAgo = moment().subtract(6, 'months');
      const filteredRecentOrders = data.filter(order =>
        moment(order.date).isAfter(sixMonthsAgo)
      );

      setAllOrders(filteredRecentOrders || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(`주문 내역을 불러오는 데 실패했습니다: ${err.message}`);
      showModal(`주문 내역을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, user?.email, showModal]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 주문 상태별 수량 계산
  const statusCounts = useMemo(() => {
    const counts = {
      Order: 0,
      Payment: 0,
      Delivered: 0,
    };
    allOrders.forEach(order => {
      const status = order.status?.toLowerCase();
      // 'order' 상태는 'Order' 탭에 포함
      if (status === 'order' || status === 'ems') {
        counts.Order++;
      }
      // 'paypal' 또는 'pay in cash' 상태는 'Payment' 탭에 포함
      else if (status === 'paypal' || status === 'pay in cash') {
        counts.Payment++;
      }
      // 'delivered' 상태는 'Delivered' 탭에 포함
      else if (status === 'delivered') {
        counts.Delivered++;
      }
    });
    return counts;
  }, [allOrders]);

  // 활성 탭 및 서브 필터에 따른 주문 목록 필터링
  const displayedOrders = useMemo(() => {
    let filtered = allOrders;

    // 탭 필터링
    filtered = filtered.filter(order => {
      const status = order.status?.toLowerCase();
      if (activeStatusTab === 'Order') {
        // 'Order' 탭에는 'order'와 'ems' 상태의 주문 포함
        return status === 'order' || status === 'ems';
      } else if (activeStatusTab === 'Payment') {
        // 'Payment' 탭에는 'paypal'과 'pay in cash' 상태의 주문 포함
        return status === 'paypal' || status === 'pay in cash';
      } else if (activeStatusTab === 'Delivered') {
        return status === 'delivered';
      }
      return false; // 기본적으로 일치하지 않으면 필터링
    });

    // 서브 필터링
    if (activeSubFilter !== 'All') {
      filtered = filtered.filter(order => {
        const status = order.statusHistory[order.statusHistory.length - 1].newStatus?.toLowerCase();
        const subFilterLower = activeSubFilter.toLowerCase(); // 공백 제거
        return status === subFilterLower;
      });
    }

    return filtered;
  }, [allOrders, activeStatusTab, activeSubFilter]);

  // 서브 필터 옵션 정의
  const subFilterOptions = useMemo(() => {
    if (activeStatusTab === 'Order') {
      // 'Order' 탭에는 'Order(Request)'와 'Order(Confirmed)' 옵션 제공
      return ['All', 'Order(Request)', 'Order(Confirmed)'];
    } else if (activeStatusTab === 'Payment') {
      return ['All', 'Paypal', 'pay in cash'];
    } else if (activeStatusTab === 'Delivered') {
      return ['All', 'Delivered'];
    }
    return ['All'];
  }, [activeStatusTab]);

  const handleStatusTabClick = (tab) => {
    setActiveStatusTab(tab);
    setActiveSubFilter('All'); // 탭 변경 시 서브 필터 초기화
  };

  const handleSubFilterClick = (filter) => {
    setActiveSubFilter(filter);
  };

  const handleMoreClick = async (orderId, type) => {
    if (type === 'Order') {
      // 사용자 주문 상세 페이지로 이동 (예시 경로)
      router.push(`/orders/detail/${orderId}`);
    } else if (type === 'Payment') {
      // 결제 상세 정보 바텀시트 노출
      try {
        const response = await fetch(`/api/admin/payment-tracking/${orderId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch payment details for order ${orderId}`);
        }
        const paymentDetails = await response.json();
        setSelectedPaymentOrder(paymentDetails);
        setShowPaymentDetailModal(true);
        // PaymentInfoModal에 필요한 receivedBy, receivedDate, note 상태를 초기화
        setReceivedBy(paymentDetails.receivedBy || '');
        setReceivedDate(paymentDetails.receivedDate ? moment(paymentDetails.receivedDate).format('YYYY-MM-DD') : '');
        setNote(paymentDetails.note || '');
        
      } catch (err) {
        console.error("Error fetching payment details:", err);
        showModal(`결제 상세 정보를 불러오는 데 실패했습니다: ${err.message}`);
      }
    } else if (type === 'Delivered') {
      // 완료 화면 (임시로 알림 모달 사용)
      showModal(`주문 ${orderId} 배송 완료된 주문입니다.`);
    }
  };

  // ProductCard에서 onAddToCart가 호출될 때 사용될 더미 함수
  const handleDummyAddToCart = (product) => {
    console.log(`Product ${product.name} would be added to cart, but this is the orders page.`);
    showModal("주문 내역에서는 제품을 장바구니에 추가할 수 없습니다.");
  };

  // PaymentInfoModal에서 'Save' 버튼 클릭 시 호출될 함수 (현재는 더미)
  const handlePaymentInfoSave = () => {
    showModal("결제 정보 저장 기능은 현재 미구현입니다.");
    setShowPaymentDetailModal(false);
  };


  if (!isLoggedIn) {
    return null; // 로그인되지 않은 경우 아무것도 렌더링하지 않음 (리다이렉트 처리)
  }

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <img src="/images/loading.gif" alt="Loading..." className={styles.loadingSpinner} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={`${styles.emptyMessage} ${styles.errorText}`}>오류: {error}</div>
      </div>
    );
  }

  // 최근 6개월 내 주문 내역이 없을 경우
  if (allOrders.length === 0) {
    return (
      <div className={styles.pageContainer}>
        <header className={styles.header}>
          <button onClick={() => router.back()} className={styles.iconButton}>
            <BackIcon />
          </button>
          <h1 className={styles.title}>Orders</h1>
          <div style={{ width: '24px' }}></div>
        </header>
        <main className={styles.mainContent}>
          <div className={styles.emptyMessage}>
            <p>No orders found in the past 6 months.</p>
          </div>
        </main>
        <BottomNav activePath="/orders" />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.iconButton}>
          <BackIcon />
        </button>
        <h1 className={styles.title}>My Orders</h1>
        <div style={{ width: '24px' }}></div>
      </header>

      <main className={styles.mainContent}>
        {/* 상단 주문 상태별 수량 표시 */}
        <div className={styles.statusSummary}>
          <div className={`${styles.statusCard} ${activeStatusTab === 'Order' ? styles.active : ''}`} onClick={() => handleStatusTabClick('Order')}>
            <span className={styles.statusLabel}>Order</span>
            <span className={styles.statusCount}>{statusCounts.Order}</span>
          </div>
          <div className={`${styles.statusCard} ${activeStatusTab === 'Payment' ? styles.active : ''}`} onClick={() => handleStatusTabClick('Payment')}>
            <span className={styles.statusLabel}>Payment</span>
            <span className={styles.statusCount}>{statusCounts.Payment}</span>
          </div>
          <div className={`${styles.statusCard} ${activeStatusTab === 'Delivered' ? styles.active : ''}`} onClick={() => handleStatusTabClick('Delivered')}>
            <span className={styles.statusLabel}>Delivered</span>
            <span className={styles.statusCount}>{statusCounts.Delivered}</span>
          </div>
        </div>

        {/* 하단 필터 버튼 */}
        <div className={styles.filterChips}>
          {subFilterOptions.map(filter => (
            <button
              key={filter}
              className={`${styles.filterChip} ${activeSubFilter === filter ? styles.active : ''}`}
              onClick={() => handleSubFilterClick(filter)}
            >
              {filter.replace(/([A-Z])/g, ' $1').trim()} {/* CamelCase를 띄어쓰기로 변환 (예: PayInCash -> Pay In Cash) */}
            </button>
          ))}
        </div>

        {/* 주문 리스트 */}
        <div className={styles.orderList}>
          {displayedOrders.length > 0 ? (
            displayedOrders.map(order => (
              <div key={order.orderId} className={styles.orderItem}>
                <div className={styles.orderHeader}>
                  <span className={styles.orderStatusBadge}>
                    {order.statusHistory && order.statusHistory.length > 0
                      ? order.statusHistory[order.statusHistory.length - 1].newStatus
                      : 'Unknown'}
                  </span>
                  <div className={styles.orderInfoContainer}>
                    <div className={styles.orderInfoLine}>
                        <span className={styles.orderInfoLeft}>{moment(order.date).format('YYYY-MM-DD')} </span>
                        <span className={styles.orderInfoRight}>{order.orderId}</span>
                    </div>
                    <div className={styles.orderInfoLine}>
                      <span className={styles.orderInfoLeft}>Address</span>
                      <span className={styles.orderInfoRight}>{order.deliveryDetails.portName}</span>
                    </div>
                  </div>
                </div>
                {/* 주문 제품 목록을 가로 스크롤 리스트로 표시 */}
                <div className={styles.horizontalProductList}>
                  {order.orderItems && order.orderItems.length > 0 ? (
                    order.orderItems.map(product => (
                      <Link href={`/products/detail/${product.productId}`} key={product.productId} className={styles.productLink}>
                        <div className={styles.productCardWrapper}>
                          {/* ProductCard에 필요한 product 속성 전달 */}
                          <ProductCard product={{
                              id: product.productId,
                              name: product.name + ' x ' + product.quantity, // DynamoDB의 productName 필드 사용
                              price: product.originalUnitPrice * product.quantity || product.unitPrice, // DynamoDB의 originalUnitPrice 필드 사용
                              discount: product.discount || 0, // 할인율 필드가 있다면 사용
                              image: product.mainImage, // DynamoDB의 mainImage 필드 사용
                              slug: product.sku // SKU를 slug로 사용하거나, 별도 slug 필드 사용
                          }} onAddToCart={handleDummyAddToCart} /> {/* 더미 함수 전달 */}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p style={{ color: '#6c757d', fontSize: '0.9rem', paddingLeft: '10px' }}>No products found for this order.</p>
                  )}
                </div>
                {/* 기존 주문 상세 정보 (제품 리스트 하단에 유지) */}
                <div className={styles.orderDetailsBottom}>
                  <p><strong>Total ${order.totalAmount?.toFixed(2) || '0.00'}</strong></p>
                </div>
                <button
                  onClick={() => handleMoreClick(order.orderId, activeStatusTab)}
                  className={styles.moreButton}
                >
                  More
                </button>
              </div>
            ))
          ) : (
            <div className={styles.emptyFilterMessage}>
              <p>No results for selected filter.</p>
            </div>
          )}
        </div>
      </main>

      {/* 결제 상세 정보 모달 */}
      {showPaymentDetailModal && selectedPaymentOrder && (
        <PaymentInfoModal
          orderDetail={selectedPaymentOrder}
          receivedBy={receivedBy}
          setReceivedBy={setReceivedBy}
          receivedDate={receivedDate}
          setReceivedDate={setReceivedDate}
          note={note}
          setNote={setNote}
          onSave={handlePaymentInfoSave} // 더미 저장 함수
          onClose={() => setShowPaymentDetailModal(false)}
        />
      )}

      <BottomNav activePath="/orders" />
    </div>
  );
}