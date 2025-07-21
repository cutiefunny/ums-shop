'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './order-detail.module.css';
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
const AttachIcon = () => <img src="/images/attach.png" alt="Attach" width="18" height="18" />;
const SendIcon = () => <img src="/images/send.png" alt="Send" width="24" height="24" />;


export default function CheckoutPage() {
    const router = useRouter();
    const { user, isLoggedIn, logout } = useAuth();
    const { showModal, showConfirmationModal } = useModal();
    const params = useParams();
    const { orderId } = params; // URL에서 orderId 값 가져오기

    // Step 1: Order Review & Details State
    const [orderDetail, setOrderDetail] = useState([]); // 현재 주문 상세 정보
    const [cartItems, setCartItems] = useState([]); // 장바구니 아이템 목록
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [deliveryOption, setDeliveryOption] = useState('onboard'); // 'onboard' or 'alternative'
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [portName, setPortName] = useState('');
    const [expectedShippingDate, setExpectedShippingDate] = useState('');
    const [userMessage, setUserMessage] = useState(''); // 현재 입력 중인 메시지 (텍스트)
    const [attachedFileForStep1, setAttachedFileForStep1] = useState(null); // 현재 첨부된 파일
    const [filePreviewUrlForStep1, setFilePreviewUrlForStep1] = useState(null); // 현재 첨부된 파일 미리보기 URL
    const fileInputRefForStep1 = useRef(null);
    const [selectedItemsForOrder, setSelectedItemsForOrder] = useState(new Set()); // 주문할 상품 ID Set
    const [messagesForStep1, setMessagesForStep1] = useState([]); // Step 1에서 주고받은 메시지 목록

    // Guide Modal related states (kept for initial order guidance, but flow changes)
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [currentGuideStep, setCurrentGuideStep] = useState(0);
    const [orderSuccessfullyPlaced, setOrderSuccessfullyPlaced] = useState(false);

    // Derived State for totals
    const totalItemsCount = useMemo(() => {
        return cartItems.reduce((sum, item) => selectedItemsForOrder.has(item.productId) ? sum + item.quantity : sum, 0);
    }, [cartItems, selectedItemsForOrder]);

    const productPriceTotal = useMemo(() => {
        return cartItems.reduce((sum, item) => {
            if (selectedItemsForOrder.has(item.productId)) {
                return sum + (item.unitPrice || 0) * (item.quantity || 0) * (1 - (item.discount || 0) / 100); // 할인 적용
            }
            return sum;
        }, 0);
    }, [cartItems, selectedItemsForOrder]);

    const shippingFee = 20; // Fixed shipping fee for now

    const finalTotalPrice = useMemo(() => {
        return productPriceTotal + shippingFee;
    }, [productPriceTotal, shippingFee]);

    // 사용자 주문 상세 정보를 DB에서 가져오는 함수
    const fetchOrderDetail = useCallback(async () => {
        if (!orderId) return;

        setMessagesForStep1([]); // Step 1 메시지 초기화
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/orders/${orderId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const orderData = await response.json();
            const items = orderData.orderItems || [];
            const messages = orderData.messages || [];

            items.forEach(item => {
                item.unitPrice = item.originalUnitPrice || item.unitPrice; // 원본 가격을 unitPrice로 설정
            });

            messages.forEach(msg => {
                setMessagesForStep1(prev => [...prev, {
                    id: prev.length + 1,
                    sender: msg.sender || 'User',
                    timestamp: msg.timestamp || new Date().toISOString(),
                    text: msg.text || '',
                    imageUrl: msg.imageUrl || null, // 이미지 URL이 있을 경우
                }]);
            });

            console.log("Fetched order detail:", orderData);

            setCartItems(items);
            setSelectedItemsForOrder(new Set(items.map(item => item.productId)));
            // MODIFICATION END
        } catch (err) {
            console.error("Error fetching user cart:", err);
            setError(`주문 목록을 불러오는 데 실패했습니다: ${err.message}`);
            showModal(`주문 목록을 불러오는 데 실패했습니다: ${err.message}`);
            logout(); // 보안상 장바구니 데이터 로드 실패 시 로그아웃
            router.replace('/');
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn, user?.seq, showModal, logout, router]);

    useEffect(() => {
        fetchOrderDetail();
    }, [fetchOrderDetail]);

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

    // Step 1에서 메시지를 추가하는 함수
    const handleAddMessageForStep1 = async () => {
        if (!userMessage.trim() && !attachedFileForStep1) {
            showModal('메시지 내용 또는 첨부 파일을 입력해주세요.');
            return;
        }

        let fileData = null;
        if (attachedFileForStep1) {
            setLoading(true); // 파일 업로드 시작 시 로딩 상태 설정
            try {
                // 1. S3 Pre-Signed POST URL 요청 (GET 요청으로 변경)
                // 서버가 createPresignedPost를 사용하므로, GET 요청으로 filename과 contentType을 쿼리 파라미터로 보냄
                const getSignedUrlResponse = await fetch(`/api/s3-upload-url?filename=${attachedFileForStep1.name}&contentType=${attachedFileForStep1.type}`);

                if (!getSignedUrlResponse.ok) {
                    const errorData = await getSignedUrlResponse.json();
                    throw new Error(errorData.message || 'Failed to get S3 signed URL.');
                }
                const { url, fields } = await getSignedUrlResponse.json(); // signedUrl 대신 url과 fields를 받음

                // S3에 저장될 최종 이미지 URL 구성 (클라이언트에서 직접 구성)
                // process.env.NEXT_PUBLIC_S3_BUCKET_NAME 및 process.env.NEXT_PUBLIC_AWS_REGION 필요
                const S3_BUCKET_NAME_PUBLIC = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'ums-shop-storage';
                const AWS_REGION_PUBLIC = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-southeast-2';
                const objectKey = fields.Key; // fields 객체에 S3 객체 Key가 포함되어 있음
                const imageUrl = `https://${S3_BUCKET_NAME_PUBLIC}.s3.${AWS_REGION_PUBLIC}.amazonaws.com/${objectKey}`;


                // 2. FormData 생성 및 필드 추가
                const formData = new FormData();
                Object.entries(fields).forEach(([key, value]) => {
                    formData.append(key, value);
                });
                // 실제 파일을 fields.Key에 해당하는 이름으로 FormData에 추가
                formData.append(fields.Key, attachedFileForStep1);


                // 3. Pre-Signed POST URL을 사용하여 S3에 파일 업로드
                const uploadFileToS3Response = await fetch(url, { // url은 createPresignedPost에서 받은 S3 업로드 URL
                    method: 'POST', // PUT 대신 POST 사용
                    body: formData, // FormData를 body로 보냄
                });

                if (!uploadFileToS3Response.ok) {
                    throw new Error('Failed to upload file to S3.');
                }

                fileData = {
                    name: attachedFileForStep1.name,
                    type: attachedFileForStep1.type,
                    size: attachedFileForStep1.size,
                    url: imageUrl, // S3에 저장된 실제 이미지 URL
                };

            } catch (uploadError) {
                console.error("S3 upload error:", uploadError);
                showModal(`파일 업로드 실패: ${uploadError.message}`);
                setLoading(false); // 로딩 해제
                return; // 업로드 실패 시 메시지 전송 중단
            } finally {
                setLoading(false); // 파일 업로드 완료 후 로딩 해제
            }
        }

        const newMessage = {
            id: messagesForStep1.length + 1,
            sender: 'User',
            timestamp: new Date().toISOString(),
            text: userMessage.trim(),
            file: fileData, // S3 업로드된 파일 정보 또는 null
        };

        setMessagesForStep1(prev => [...prev, newMessage]);
        setUserMessage('');
        setAttachedFileForStep1(null);
        setFilePreviewUrlForStep1(null);
        if (fileInputRefForStep1.current) {
            fileInputRefForStep1.current.value = ''; // 파일 입력 필드 초기화
        }
    };

    // 메시지 입력 필드 변경 핸들러 - 한글 입력 방지
    const handleUserMessageChange = useCallback((e) => {
        const inputValue = e.target.value;
        // 한글 유니코드 범위: \uAC00-\uD7AF (가-힣), \u1100-\u11FF (자모), \u3130-\u318F (호환용 자모), \uA960-\uA97F (초성), \uD7B0-\uD7FF (종성)
        const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;
        if (koreanRegex.test(inputValue)) {
            showModal('Only English letters are allowed.');
            // 한글을 제외한 문자열만 설정
            setUserMessage(inputValue.replace(koreanRegex, ''));
        } else {
            setUserMessage(inputValue);
        }
    }, [showModal]);


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

            // 주문 생성 페이로드
            const orderPayload = {
                userEmail: user.email,
                userName: user.name,
                customer: {
                    email: user.email,
                    name: user.name,
                    phoneNumber: user.phoneNumber
                },
                shipInfo: {
                    shipName: user.shipName,
                    port: deliveryDetailsPayload.portName,
                },
                shippingDetails: {
                    method: deliveryOption,
                    estimatedDelivery: deliveryDetailsPayload.expectedShippingDate,
                    trackingNumber: null, // 주문 생성 시에는 아직 트래킹 번호가 없음
                    actualDelivery: null, // 실제 배송 날짜는 주문 후에 업데이트됨
                },
                totalAmount: finalTotalPrice,
                subtotal: productPriceTotal,
                shippingFee: shippingFee,
                tax: 0,
                orderItems: itemsToOrder.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice, //원본 가격
                    discountedUnitPrice: item.unitPrice * (1 - (item.discount || 0) / 100), // 할인 적용된 가격
                    discount: item.discount, // 할인율
                    mainImage: item.mainImage,
                    sku: item.slug,
                    adminStatus: 'Pending Review', // 초기 상태는 'Pending Review'
                    adminQuantity: item.quantity, // 초기에는 주문 수량과 동일
                })),
                deliveryDetails: deliveryDetailsPayload,
                messages: messagesForStep1, // Step 1에서 작성된 모든 메시지 포함
                status: 'Order', // 초기 주문 상태
                date: new Date().toISOString(),
                statusHistory: [{
                    timestamp: new Date().toISOString(),
                    oldStatus: null,
                    newStatus: 'Order Request',
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

            if (isFirstOrder) {
                setOrderSuccessfullyPlaced(true);
                setShowGuideModal(true);
                setCurrentGuideStep(0);
            } else {
                showModal("주문이 성공적으로 접수되었습니다. 주문 목록 페이지로 이동합니다.", () => {
                    router.push('/orders');
                });
            }
        } catch (err) {
            console.error("Order submission error:", err);
            showModal(`주문 접수에 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
        }
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

    if (cartItems.length === 0 && !orderSuccessfullyPlaced) {
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
                    {/* Message Display Area */}
                    <div className={styles.messageDisplayArea}>
                        {messagesForStep1.length === 0 && !attachedFileForStep1 ? (
                            <p className={styles.emptyMessageText}>No messages have been created.</p>
                        ) : (
                            messagesForStep1.map((msg, index) => (
                                <div key={index} className={styles.messageBubble} data-sender={msg.sender}>
                                    {msg.text && <p className={styles.existingMessageText}>{msg.text}</p>}
                                    {msg.imageUrl && (
                                        <img src={msg.imageUrl} alt="Attached Preview" className={styles.attachedImagePreview} />
                                    )}
                                    <span className={styles.messageTimestamp}>{moment(msg.timestamp).format('YYYY-MM-DD HH:mm')}</span>
                                </div>
                            ))
                        )}

                        {/* New: Display draft image preview within message display area */}
                        {attachedFileForStep1 && (
                            <div className={styles.draftImagePreviewContainer}>
                                <img src={filePreviewUrlForStep1} alt="Attachment Preview" className={styles.draftImagePreview} />
                                <div className={styles.draftImageDetails}>
                                    <button onClick={() => { setAttachedFileForStep1(null); setFilePreviewUrlForStep1(null); if (fileInputRefForStep1.current) fileInputRefForStep1.current.value = ''; }} className={styles.removeDraftImageButton}>x</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message Input Area */}
                    <div className={styles.messageInputContainer}>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            ref={fileInputRefForStep1}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    if (!file.type.startsWith('image/')) {
                                        showModal('Only image files are allowed.');
                                        setAttachedFileForStep1(null);
                                        setFilePreviewUrlForStep1(null);
                                        e.target.value = '';
                                        return;
                                    }
                                    if (file.size > 5 * 1024 * 1024) { // 5MB limit
                                        showModal('Image file size cannot exceed 5MB.');
                                        setAttachedFileForStep1(null);
                                        setFilePreviewUrlForStep1(null);
                                        e.target.value = '';
                                        return;
                                    }
                                    setAttachedFileForStep1(file);
                                    setFilePreviewUrlForStep1(URL.createObjectURL(file));
                                    // userMessage is not cleared here, as text and image can be sent together
                                }
                            }}
                        />
                        <button type="button" onClick={() => fileInputRefForStep1.current.click()} className={styles.attachButton}>
                            <AttachIcon />
                        </button>
                        <textarea
                            className={styles.messageInput}
                            placeholder={"Write a message"}
                            value={userMessage}
                            onChange={handleUserMessageChange} // 변경된 핸들러 사용
                            rows="1"
                        ></textarea>
                        <button type="button" onClick={handleAddMessageForStep1} className={styles.sendMessageButton}>
                            <SendIcon />
                        </button>
                    </div>
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
            </main>

            {/* Fixed Footer for buttons */}
            <footer className={styles.fixedFooter}>
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
                    <button onClick={handleSubmitOrderReview} className={styles.submitButton}>
                        Submit
                    </button>
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
        </div>
    );
}