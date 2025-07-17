// app/checkout/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './checkout.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import CartItem from '@/components/CartItem'; // CartItem 컴포넌트 재사용
import moment from 'moment'; // 날짜 형식을 위해 moment 사용
import BottomNav from '@/app/home/components/BottomNav'; // BottomNav 컴포넌트 임포트 추가
import GuideModal from '@/components/GuideModal'; // GuideModal 임포트
import PaymentMethodSelectionModal from '@/components/PaymentMethodSelectionModal'; // PaymentMethodSelectionModal 임포트 추가

// 아이콘 컴포넌트
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const ChevronDown = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M7 10L12 15L17 10" stroke="#495057" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const AttachIcon = () => ( // 메시지 첨부 아이콘
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 13.5l-3.24-3.24a2.82 2.82 0 0 0-3.96 0L2 17"></path>
    <path d="M13 7H7a2 2 0 0 0-2 2v6"></path>
  </svg>
);


export default function CheckoutPage() {
    const router = useRouter();
    const { user, isLoggedIn, logout } = useAuth(); // logout 함수 추가
    const { showModal, showConfirmationModal } = useModal();

    const [currentStep, setCurrentStep] = useState(1); // 1: Order Review (초기), 2: Order in Review (Admin Feedback), 3: Payment
    const [cartItems, setCartItems] = useState([]); // 현재 장바구니 항목
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Step 1: Order Review & Details State
    const [deliveryOption, setDeliveryOption] = useState('onboard'); // 'onboard' or 'alternative'
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [portName, setPortName] = useState(''); 
    const [expectedShippingDate, setExpectedShippingDate] = useState(''); 
    const [userMessage, setUserMessage] = useState('');
    const [selectedItemsForOrder, setSelectedItemsForOrder] = useState(new Set()); // 주문할 상품 ID Set

    // Step 2: Order in Review - Admin Feedback State
    const [orderReviewDetails, setOrderReviewDetails] = useState(null); // 관리자 피드백 포함된 주문 상세
    const [originalFinalTotalPrice, setOriginalFinalTotalPrice] = useState(0); // 1단계에서 계산된 최종 가격
    const [step2UserMessage, setStep2UserMessage] = useState(''); // 2단계 채팅 메시지 입력 필드

    // Derived State for totals
    const totalItemsCount = useMemo(() => {
        return cartItems.reduce((sum, item) => selectedItemsForOrder.has(item.productId) ? sum + item.quantity : sum, 0);
    }, [cartItems, selectedItemsForOrder]);

    const productPriceTotal = useMemo(() => {
        return cartItems.reduce((sum, item) => selectedItemsForOrder.has(item.productId) ? sum + (item.unitPrice * item.quantity) : sum, 0);
    }, [cartItems, selectedItemsForOrder]);

    const shippingFee = 20; // Fixed shipping fee for now

    const finalTotalPrice = useMemo(() => {
        return productPriceTotal + shippingFee;
    }, [productPriceTotal, shippingFee]);

    // Step 2 (Admin Feedback)에서의 총 가격 (관리자 조정 수량/대체품 반영)
    const currentReviewTotalPrice = useMemo(() => {
        if (!orderReviewDetails) return 0;
        return orderReviewDetails.orderItems.reduce((sum, item) => {
            const price = item.unitPrice || 0;
            let quantity = item.quantity; // 기본은 사용자 주문 수량
            if (item.adminStatus === 'Available' || item.adminStatus === 'Limited Quantity') {
                // 관리자가 수량을 조정한 경우 adminQuantity 사용, 아니면 원본 수량
                quantity = item.adminQuantity !== undefined ? item.adminQuantity : item.quantity;
            } else if (item.adminStatus === 'Out of Stock') {
                quantity = 0; // 품절이면 0개
            }
            // 'Alternative Offer'는 복잡하므로 여기서는 0으로 처리하거나 별도 로직 필요
            return sum + (price * quantity);
        }, 0) + (orderReviewDetails.shippingFee || 0); // 배송비 포함
    }, [orderReviewDetails]);

    // 금액 변동 여부
    const hasAmountChanged = useMemo(() => {
        if (currentStep === 2 && orderReviewDetails) {
            // 소수점 문제 방지를 위해 반올림 후 비교
            return Math.abs(currentReviewTotalPrice - originalFinalTotalPrice) > 0.01; 
        }
        return false;
    }, [currentStep, currentReviewTotalPrice, originalFinalTotalPrice, orderReviewDetails]);


    // Step 3: Payment Confirmation State (for display)
    const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('April 20, 2026'); // Example date
    const [showPaymentMethodSelectionModal, setShowPaymentMethodSelectionModal] = useState(false); // 결제 방식 선택 모달

    // 안내 모달 관련 상태
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [currentGuideStep, setCurrentGuideStep] = useState(0); // 0: 안내 1단계, 1: 안내 2단계, ... 3: 안내 4단계
    const [orderSuccessfullyPlaced, setOrderSuccessfullyPlaced] = useState(false); // 첫 주문 완료 플래그 설정

    const guideStepsContent = useMemo(() => ([
        {
            title: "Order Request",
            stepText: "1/4",
            message: `Place your order via Cart\n\n<Order in Review>\nEach item will be reviewed and labeled as one of the following: (within approx. 2 business days)\n\n- Available\n- Limited Quantity\n- Out of Stock\n- Alternative Offer\n\nEdit and resubmit after availability check.`,
            buttonText: "NEXT",
        },
        {
            title: "Order Confirmation",
            stepText: "2/4",
            message: `If everything is ready, tap [Send Order Confirmation]\n\n⚠️ No changes/cancellations can be made after confirmation.\n\n- To add more items, please place a new order.\n- For EMS Orders, Tracking Number will be provided upon shipment.`,
            buttonText: "NEXT",
        },
        {
            title: "Payment Options",
            stepText: "3/4",
            message: `After order confirmation, select your preferred payment method:\n\n- PayPal (Recommended)\n- Cash upon onboard delivery`,
            buttonText: "NEXT",
        },
        {
            title: "Delivery",
            stepText: "4/4",
            message: `Once your order reaches your vessel, you'll receive a "Delivered" notification.`,
            buttonText: "DONE",
        },
    ]), []);

    const guideModalHandlers = {
        onNext: () => {
            if (currentGuideStep < guideStepsContent.length - 1) {
                setCurrentGuideStep(prev => prev + 1);
            } else {
                setShowGuideModal(false); 
                setCurrentStep(2); // 변경된 부분: 안내 모달 완료 후 새로운 2단계로 이동 (Order in Review - Admin Feedback)
            }
        },
        onGoToMyOrders: () => {
            setShowGuideModal(false);
            router.push('/orders');
        }
    };

    // 사용자 장바구니 데이터를 DB에서 가져오는 함수
    const fetchUserCart = useCallback(async () => {
        if (!isLoggedIn || !user?.seq) {
            setCartItems([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/users/${user.seq}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const userData = await response.json();
            const fetchedCart = userData.cart || [];
            setCartItems(fetchedCart);
            setSelectedItemsForOrder(new Set(fetchedCart.map(item => item.productId)));
        } catch (err) {
            console.error("Error fetching user cart:", err);
            setError(`장바구니 목록을 불러오는 데 실패했습니다: ${err.message}`);
            showModal(`장바구니 목록을 불러오는 데 실패했습니다: ${err.message}`);
            logout(); // 보안상 장바구니 데이터 로드 실패 시 로그아웃
            router.replace('/');
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn, user?.seq, showModal, logout, router]);

    useEffect(() => {
        fetchUserCart();
    }, [fetchUserCart]);

    const handleUpdateQuantity = useCallback(async (productId, newQuantity) => {
        if (newQuantity < 1) {
            showModal("Minimum quantity is 1.");
            return;
        }
        const updatedCart = cartItems.map(item =>
            item.productId === productId ? { ...item, quantity: newQuantity } : item
        );
        setCartItems(updatedCart);
    }, [cartItems, showModal]);

    const handleRemoveItem = useCallback(async (productId) => {
        const updatedCart = cartItems.filter(item => item.productId !== productId);
        setCartItems(updatedCart);
        setSelectedItemsForOrder(prev => {
            const newSet = new Set(prev);
            newSet.delete(productId);
            return newSet;
        });
    }, [cartItems]);

    const handleTotalCheckboxToggle = useCallback((e) => {
        if (e.target.checked) {
            setSelectedItemsForOrder(new Set(cartItems.map(item => item.productId)));
        } else {
            setSelectedItemsForOrder(new Set());
        }
    }, [cartItems]);

    const handleItemCheckboxToggle = useCallback((productId) => {
        setSelectedItemsForOrder(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    }, []);

    const handleDeleteSelected = useCallback(() => {
        if (selectedItemsForOrder.size === 0) {
            showModal("삭제할 상품을 선택해주세요.");
            return;
        }
        showConfirmationModal(
            "상품 삭제",
            "선택된 상품들을 장바구니에서 삭제하시겠습니까?",
            () => {
                const updatedCart = cartItems.filter(item => !selectedItemsForOrder.has(item.productId));
                setCartItems(updatedCart);
                setSelectedItemsForOrder(new Set()); // 선택 초기화
                showModal("선택된 상품이 삭제되었습니다.");
            }
        );
    }, [cartItems, selectedItemsForOrder, showModal, showConfirmationModal]);

    const handleSubmitOrderReview = async () => {
        if (selectedItemsForOrder.size === 0) {
            showModal("주문할 상품을 1개 이상 선택해주세요.");
            return;
        }

        let deliveryDetailsPayload = {};
        if (deliveryOption === 'onboard') {
            if (!portName.trim() || !expectedShippingDate) {
                showModal("Port Name과 Expected Shipping Date를 입력해주세요.");
                return;
            }
            deliveryDetailsPayload = {
                option: deliveryOption,
                portName: portName.trim(),
                expectedShippingDate: expectedShippingDate,
            };
        } else { // alternative
            if (!deliveryAddress.trim() || !postalCode.trim()) {
                showModal("배송 주소와 우편번호를 입력해주세요.");
                return;
            }
            deliveryDetailsPayload = {
                option: deliveryOption,
                address: deliveryAddress.trim(),
                postalCode: postalCode.trim(),
            };
        }

        setLoading(true);
        try {
            const userOrdersResponse = await fetch(`/api/orders?userEmail=${user.email}`);
            if (!userOrdersResponse.ok) {
                throw new Error("Failed to fetch user's past orders.");
            }
            const pastOrders = await userOrdersResponse.json();
            const isFirstOrder = pastOrders.length === 0;

            const itemsToOrder = cartItems.filter(item => selectedItemsForOrder.has(item.productId));

            // 주문 생성 페이로드 (관리자 피드백 초기값 포함)
            const orderPayload = {
                userEmail: user.email,
                userName: user.name,
                shipName: user.shipName,
                totalAmount: finalTotalPrice,
                subtotal: productPriceTotal,
                shippingFee: shippingFee,
                tax: 0, 
                orderItems: itemsToOrder.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    mainImage: item.mainImage,
                    sku: item.slug, 
                    // 관리자 피드백 필드 초기화 (시뮬레이션)
                    adminStatus: 'Pending Review', // 초기 상태는 'Pending Review'
                    adminQuantity: item.quantity, // 초기에는 주문 수량과 동일
                })),
                deliveryDetails: deliveryDetailsPayload, 
                userMessage: userMessage,
                status: 'Order', // 초기 주문 상태
                date: new Date().toISOString(), 
                statusHistory: [{
                    timestamp: new Date().toISOString(),
                    oldStatus: null,
                    newStatus: 'Order',
                    changedBy: 'User',
                }],
            };

            const response = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '주문 생성 실패');
            }

            // 주문 성공 시 장바구니 초기화 (서버에도 반영)
            const userUpdateResponse = await fetch(`/api/users/${user.seq}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart: [] }),
            });
            if (!userUpdateResponse.ok) {
                console.error('Failed to clear cart after order:', await userUpdateResponse.text());
            }
            
            await fetchUserCart(); // 장바구니를 비운 후, 사용자 카트 데이터를 다시 가져옴

            // 2단계에서 사용할 주문 상세 정보를 저장
            // API 응답에서 orderId를 가져와야 합니다. 현재는 MOCK_ORDER_ID
            const newOrderId = response.headers.get('x-order-id') || `ORDER_${Date.now()}`; 
            setOrderReviewDetails({ ...orderPayload, orderId: newOrderId }); 
            setOriginalFinalTotalPrice(finalTotalPrice); // 1단계의 최종 금액 저장

            if (isFirstOrder) {
                setOrderSuccessfullyPlaced(true); // 첫 주문 완료 플래그 설정
                setShowGuideModal(true); // 첫 주문일 경우 안내 모달 표시
                setCurrentGuideStep(0); // 첫 안내 단계부터 시작
            } else {
                // 첫 주문이 아니면 바로 2단계로 이동
                setCurrentStep(2); 
            }
        } catch (err) {
            console.error("Order submission error:", err);
            showModal(`주문 접수에 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false); // 로딩 종료
        }
    };

    // --- 새로운 2단계 (Order in Review - Admin Feedback) 로직 ---

    // 2단계: 상품 수량 수정 (관리자 피드백 기반)
    const handleAdminFeedbackQuantityChange = (productId, newQuantity) => {
        setOrderReviewDetails(prev => {
            if (!prev) return null;
            const updatedItems = prev.orderItems.map(item => {
                if (item.productId === productId) {
                    // 관리자 상태가 'Available' 또는 'Limited Quantity'일 때만 수량 변경 가능
                    if (item.adminStatus === 'Available' || item.adminStatus === 'Limited Quantity') {
                         return { ...item, adminQuantity: newQuantity };
                    }
                }
                return item;
            });
            return { ...prev, orderItems: updatedItems };
        });
    };

    // 2단계: 메시지 전송
    const handleSendStep2Message = () => {
        if (!step2UserMessage.trim()) {
            showModal('메시지 내용을 입력해주세요.');
            return;
        }
        setOrderReviewDetails(prev => {
            if (!prev) return null;
            const newMessages = [...(prev.messages || []), {
                id: (prev.messages?.length || 0) + 1,
                sender: 'User', // 사용자가 보낸 메시지
                text: step2UserMessage.trim(),
                timestamp: new Date().toISOString(),
            }];
            return { ...prev, messages: newMessages };
        });
        setStep2UserMessage(''); // 입력 필드 초기화
        // TODO: 백엔드 API 호출하여 메시지 저장 (PUT /api/orders/[orderId])
    };

    // 2단계: [Send Order Confirmation] 버튼 클릭
    const handleSendOrderConfirmation = async () => {
        if (hasAmountChanged) {
            showModal("Order details have changed. Please review again before confirmation.");
            return;
        }

        // 금액 변동이 없고, 최종 확인되었다고 가정
        setLoading(true);
        try {
            // TODO: 백엔드 API 호출하여 주문 상태를 'Confirmed' 등으로 업데이트
            // orderReviewDetails를 기반으로 업데이트 (adminQuantity 등 반영)
            const updatedOrderPayload = {
                ...orderReviewDetails,
                status: 'Confirmed', // 주문 상태 변경
                statusHistory: [...(orderReviewDetails.statusHistory || []), {
                    timestamp: new Date().toISOString(),
                    oldStatus: orderReviewDetails.status,
                    newStatus: 'Confirmed',
                    changedBy: 'User',
                }],
                // 여기에 최종 확정된 orderItems (adminQuantity 등이 반영된)를 다시 보낼 수 있음
                // 현재 orderReviewDetails의 orderItems는 이미 adminQuantity를 포함하고 있음
            };

            const response = await fetch(`/api/orders/${orderReviewDetails.orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedOrderPayload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '주문 확인 실패');
            }

            showModal("주문이 성공적으로 확인되었습니다. 결제 페이지로 이동합니다.", () => {
                setCurrentStep(3); // 새로운 3단계 (결제)로 이동
            });
        } catch (err) {
            console.error("Order confirmation error:", err);
            showModal(`주문 확인에 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };


    // Step 3: Payment Actions (기존 2단계의 내용)
    const handlePayClick = () => {
        setShowPaymentMethodSelectionModal(true); // 결제 방식 선택 모달 열기
    };

    const handlePaymentMethodSelected = (method) => {
        // 이 함수에서 실제 결제 처리 로직 또는 결제 완료 후속 로직을 구현합니다.
        showConfirmationModal(
            "결제 진행",
            `선택된 결제 방식: ${method}.\n실제 결제는 구현되지 않았습니다. 주문 완료 처리하시겠습니까?`,
            () => {
                // 결제 완료 후 최종 주문 상태 업데이트 및 orders 페이지로 이동
                showModal("결제 완료! 주문이 처리되었습니다.", () => {
                    router.push('/orders');
                });
            },
            () => { /* do nothing on cancel */ }
        );
        setShowPaymentMethodSelectionModal(false); // 결제 방식 선택 모달 닫기
    };

    const handleCancelOrder = () => {
        showConfirmationModal(
            "주문 취소",
            "정말로 주문을 취소하시겠습니까? (장바구니 페이지로 돌아갑니다)",
            () => {
                router.push('/cart'); // 장바구니 페이지로 돌아가기
            },
            () => { /* do nothing on cancel */ }
        );
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
                    <h1 className={styles.title}>Order in Review</h1>
                    <div style={{ width: '24px' }}></div>
                </header>
                <main className={styles.mainContent}>
                    <div className={`${styles.emptyMessage} ${styles.errorText}`}>오류: {error}</div>
                </main>
            </div>
        );
    }

    if (!isLoggedIn) {
        return null;
    }

    // --- 핵심 수정 부분: 렌더링 우선순위 ---
    // 1. 주문이 성공적으로 완료되었고 첫 주문 안내 모달을 표시해야 할 경우
    if (orderSuccessfullyPlaced && showGuideModal) {
        return (
            <GuideModal
                isOpen={showGuideModal}
                title={guideStepsContent[currentGuideStep].title}
                stepText={guideStepsContent[currentGuideStep].stepText}
                message={guideStepsContent[currentGuideStep].message}
                buttonText={guideStepsContent[currentGuideStep].buttonText}
                onNext={guideModalHandlers.onNext}
                onGoToMyOrders={guideModalHandlers.onGoToMyOrders}
            />
        );
    }

    // 2. 장바구니가 비어있고, 첫 주문 완료 상태가 아닐 경우 (초기 상태 또는 이미 안내를 봤거나 첫 주문이 아닌 경우)
    if (cartItems.length === 0 && currentStep === 1 && !orderSuccessfullyPlaced) {
        return (
            <div className={styles.pageContainer}>
                <header className={styles.header}>
                    <button onClick={() => router.back()} className={styles.iconButton}>
                        <BackIcon />
                    </button>
                    <h1 className={styles.title}>Order in Review</h1>
                    <div style={{ width: '24px' }}></div>
                </header>
                <main className={styles.mainContent}>
                    <div className={styles.emptyMessage}>
                        <p>장바구니에 담긴 상품이 없습니다.</p>
                        <button onClick={() => router.push('/home')} className={styles.shopNowButton}>
                            Shop Now
                        </button>
                    </div>
                </main>
                <BottomNav activePath="/cart" />
            </div>
        );
    }
    // --- 핵심 수정 부분 끝 ---

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                {/* currentStep 1이 아니거나, 1이면서 첫 주문 완료 상태가 아닌 경우에만 뒤로가기 버튼 표시 */}
                {currentStep === 1 ? (
                    <button onClick={() => router.back()} className={styles.iconButton}>
                        <BackIcon />
                    </button>
                ) : ( // 2단계나 3단계에서는 이전 단계로 돌아가는 기능
                    <button onClick={() => setCurrentStep(prev => prev - 1)} className={styles.iconButton}>
                         <BackIcon />
                    </button>
                )}
                <h1 className={styles.title}>
                    {currentStep === 1 ? 'Order in Review' : 
                     currentStep === 2 ? 'Order in Review' : // 새로운 2단계 제목
                     'Payment'} {/* 새로운 3단계 제목 */}
                </h1>
                <div style={{ width: '24px' }}></div>
            </header>

            <main className={styles.mainContent}>
                {currentStep === 1 && (
                    <>
                        {/* Order Items Section */}
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <label className={styles.totalCheckboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={selectedItemsForOrder.size === cartItems.length && cartItems.length > 0}
                                        onChange={handleTotalCheckboxToggle}
                                    />
                                    Total({selectedItemsForOrder.size}/{cartItems.length})
                                </label>
                                <button onClick={handleDeleteSelected} className={styles.deleteButton}>Delete</button>
                            </div>
                            <div className={styles.cartItemsList}>
                                {cartItems.map(item => (
                                    <div key={item.productId} className={styles.cartItemWrapper}>
                                        <input
                                            type="checkbox"
                                            checked={selectedItemsForOrder.has(item.productId)}
                                            onChange={() => handleItemCheckboxToggle(item.productId)}
                                            className={styles.itemCheckbox}
                                        />
                                        <CartItem
                                            item={item}
                                            onUpdateQuantity={handleUpdateQuantity}
                                            onRemoveItem={handleRemoveItem}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Message Section */}
                        <section className={styles.section}>
                            <div className={styles.messageHeader}>
                                <h2>Message</h2>
                                <ChevronDown />
                            </div>
                            <textarea
                                className={styles.messageInput}
                                placeholder="Enter your message here."
                                value={userMessage}
                                onChange={(e) => setUserMessage(e.target.value)}
                                rows="3"
                            ></textarea>
                        </section>

                        {/* Delivery Details Section */}
                        <section className={styles.section}>
                            <h2>Delivery Details</h2>
                            <div className={styles.deliveryOptions}>
                                <label>
                                    <input
                                        type="radio"
                                        name="deliveryOption"
                                        value="onboard"
                                        checked={deliveryOption === 'onboard'}
                                        onChange={(e) => setDeliveryOption(e.target.value)}
                                    /> Onboard Delivery
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="deliveryOption"
                                        value="alternative"
                                        checked={deliveryOption === 'alternative'}
                                        onChange={(e) => setDeliveryOption(e.target.value)}
                                    /> Alternative Pickup Location
                                </label>
                            </div>
                            {deliveryOption === 'onboard' ? (
                                <>
                                    <input
                                        type="text"
                                        className={styles.deliveryInput}
                                        placeholder="Port Name"
                                        value={portName}
                                        onChange={(e) => setPortName(e.target.value)}
                                    />
                                    <input
                                        type="date"
                                        className={styles.deliveryInput}
                                        placeholder="Expected Shipping Date"
                                        value={expectedShippingDate}
                                        onChange={(e) => setExpectedShippingDate(e.target.value)}
                                    />
                                </>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        className={styles.deliveryInput}
                                        placeholder="Address"
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className={styles.deliveryInput}
                                        placeholder="Postal Code"
                                        value={postalCode}
                                        onChange={(e) => setPostalCode(e.target.value)}
                                    />
                                </>
                            )}
                        </section>
                    </>
                )}

                {currentStep === 2 && orderReviewDetails && ( // 새로운 2단계 UI
                    <>
                        <div className={styles.infoBanner}>
                            <p>Each item will be reviewed and labeled as one of the following: (within approx. 2 business days)</p>
                            <ul>
                                <li>- Available</li>
                                <li>- Limited Quantity</li>
                                <li>- Out of Stock</li>
                                <li>- Alternative Offer</li>
                            </ul>
                            <p>Edit and resubmit after availability check.</p>
                        </div>
                        {/* Order Items with Admin Feedback */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Order List</h2>
                            <div className={styles.cartItemsList}>
                                {orderReviewDetails.orderItems.map(item => (
                                    <div key={item.productId} className={styles.cartItemCard}>
                                        <div className={styles.itemImageLink}>
                                            <img
                                                src={item.mainImage}
                                                alt={item.name}
                                                width={80}
                                                height={80}
                                                style={{ objectFit: 'cover' }}
                                            />
                                        </div>
                                        <div className={styles.itemDetails}>
                                            <h3 className={styles.itemName}>{item.name}</h3>
                                            <p className={styles.itemUnitPrice}>${(item.unitPrice || 0).toFixed(2)} / pc</p>
                                            <div className={styles.adminFeedback}>
                                                <span className={styles.adminStatusTag} data-status={item.adminStatus}>{item.adminStatus}</span>
                                                {(item.adminStatus === 'Available' || item.adminStatus === 'Limited Quantity') && (
                                                    <div className={styles.quantityControl}>
                                                        <button onClick={() => handleAdminFeedbackQuantityChange(item.productId, (item.adminQuantity || item.quantity) - 1)} disabled={(item.adminQuantity || item.quantity) <= 1}>-</button>
                                                        <span className={styles.itemQuantity}>{item.adminQuantity !== undefined ? item.adminQuantity : item.quantity}</span>
                                                        <button onClick={() => handleAdminFeedbackQuantityChange(item.productId, (item.adminQuantity || item.quantity) + 1)}>+</button>
                                                    </div>
                                                )}
                                                {item.adminStatus === 'Out of Stock' && (
                                                    <span className={styles.outOfStockText}>Out of Stock</span>
                                                )}
                                                {item.adminStatus === 'Alternative Offer' && (
                                                    <button className={styles.alternativeOfferButton}>View Alternative</button>
                                                )}
                                            </div>
                                            <p className={styles.itemTotalPrice}>Subtotal: ${((item.adminQuantity !== undefined ? item.adminQuantity : item.quantity) * (item.unitPrice || 0)).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Message Section (Chat-like) */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Message</h2>
                            <div className={styles.messageHistoryArea}>
                                {orderReviewDetails.messages?.map(msg => (
                                    <div key={msg.id} className={`${styles.chatMessage} ${msg.sender === 'Admin' ? styles.adminMessage : styles.userMessage}`}>
                                        <p className={styles.chatMessageText}>{msg.text}</p>
                                        <span className={styles.chatMessageTime}>{moment(msg.timestamp).format('YYYY-MM-DD HH:mm')}</span>
                                    </div>
                                ))}
                            </div>
                            <div className={styles.messageInputContainer}>
                                <textarea
                                    className={styles.messageInput}
                                    placeholder="Enter your message here."
                                    value={step2UserMessage}
                                    onChange={(e) => setStep2UserMessage(e.target.value)}
                                    rows="1"
                                />
                                <button onClick={handleSendStep2Message} className={styles.sendMessageButton}><AttachIcon />Send</button>
                            </div>
                        </section>

                        {/* Order Summary for Step 2 */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Order Summary</h2>
                            <div className={styles.summaryRow}>
                                <span>Product Price</span>
                                <span>${currentReviewTotalPrice.toFixed(2)}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Shipping Fee</span>
                                <span>${(orderReviewDetails.shippingFee || 0).toFixed(2)}</span>
                            </div>
                            <div className={`${styles.summaryRow} ${styles.finalTotalRow}`}>
                                <span>Final Total</span>
                                <span>${(currentReviewTotalPrice + (orderReviewDetails.shippingFee || 0)).toFixed(2)} <span className={styles.currency}>USD</span></span>
                            </div>
                        </section>
                    </>
                )}

                {currentStep === 3 && orderReviewDetails && ( // 새로운 3단계 UI (결제)
                    <>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Order Summary</h2>
                            <div className={styles.summaryRow}>
                                <span>Product Price</span>
                                <span>${(orderReviewDetails.subtotal || 0).toFixed(2)}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Shipping Fee</span>
                                <span>${(orderReviewDetails.shippingFee || 0).toFixed(2)}</span>
                            </div>
                            <div className={`${styles.summaryRow} ${styles.finalTotalRow}`}>
                                <span>Final Total</span>
                                <span>${(orderReviewDetails.totalAmount || 0).toFixed(2)} <span className={styles.currency}>USD</span></span>
                            </div>
                        </section>

                        {/* Delivery Details - copied from Step 2 */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Delivery Details</h2>
                            {orderReviewDetails.deliveryDetails?.option === 'onboard' ? (
                                <>
                                    <p className={styles.detailText}>Port Name: {orderReviewDetails.deliveryDetails.portName}</p>
                                    <p className={styles.detailText}>Expected Shipping Date: {orderReviewDetails.deliveryDetails.expectedShippingDate}</p>
                                </>
                            ) : (
                                <>
                                    <p className={styles.detailText}>{orderReviewDetails.deliveryDetails?.address}</p>
                                    <p className={styles.detailText}>{orderReviewDetails.deliveryDetails?.postalCode}</p>
                                </>
                            )}
                        </section>

                        {/* Message - copied from Step 2 */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Message</h2>
                            <div className={styles.messageHistoryArea}>
                                {orderReviewDetails.messages?.map(msg => (
                                    <div key={msg.id} className={`${styles.chatMessage} ${msg.sender === 'Admin' ? styles.adminMessage : styles.userMessage}`}>
                                        <p className={styles.chatMessageText}>{msg.text}</p>
                                        <span className={styles.chatMessageTime}>{moment(msg.timestamp).format('YYYY-MM-DD HH:mm')}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Estimated Delivery Date */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Estimated Delivery Date</h2>
                            <p className={styles.detailText}>{estimatedDeliveryDate}</p> {/* Still a mock date for now */}
                            <p className={styles.smallText}>Delays may occur due to changes in schedules.</p>
                            <p className={styles.smallText}>No changes can be made at this stage.</p>
                        </section>
                    </>
                )}
            </main>

            {/* Fixed Footer for buttons */}
            <footer className={styles.fixedFooter}>
                {currentStep === 1 && (
                    <div className={styles.totalSummaryBox}>
                        <div className={styles.totalSummaryRow}>
                            <span className={styles.totalSummaryLabel}>Total Quantity</span>
                            <span className={styles.totalSummaryValue}>{totalItemsCount} items</span>
                        </div>
                        <div className={styles.totalSummaryRow}>
                            <span className={styles.totalSummaryLabel}>Product Price</span>
                            <span className={styles.totalSummaryValue}>${productPriceTotal.toFixed(2)}</span>
                        </div>
                        <div className={styles.totalSummaryRow}>
                            <span className={styles.totalSummaryLabel}>Shipping fee</span>
                            <span className={styles.totalSummaryValue}>${shippingFee.toFixed(2)}</span>
                        </div>
                        <div className={styles.totalSummaryDivider}></div>
                        <div className={styles.totalSummaryRow}>
                            <span className={styles.totalSummaryLabel}>Total Price</span>
                            <span className={`${styles.totalSummaryValue} ${styles.highlightPrice}`}>${finalTotalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                )}
                {currentStep === 1 ? (
                    <button onClick={handleSubmitOrderReview} className={styles.submitButton}>
                        Submit
                    </button>
                ) : currentStep === 2 ? ( // 새로운 2단계 버튼
                    <div className={styles.paymentButtons}>
                        <button onClick={() => setCurrentStep(1)} className={styles.cancelButton}>Back to Step 1</button>
                        <button 
                            onClick={handleSendOrderConfirmation} 
                            className={styles.payButton}
                            disabled={hasAmountChanged} // 금액 변동 시 비활성화
                        >
                            Send Order Confirmation
                        </button>
                    </div>
                ) : ( // 새로운 3단계 버튼 (기존 2단계의 Pay/Cancel)
                    <div className={styles.paymentButtons}>
                        <button onClick={handleCancelOrder} className={styles.cancelButton}>Cancel</button>
                        <button onClick={handlePayClick} className={styles.payButton}>Pay</button>
                    </div>
                )}
            </footer>

            {showGuideModal && currentGuideStep < guideStepsContent.length && (
                <GuideModal
                    isOpen={showGuideModal}
                    title={guideStepsContent[currentGuideStep].title}
                    stepText={guideStepsContent[currentGuideStep].stepText}
                    message={guideStepsContent[currentGuideStep].message}
                    buttonText={guideStepsContent[currentGuideStep].buttonText}
                    onNext={guideModalHandlers.onNext}
                    onGoToMyOrders={guideModalHandlers.onGoToMyOrders}
                />
            )}

            {showPaymentMethodSelectionModal && (
                <PaymentMethodSelectionModal
                    isOpen={showPaymentMethodSelectionModal}
                    onClose={() => setShowPaymentMethodSelectionModal(false)}
                    onSelectMethod={handlePaymentMethodSelected}
                />
            )}
        </div>
    );
}