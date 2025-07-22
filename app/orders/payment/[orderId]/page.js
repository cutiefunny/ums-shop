// app/orders/payment/[orderId]/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
// import Image from 'next/image'; // Image 컴포넌트 대신 <img> 태그를 사용하므로 더 이상 필요 없음
import styles from './payment.module.css'; // 새로운 CSS 파일 임포트

// 엑셀 다운로드 라이브러리 임포트 (xlsx 대신 exceljs 사용)
import ExcelJS from 'exceljs'; // exceljs 임포트
import { saveAs } from 'file-saver'; // file-saver는 계속 사용
import moment from 'moment'; // 날짜 형식을 위해 moment 사용

// DynamoDB 관련 import (클라이언트 컴포넌트에서 직접 접근)
// WARN: 클라이언트 컴포넌트에서 AWS 자격 증명을 직접 사용하는 것은 보안상 위험합니다.
// 프로덕션 환경에서는 반드시 Next.js API Routes를 통해 서버 사이드에서 통신하도록 리팩토링하세요.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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

    // 결제 처리 함수 (모달에서 선택 후 호출될 실제 결제 로직)
    const processPayment = useCallback(async (method) => {
        setLoading(true);
        try {
            // 결제 처리 시뮬레이션
            const paymentSuccess = await new Promise(resolve => setTimeout(() => {
                // 데모를 위해 무작위로 성공/실패 시뮬레이션 (PayPal은 90% 성공, 현금은 항상 성공)
                if (method === 'paypal') {
                    resolve(Math.random() > 0.5);
                } else {
                    resolve(true);
                }
            }, 1500)); // 1.5초 지연 시뮬레이션

            const methodName = method === 'paypal' ? 'PayPal' : 'Cash on Delivery';

            const updatedStatusHistory = [
                ...(order.statusHistory || []),
                {
                    timestamp: new Date().toISOString(),
                    oldStatus: 'Order(Confirmed)',
                    newStatus: methodName,
                    changedBy: 'Admin',
                }
            ];

            if (paymentSuccess) {
                const updateResponse = await fetch(`/api/orders/${orderId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: methodName,
                        paymentMethod: method,
                        statusHistory: updatedStatusHistory,
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
                    "결제에 실패했습니다.", // 이미지에 맞게 메시지 간결화
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
    }, [orderId, router, showModal]);


    // "Pay" 버튼 클릭 시 모달 열기
    const handlePayButtonClick = () => {
        setIsPaymentModalOpen(true);
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

    // 이미지에 맞춰 상품명 요약
    const productSummary = orderDetail.orderItems.length > 0
        ? `${orderDetail.orderItems[0].name} x ${orderDetail.orderItems.reduce((sum, item) => sum + item.quantity, 0)}`
        : '상품 없음';

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.iconButton}>
                    <BackIcon />
                </button>
                <h1 className={styles.title}>Payment</h1> {/* Title changed to "Payment" */}
                <div style={{ width: '24px' }}></div>
            </header>

            <main className={styles.mainContent}>
                {/* Total(2) */}
                <div className={styles.totalCount}>Total({orderDetail.orderItems.length})</div>

                {/* Order Summary Section */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitleWithIcon}>
                        <img src="/images/cart.png" alt="Order Summary Icon" width={20} height={20} className={styles.sectionIcon} />
                        Order Summary
                    </h2>
                    <div className={styles.summaryRow}>
                        <span>{productSummary}</span>
                        <span>${productPriceTotal.toFixed(2)}</span>
                    </div>
                    <hr className={styles.sectionDivider} />
                    <div className={styles.summaryRow}>
                        <span>Subtotal</span>
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
                    <div className={styles.finalTotalDisplayRow}>
                        <span>Final Total</span>
                        <span className={styles.highlightPrice}>${finalTotalPrice.toFixed(2)} (USD)</span>
                    </div>
                </section>

                {/* Delivery Details Section (Readonly) */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitleWithIcon}>
                        <img src="/images/Delivery.png" alt="Delivery Icon" width={20} height={20} className={styles.sectionIcon} />
                        Delivery Details
                    </h2>
                    <div className={styles.detailText}>
                        {orderDetail.deliveryDetails.option === 'onboard' ? (
                            <>
                                {orderDetail.deliveryDetails.portName}
                                <br />
                                {orderDetail.deliveryDetails.expectedShippingDate}
                            </>
                        ) : (
                            <>
                                {orderDetail.deliveryDetails.address}
                                <br />
                                {orderDetail.deliveryDetails.postalCode}
                            </>
                        )}
                    </div>
                </section>

                {/* Message Section */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitleWithIcon}>
                        <img src="/images/bell.png" alt="Message Icon" width={20} height={20} className={styles.sectionIcon} />
                        Message
                    </h2>
                    <div className={styles.messageContent}>
                        {orderDetail.messages && orderDetail.messages.length > 0 ? (
                            orderDetail.messages.map((msg, index) => (
                                <div key={index} className={styles.messageItem}>
                                    {msg.text && msg.sender === 'Admin' && <p className={styles.messageText}>→ {msg.text}</p>}
                                    {msg.imageUrl && msg.sender === 'Admin' && <p className={styles.messageText}>→ <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">image.jpg</a></p>}
                                </div>
                            ))
                        ) : (
                            <p className={styles.messageText}>No messages.</p>
                        )}
                    </div>
                </section>

                {/* Estimated Delivery Date Section */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitleWithIcon}>
                        <img src="/images/Caret Down.png" alt="Estimated Delivery Icon" width={20} height={20} className={styles.sectionIcon} />
                        Estimated Delivery Date
                    </h2>
                    <p className={styles.deliveryNote}>
                        Delays may occur due to changes in schedules.
                    </p>
                    <div className={styles.deliveryDate}>
                        → {orderDetail.shippingDetails?.estimatedDelivery || 'N/A'}
                    </div>
                </section>

                <p className={styles.noChangesNote}>
                    No changes can be made at this stage.
                </p>
            </main>

            {/* Fixed Footer for Pay button and Back button */}
            <footer className={styles.fixedFooter}>
                <button
                    onClick={() => router.back()}
                    className={styles.backButtonFooter} // 새로운 스타일 적용
                >
                    Cancel
                </button>
                <button
                    onClick={handlePayButtonClick} // handlePayment 대신 모달을 여는 함수 호출
                    className={styles.submitButton}
                    disabled={loading} // 로딩 중에는 비활성화
                >
                    Pay
                </button>
            </footer>

            <PaymentMethodSelectionModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSelectMethod={(method) => { // 'onSelect'를 'onSelectMethod'로 변경
                    setSelectedPaymentMethod(method);
                    setIsPaymentModalOpen(false);
                    processPayment(method); // 모달에서 선택 후 실제 결제 처리 함수 호출
                }}
                selectedMethod={selectedPaymentMethod}
                finalTotalPrice={finalTotalPrice} // total price를 prop으로 전달
            />
        </div>
    );
}