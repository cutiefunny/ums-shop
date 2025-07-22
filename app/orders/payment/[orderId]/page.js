// app/orders/payment/[orderId]/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './payment.module.css'; // 새로운 CSS 파일 임포트
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import PaymentMethodSelectionModal from '@/components/PaymentMethodSelectionModal'; // PaymentMethodSelectionModal 임포트

// 아이콘 컴포넌트 (order-detail 페이지에서 재사용)
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const ChevronDown = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M7 10L12 15L17 10" stroke="#495057" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;

export default function PaymentPage() {
    const router = useRouter();
    const { user, isLoggedIn } = useAuth();
    const { showModal } = useModal();
    const params = useParams();
    const { orderId } = params;

    const [orderDetail, setOrderDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null); // 'paypal' or 'cash'
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // 주문 상세 정보 불러오기
    const fetchOrderDetail = useCallback(async () => {
        if (!orderId) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/orders/${orderId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setOrderDetail(data);
        } catch (err) {
            console.error("결제 주문 상세 정보를 불러오는 중 오류:", err);
            setError(`주문 상세 정보를 불러오는 데 실패했습니다: ${err.message}`);
            showModal(`주문 상세 정보를 불러오는 데 실패했습니다: ${err.message}`);
            // 필요한 경우 로그인 페이지로 리다이렉트
        } finally {
            setLoading(false);
        }
    }, [orderId, showModal]);

    useEffect(() => {
        if (!isLoggedIn) {
            router.replace('/login'); // 인증되지 않은 경우 로그인 페이지로 리다이렉트
            return;
        }
        fetchOrderDetail();
    }, [fetchOrderDetail, isLoggedIn, router]);

    // 결제 처리 함수
    const handlePayment = async () => {
        if (!selectedPaymentMethod) {
            showModal("결제 수단을 선택해주세요.");
            return;
        }

        setLoading(true);
        try {
            // 결제 처리 시뮬레이션
            const paymentSuccess = await new Promise(resolve => setTimeout(() => {
                // 데모를 위해 무작위로 성공/실패 시뮬레이션 (PayPal은 90% 성공, 현금은 항상 성공)
                if (selectedPaymentMethod === 'paypal') {
                    resolve(Math.random() > 0.1);
                } else {
                    resolve(true);
                }
            }, 1500)); // 1.5초 지연 시뮬레이션

            if (paymentSuccess) {
                // DynamoDB의 주문 상태를 'Payment Confirmed' 또는 'Paid'로 업데이트
                const updateResponse = await fetch(`/api/orders/${orderId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'Payment Confirmed', // 상태 흐름에 따라 'Paid' 등으로 변경 가능
                        paymentMethod: selectedPaymentMethod,
                        // 기타 결제 관련 정보 추가
                    }),
                });

                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json();
                    throw new Error(errorData.message || '결제 후 주문 상태 업데이트 실패.');
                }

                showModal("결제가 성공적으로 완료되었습니다! 주문 목록 페이지로 이동합니다.", () => {
                    router.push('/orders'); // 주문 목록 페이지로 이동
                });
            } else {
                // 결제 실패
                showModal(
                    "결제에 실패했습니다. 결제 처리 중 문제가 발생했습니다.",
                    () => { /* '다시 시도' 버튼 클릭 시 현재 페이지에 머무름 */ },
                    true, // isConfirmation 파라미터를 사용하여 두 버튼 표시
                    "다시 시도",
                    () => { router.push('/orders'); }, // '내 주문으로 이동' 버튼 클릭 시
                    "내 주문으로 이동"
                );
            }
        } catch (err) {
            console.error("결제 오류:", err);
            showModal(`결제 처리 중 오류가 발생했습니다: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

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
                <header className={styles.header}>
                    <button onClick={() => router.back()} className={styles.iconButton}>
                        <BackIcon />
                    </button>
                    <h1 className={styles.title}>Final Payment</h1>
                    <div style={{ width: '24px' }}></div>
                </header>
                <main className={styles.mainContent}>
                    <div className={`${styles.emptyMessage} ${styles.errorText}`}>오류: {error}</div>
                </main>
            </div>
        );
    }

    if (!orderDetail) {
        return (
            <div className={styles.pageContainer}>
                <header className={styles.header}>
                    <button onClick={() => router.back()} className={styles.iconButton}>
                        <BackIcon />
                    </button>
                    <h1 className={styles.title}>Final Payment</h1>
                    <div style={{ width: '24px' }}></div>
                </header>
                <main className={styles.mainContent}>
                    <div className={styles.emptyMessage}>주문 정보를 찾을 수 없거나 접근할 수 없습니다.</div>
                </main>
            </div>
        );
    }

    // 주문 요약 계산 (orderDetail이 로드된 후에만 실행)
    const productPriceTotal = orderDetail.orderItems.reduce((sum, item) => sum + item.discountedUnitPrice * item.quantity, 0);
    const shippingFee = orderDetail.shippingFee || 20; // 실제 배송비가 없으면 기본값 20 사용
    const finalTotalPrice = productPriceTotal + shippingFee + (orderDetail.tax || 0);

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.iconButton}>
                    <BackIcon />
                </button>
                <h1 className={styles.title}>Final Payment</h1>
                <div style={{ width: '24px' }}></div>
            </header>

            <main className={styles.mainContent}>
                {/* Order Summary Section */}
                <section className={styles.section}>
                    <h2>Order Summary</h2>
                    <div className={styles.summaryRow}>
                        <span>Product Price</span>
                        <span>${productPriceTotal.toFixed(2)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>Shipping Fee</span>
                        <span>${shippingFee.toFixed(2)}</span>
                    </div>
                    {orderDetail.tax > 0 && (
                        <div className={styles.summaryRow}>
                            <span>Tax</span>
                            <span>${orderDetail.tax.toFixed(2)}</span>
                        </div>
                    )}
                    <div className={styles.totalSummaryDivider}></div>
                    <div className={`${styles.summaryRow} ${styles.finalTotalRow}`}>
                        <span>Total Price</span>
                        <span className={styles.highlightPrice}>${finalTotalPrice.toFixed(2)}</span>
                    </div>
                </section>

                {/* Delivery Details Section (Readonly) */}
                <section className={styles.section}>
                    <h2>Delivery Details</h2>
                    <div className={styles.detailText}>
                        <strong>Option:</strong> {orderDetail.deliveryDetails.option === 'onboard' ? 'Onboard Delivery' : 'Alternative Pickup Location'}
                    </div>
                    {orderDetail.deliveryDetails.option === 'onboard' ? (
                        <>
                            <div className={styles.detailText}>
                                <strong>Port Name:</strong> {orderDetail.deliveryDetails.portName}
                            </div>
                            <div className={styles.detailText}>
                                <strong>Expected Shipping Date:</strong> {orderDetail.deliveryDetails.expectedShippingDate}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.detailText}>
                                <strong>Address:</strong> {orderDetail.deliveryDetails.address}
                            </div>
                            <div className={styles.detailText}>
                                <strong>Postal Code:</strong> {orderDetail.deliveryDetails.postalCode}
                            </div>
                        </>
                    )}
                    {/* 요청사항 필드는 orderDetail에 userMessage로 존재할 수 있습니다. */}
                    {orderDetail.messages && orderDetail.messages.some(msg => msg.sender === 'User' && msg.text) && (
                         <div className={styles.detailText}>
                             <strong>User Message:</strong> {orderDetail.messages.filter(msg => msg.sender === 'User' && msg.text).map(msg => msg.text).join('; ')}
                         </div>
                    )}
                </section>

                {/* Payment Method Section */}
                <section className={styles.section}>
                    <h2>Payment Method</h2>
                    <div className={styles.paymentMethodSelect} onClick={() => setIsPaymentModalOpen(true)}>
                        {selectedPaymentMethod ? (
                            <span className={styles.selectedMethodText}>
                                {selectedPaymentMethod === 'paypal' ? 'PayPal' : 'Pay in Cash'}
                            </span>
                        ) : (
                            <span className={styles.placeholderText}>Select Payment Method</span>
                        )}
                        <ChevronDown />
                    </div>
                </section>
            </main>

            {/* Fixed Footer for Pay button */}
            <footer className={styles.fixedFooter}>
                <button
                    onClick={handlePayment}
                    className={styles.submitButton}
                    disabled={!selectedPaymentMethod || loading}
                >
                    Pay ${finalTotalPrice.toFixed(2)}
                </button>
            </footer>

            <PaymentMethodSelectionModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSelect={(method) => {
                    setSelectedPaymentMethod(method);
                    setIsPaymentModalOpen(false);
                }}
                selectedMethod={selectedPaymentMethod}
            />
        </div>
    );
}