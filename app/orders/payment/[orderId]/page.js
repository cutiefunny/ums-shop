'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import styles from './payment.module.css';

// 엑셀 다운로드 라이브러리 임포트 (이 파일에서는 사용되지 않지만 기존 코드 유지)
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import moment from 'moment';

import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import PaymentMethodSelectionModal from '@/components/PaymentMethodSelectionModal';

// 아이콘 컴포넌트
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const ChevronDown = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M7 10L12 15L17 10" stroke="#495057" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;

export default function PaymentPage() {
    const router = useRouter();
    const { user, isLoggedIn } = useAuth();
    const { showModal } = useModal();
    const params = useParams();
    const { orderId } = params;
    const searchParams = useSearchParams();

    const [orderDetail, setOrderDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paypalScriptLoaded, setPaypalScriptLoaded] = useState(false);

    // 주문 상세 정보 불러오기
    const fetchOrderDetail = useCallback(async () => {
        if (!orderId) return;
        console.log('Fetching order detail for:', orderId);
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/orders/${orderId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Order detail fetched successfully:', data);
            setOrderDetail(data);
        } catch (err) {
            console.error("결제 주문 상세 정보를 불러오는 중 오류:", err);
            setError(`주문 상세 정보를 불러오는 데 실패했습니다: ${err.message}`);
            showModal(`주문 상세 정보를 불러오는 데 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [orderId, showModal]);

    // 주문 요약 계산 (orderDetail이 로드된 후에만 실행)
    const productPriceTotal = useMemo(() => {
        return orderDetail ? orderDetail.orderItems.reduce((sum, item) => sum + item.discountedUnitPrice * item.quantity, 0) : 0;
    }, [orderDetail]);

    const shippingFee = useMemo(() => {
        return orderDetail ? (orderDetail.shippingFee || 20) : 20;
    }, [orderDetail]);

    const finalTotalPrice = useMemo(() => {
        return productPriceTotal + shippingFee + (orderDetail?.tax || 0);
    }, [productPriceTotal, shippingFee, orderDetail]);

    // 이미지에 맞춰 상품명 요약
    const productSummary = useMemo(() => {
        return orderDetail && orderDetail.orderItems.length > 0
            ? `${orderDetail.orderItems[0].name} x ${orderDetail.orderItems.reduce((sum, item) => sum + item.quantity, 0)}`
            : '상품 없음';
    }, [orderDetail]);

    // PayPal 결제 완료 후 URL 콜백 처리
    useEffect(() => {
        const paymentStatus = searchParams.get('status');
        const paypalOrderId = searchParams.get('token');

        if (paymentStatus && paypalOrderId && orderDetail) {
            console.log('PayPal callback detected. Status:', paymentStatus, 'PayPal Order ID:', paypalOrderId);
            // URL 쿼리 파라미터 제거
            router.replace(`/orders/payment/${orderId}`, undefined, { shallow: true });

            if (paymentStatus === 'success') {
                finalizePayPalPayment(paypalOrderId, orderId);
            } else if (paymentStatus === 'cancel') {
                showModal("PayPal 결제가 취소되었습니다.", () => { /* 다시 시도 */ }, true, "다시 시도", () => { router.push('/orders'); }, "내 주문으로 이동");
            }
        }
    }, [searchParams, orderId, router, showModal, orderDetail]); // orderDetail 의존성 추가. finalizePayPalPayment도 나중에 의존성에 포함될 것입니다.

    // PayPal 결제 성공 후 최종 캡처 및 DB 업데이트
    const finalizePayPalPayment = useCallback(async (paypalOrderId, currentOrderId) => {
        console.log('Finalizing PayPal payment. PayPal Order ID:', paypalOrderId, 'Order ID:', currentOrderId);
        setLoading(true);
        try {
            const captureResponse = await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paypalOrderId: paypalOrderId,
                    orderId: currentOrderId,
                }),
            });

            if (!captureResponse.ok) {
                const errorData = await captureResponse.json();
                console.error('PayPal capture API failed:', errorData);
                throw new Error(errorData.message || 'PayPal 결제 캡처 실패.');
            }
            console.log('PayPal capture API successful.');

            // DynamoDB에서 기존 주문 정보 가져오기 (statusHistory 업데이트를 위해)
            const getOrderResponse = await fetch(`/api/orders/${currentOrderId}`);
            if (!getOrderResponse.ok) {
                console.error('Failed to fetch order details for status history update.');
                throw new Error(`주문 정보를 가져오는 데 실패했습니다: ${getOrderResponse.status}`);
            }
            const updatedOrderDetailAfterCapture = await getOrderResponse.json();
            console.log('Fetched order detail for status update:', updatedOrderDetailAfterCapture);


            // 최종 상태 업데이트
            const newStatus = 'PayPal (Paid)';
            const updatedStatusHistory = [
                ...(updatedOrderDetailAfterCapture.statusHistory || []),
                {
                    timestamp: new Date().toISOString(),
                    oldStatus: updatedOrderDetailAfterCapture.status || 'Order(Confirmed)',
                    newStatus: newStatus,
                    changedBy: user?.email || 'System',
                }
            ];

            const updateResponse = await fetch(`/api/orders/${currentOrderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    paymentMethod: 'paypal',
                    statusHistory: updatedStatusHistory,
                }),
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                console.error('Order status update failed:', errorData);
                throw new Error(errorData.message || '결제 후 주문 상태 업데이트 실패.');
            }
            console.log('Order status updated successfully in DB.');

            showModal("PayPal 결제가 성공적으로 완료되었습니다! 주문 목록 페이지로 이동합니다.", () => {
                router.push('/orders');
            });

        } catch (err) {
            console.error("PayPal 결제 완료 처리 오류:", err);
            showModal(`PayPal 결제 처리 중 오류가 발생했습니다: ${err.message}`, () => { /* 다시 시도 */ }, true, "다시 시도", () => { router.push('/orders'); }, "내 주문으로 이동");
        } finally {
            setLoading(false);
        }
    }, [orderId, router, showModal, user]);


    useEffect(() => {
        if (!isLoggedIn) {
            console.log('User not logged in, redirecting to login.');
            router.replace('/login');
            return;
        }
        if (!orderDetail) {
            fetchOrderDetail();
        }
    }, [fetchOrderDetail, isLoggedIn, router, orderDetail]);

    // 결제 처리 함수 (모달에서 선택 후 호출될 실제 결제 로직)
    const processPayment = useCallback(async (method, totalAmount) => { // totalAmount 인수를 받도록 명시
        if (!orderDetail) {
            console.log('Order detail not loaded when processPayment was called.');
            showModal("주문 상세 정보를 불러오지 못했습니다.");
            return;
        }
        setLoading(true);
        try {
            if (method === 'PayPal') {
                console.log('Attempting PayPal payment...');
                // 1. 백엔드에서 PayPal 주문 생성
                const createOrderResponse = await fetch('/api/paypal/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: orderDetail.orderId,
                        finalTotalPrice: totalAmount, // 인수로 받은 totalAmount 사용
                    }),
                });

                if (!createOrderResponse.ok) {
                    const errorData = await createOrderResponse.json();
                    console.error('PayPal create order API failed:', errorData);
                    throw new Error(errorData.message || 'PayPal 주문 생성 실패.');
                }
                const { links } = await createOrderResponse.json();
                console.log('PayPal order created successfully. Links:', links);

                // 2. PayPal 승인 URL로 리다이렉트
                const approveLink = links.find(link => link.rel === 'approve');
                if (approveLink) {
                    console.log('Redirecting to PayPal for approval:', approveLink.href);
                    window.location.href = approveLink.href; // PayPal 웹사이트로 리다이렉트
                } else {
                    console.error('PayPal approval link not found.');
                    throw new Error('PayPal 승인 링크를 찾을 수 없습니다.');
                }
                // 이 시점에서 setLoading(false)를 호출하지 않습니다.
                // 사용자가 PayPal 웹사이트로 이동하므로 로딩 상태는 계속 유지될 수 있습니다.

            } else if (method === 'Pay in Cash') {
                console.log('Attempting Pay in Cash payment...');
                // 현금 결제 로직 (기존과 동일)
                const methodName = 'Pay in Cash';

                const updatedStatusHistory = [
                    ...(orderDetail.statusHistory || []),
                    {
                        timestamp: new Date().toISOString(),
                        oldStatus: orderDetail.status || 'Order(Confirmed)',
                        newStatus: methodName,
                        changedBy: user?.email || 'Admin',
                    }
                ];

                const updateResponse = await fetch(`/api/orders/${orderDetail.orderId}`, {
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
                    console.error('Cash payment status update failed:', errorData);
                    throw new Error(errorData.message || '결제 후 주문 상태 업데이트 실패.');
                }
                console.log('Cash payment successful, order status updated.');

                showModal("현금 결제가 성공적으로 완료되었습니다! 주문 목록 페이지로 이동합니다.", () => {
                    router.push('/orders');
                });
            }
        } catch (err) {
            console.error("결제 처리 중 오류 발생:", err);
            showModal(`결제 처리 중 오류가 발생했습니다: ${err.message}`, () => { /* '다시 시도' 버튼 클릭 시 현재 페이지에 머무름 */ }, true, "다시 시도", () => { router.push('/orders'); }, "내 주문으로 이동");
        } finally {
            // PayPal 리다이렉트의 경우 이 finally 블록이 실행되지 않으므로 주의
            if (method === 'cash') {
                 setLoading(false);
            }
        }
    }, [orderDetail, router, showModal, user]); // finalTotalPrice 제거

    // "Pay" 버튼 클릭 시 모달 열기
    const handlePayButtonClick = () => {
        console.log('Pay button clicked, opening payment method selection modal.');
        setIsPaymentModalOpen(true);
    };

    if (loading && !orderDetail) {
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

    return (
        <div className={styles.pageContainer}>
            <Script
                src={`https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD`}
                onLoad={() => {
                    setPaypalScriptLoaded(true);
                    console.log('PayPal SDK script loaded.');
                }}
                onError={(e) => console.error("PayPal SDK load error:", e)}
                strategy="afterInteractive"
            />

            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.iconButton}>
                    <BackIcon />
                </button>
                <h1 className={styles.title}>Payment</h1>
                <div style={{ width: '24px' }}></div>
            </header>

            <main className={styles.mainContent}>
                <div className={styles.totalCount}>Total({orderDetail.orderItems.length})</div>

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

            <footer className={styles.fixedFooter}>
                { orderDetail.statusHistory && orderDetail.statusHistory.length > 0 && orderDetail.statusHistory[orderDetail.statusHistory.length - 1].newStatus === 'Payment(Request)' && (
                    <div className={styles.paymentRequestNote}>
                        Wait for admin confirmation
                    </div>
                )}
                { orderDetail.statusHistory && orderDetail.statusHistory.length > 0 && orderDetail.statusHistory[orderDetail.statusHistory.length - 1].newStatus === 'Payment(Confirmed)' && (
                    <>
                        <button
                        onClick={() => router.back()}
                        className={styles.backButtonFooter}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePayButtonClick}
                            className={styles.submitButton}
                            disabled={loading}
                        >
                            Pay
                        </button>
                    </>
                )}
            </footer>

            <PaymentMethodSelectionModal
                isOpen={isPaymentModalOpen}
                onClose={() => {
                    setIsPaymentModalOpen(false);
                    console.log('Payment method selection modal closed.');
                }}
                onSelectMethod={(method) => {
                    setSelectedPaymentMethod(method);
                    setIsPaymentModalOpen(false);
                    console.log('Payment method selected:', method);
                    // 모달에서 선택된 메서드와 최종 결제 금액을 processPayment로 전달
                    processPayment(method, finalTotalPrice);
                }}
                selectedMethod={selectedPaymentMethod}
                finalTotalPrice={finalTotalPrice}
                paypalScriptLoaded={paypalScriptLoaded}
            />
        </div>
    );
}