// app/orders/detail/[orderId]/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './order-detail.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import CartItem from '@/components/ProductCardOrderDetail'; // ProductCardOrderDetail 컴포넌트 임포트
import moment from 'moment'; // 날짜 형식을 위해 moment 사용
import BottomNav from '@/app/home/components/BottomNav'; // BottomNav 컴포넌트 임포트 추가
import GuideModal from '@/components/GuideModal'; // GuideModal 임포트
import PaymentMethodSelectionModal from '@/components/PaymentMethodSelectionModal'; // PaymentMethodSelectionModal 임포트 추가
import DatePickerModal from '@/components/DatePickerModal'; // [신규] DatePickerModal 임포트

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
    const [orderDetail, setOrderDetail] = useState(null); // 현재 주문 상세 정보 (초기값 null로 변경)
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
    const [productDetailsMap, setProductDetailsMap] = useState({}); // 각 상품의 최신 가격 및 할인율을 저장
    
    // [신규] Date Picker Modal State
    const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false);

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

        setLoading(true); // 메시지 초기화 이전에 로딩 시작
        setError(null);
        try {
            const orderResponse = await fetch(`/api/orders/${orderId}`);
            if (!orderResponse.ok) {
                throw new Error(`HTTP error! status: ${orderResponse.status}`);
            }
            const orderData = await orderResponse.json();
            setOrderDetail(orderData); // orderDetail 상태 업데이트
            const items = orderData.orderItems || [];
            const messages = orderData.messages || [];
            const deliveryDetails = orderData.deliveryDetails || {}; // deliveryDetails 추가

            // 메시지를 순회하며 필요한 필드를 포함하고 기존 ID를 사용
            const processedMessages = messages.map(msg => ({
                id: msg.id, // 기존 ID를 그대로 사용
                sender: msg.sender || 'User',
                timestamp: msg.timestamp || new Date().toISOString(),
                text: msg.text || '',
                imageUrl: msg.imageUrl || null, // 이미지 URL이 있을 경우
            }));
            setMessagesForStep1(processedMessages);

            // 각 주문 상품에 대한 최신 상품 정보 fetch
            const productDetailsPromises = items.map(async item => {
                try {
                    const productResponse = await fetch(`/api/products/${item.productId}`);
                    if (!productResponse.ok) {
                        // 상품 정보를 가져오지 못하면 경고를 출력하고 주문 시점의 가격 정보로 대체
                        console.warn(`Failed to fetch product details for ${item.productId}. Using order item data.`);
                        return {
                            productId: item.productId,
                            calculatedPriceUsd: item.unitPrice, // 주문 시점의 unitPrice 사용
                            discount: item.discount || 0, // 주문 시점의 discount 사용
                            adminStatus: item.adminStatus || 'Unknown', // 주문 시점의 adminStatus 사용
                            adminQuantity: item.adminQuantity || item.quantity, // 주문 시점의 adminQuantity 사용
                        };
                    }
                    const productData = await productResponse.json();
                    return {
                        productId: item.productId,
                        calculatedPriceUsd: productData.calculatedPriceUsd,
                        discount: productData.discount || 0,
                        adminStatus: productData.adminStatus,
                        adminQuantity: productData.adminQuantity,
                    };
                } catch (productFetchError) {
                    console.error(`Error fetching product ${item.productId} details:`, productFetchError);
                    // 네트워크 오류 등 발생 시 주문 시점의 가격 정보로 대체
                    return {
                        productId: item.productId,
                        calculatedPriceUsd: item.unitPrice,
                        discount: item.discount || 0,
                        adminStatus: item.adminStatus || 'Unknown',
                        adminQuantity: item.adminQuantity || item.quantity,
                    };
                }
            });

            const fetchedProductDetails = await Promise.all(productDetailsPromises);
            const newProductDetailsMap = {};
            fetchedProductDetails.forEach(detail => {
                newProductDetailsMap[detail.productId] = detail;
            });
            setProductDetailsMap(newProductDetailsMap); // 최신 상품 정보 맵 업데이트


            items.forEach(item => {
                item.unitPrice = item.originalUnitPrice || item.unitPrice; // 원본 가격을 unitPrice로 설정
            });
            setCartItems(items);
            setSelectedItemsForOrder(new Set(items.map(item => item.productId)));

            // deliveryDetails 세팅
            if (deliveryDetails.option) {
                setDeliveryOption(deliveryDetails.option);
                if (deliveryDetails.option === 'onboard') {
                    setPortName(deliveryDetails.portName || '');
                    setExpectedShippingDate(deliveryDetails.expectedShippingDate || '');
                    setDeliveryAddress(''); // 다른 옵션 필드 초기화
                    setPostalCode(''); // 다른 옵션 필드 초기화
                } else { // 'alternative'
                    setDeliveryAddress(deliveryDetails.address || '');
                    setPostalCode(deliveryDetails.postalCode || '');
                    setPortName(''); // 다른 옵션 필드 초기화
                    setExpectedShippingDate(''); // 다른 옵션 필드 초기화
                }
            }


        } catch (err) {
            console.error("Error fetching order or product details:", err);
            setError(`주문 및 상품 상세 정보를 불러오는 데 실패했습니다: ${err.message}`);
            showModal(`주문 및 상품 상세 정보를 불러오는 데 실패했습니다: ${err.message}`);
            logout();
            router.replace('/');
        } finally {
            setLoading(false);
        }
    }, [orderId, isLoggedIn, user?.seq, showModal, logout, router]);

    useEffect(() => {
        fetchOrderDetail();
    }, [fetchOrderDetail]);

    // 상품 가격 및 할인율 일치 여부 확인 Memo
    const arePricesAndDiscountsMatching = useMemo(() => {
        if (loading || !orderId || cartItems.length === 0 || Object.keys(productDetailsMap).length === 0) {
            return false;
        }
        for (const item of cartItems) {
            if (!selectedItemsForOrder.has(item.productId)) {
                continue;
            }
            const productDetails = productDetailsMap[item.productId];
            if (!productDetails) {
                console.warn(`Product details not found in map for item ${item.productId}. Assuming mismatch.`);
                return false;
            }
            if (item.adminStatus === 'Alternative Offer' || item.adminStatus === 'Out of Stock') {
                console.log(`Mismatch detected: Item ${item.productId} has adminStatus ${productDetails.adminStatus}.`);
                return false;
            }
            if (item.adminStatus === 'Limited' && item.adminQuantity < item.quantity) {
                console.log(`Mismatch detected: Item ${item.productId} has adminStatus Limited and adminQuantity (${productDetails.adminQuantity}) is less than ordered quantity (${item.quantity}).`);
                return false;
            }
            const orderedUnitPrice = parseFloat(item.unitPrice?.toFixed(2));
            const orderedDiscount = parseFloat((item.discount || 0)?.toFixed(2));
            const currentUnitPrice = parseFloat(productDetails.calculatedPriceUsd?.toFixed(2));
            const currentDiscount = parseFloat((productDetails.discount || 0)?.toFixed(2));

            if (orderedUnitPrice !== currentUnitPrice || orderedDiscount !== currentDiscount) {
                console.log(`Mismatch detected for item ${item.productId}:`);
                console.log(`  Ordered: Price=${orderedUnitPrice}, Discount=${orderedDiscount}`);
                console.log(`  Current: Price=${currentUnitPrice}, Discount=${currentDiscount}`);
                return false;
            }
        }
        return true;
    }, [cartItems, productDetailsMap, selectedItemsForOrder, loading, orderId]);

    useEffect(() => {
        if (!loading && orderId && cartItems.length > 0 && Object.keys(productDetailsMap).length > 0) {
            if (!arePricesAndDiscountsMatching) {
                showModal("Order details have changed. Please review again before confirmation");
            }
        }
    }, [arePricesAndDiscountsMatching, loading, orderId, cartItems.length, productDetailsMap, showModal]);

    const deleteEntireOrder = useCallback(async () => {
        showConfirmationModal(
            "Order Deletion",
            "There are no items left in this order. Do you want to delete the entire order?",
            async () => {
                setLoading(true);
                try {
                    const response = await fetch(`/api/orders/${orderId}`, {
                        method: 'DELETE',
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to delete order.');
                    }
                    showModal("Order successfully deleted. Redirecting to order list.", () => {
                        router.replace('/orders');
                    });
                } catch (err) {
                    console.error("Error deleting order:", err);
                    showModal(`Failed to delete order: ${err.message}`);
                } finally {
                    setLoading(false);
                }
            },
            () => { /* do nothing on cancel */ }
        );
    }, [orderId, router, showConfirmationModal, showModal]);

    const handleUpdateQuantity = useCallback(async (productId, newQuantity) => {
        if (newQuantity < 1) {
            showModal("Minimum quantity is 1.");
            return;
        }
        const updatedCart = cartItems.map(item =>
            item.productId === productId ? { ...item, quantity: newQuantity } : item
        );
        setCartItems(updatedCart);
        setSelectedItemsForOrder(prev => {
            const newSet = new Set(prev);
            newSet.delete(productId);
            return newSet;
        });
    }, [cartItems, showModal]);

    const handleRemoveItem = useCallback(async (productId) => {
        const updatedCart = cartItems.filter(item => item.productId !== productId);
        setSelectedItemsForOrder(prev => {
            const newSet = new Set(prev);
            newSet.delete(productId);
            return newSet;
        });

        if (updatedCart.length === 0) {
            setCartItems(updatedCart);
            deleteEntireOrder();
        } else {
            setCartItems(updatedCart);
            showModal("Selected item removed.");
        }
    }, [cartItems, deleteEntireOrder, showModal]);

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
            showModal("Please select items to delete.");
            return;
        }
        showConfirmationModal(
            "Delete Items",
            "Are you sure you want to delete the selected items from your cart?",
            () => {
            const updatedCart = cartItems.filter(item => !selectedItemsForOrder.has(item.productId));
            setSelectedItemsForOrder(new Set());

            if (updatedCart.length === 0) {
                setCartItems(updatedCart);
                deleteEntireOrder();
            } else {
                setCartItems(updatedCart);
                showModal("Selected items have been deleted.");
            }
            }
        );
    }, [cartItems, selectedItemsForOrder, showModal, showConfirmationModal, deleteEntireOrder]);

    const handleAddMessageForStep1 = async () => {
        if (!userMessage.trim() && !attachedFileForStep1) {
            showModal('Please enter a message or attach a file.');
            return;
        }

        let fileData = null;
        setLoading(true);

        if (attachedFileForStep1) {
            try {
                const getSignedUrlResponse = await fetch(`/api/s3-upload-url?filename=${attachedFileForStep1.name}&contentType=${attachedFileForStep1.type}`);
                if (!getSignedUrlResponse.ok) {
                    const errorData = await getSignedUrlResponse.json();
                    throw new Error(errorData.message || 'Failed to get S3 signed URL.');
                }
                const { url, fields } = await getSignedUrlResponse.json();

                const S3_BUCKET_NAME_PUBLIC = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'ums-shop-storage';
                const AWS_REGION_PUBLIC = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-southeast-2';
                const objectKey = fields.Key;
                const imageUrl = `https://${S3_BUCKET_NAME_PUBLIC}.s3.${AWS_REGION_PUBLIC}.amazonaws.com/${objectKey}`;

                const formData = new FormData();
                Object.entries(fields).forEach(([key, value]) => {
                    formData.append(key, value);
                });
                formData.append(fields.Key, attachedFileForStep1);

                const uploadFileToS3Response = await fetch(url, {
                    method: 'POST',
                    body: formData,
                });
                if (!uploadFileToS3Response.ok) throw new Error('Failed to upload file to S3.');

                fileData = { name: attachedFileForStep1.name, type: attachedFileForStep1.type, size: attachedFileForStep1.size, url: imageUrl };
            } catch (uploadError) {
                console.error("S3 upload error:", uploadError);
                showModal(`S3 upload error: ${uploadError.message}`);
                setLoading(false);
                return;
            }
        }

        const newMessage = {
            id: messagesForStep1.length > 0 ? Math.max(...messagesForStep1.map(m => m.id)) + 1 : 1,
            sender: 'User',
            timestamp: new Date().toISOString(),
            text: userMessage.trim(),
            imageUrl: fileData ? fileData.url : null,
        };
        const updatedMessagesLocally = [...messagesForStep1, newMessage];
        setMessagesForStep1(updatedMessagesLocally);

        setUserMessage('');
        setAttachedFileForStep1(null);
        setFilePreviewUrlForStep1(null);
        if (fileInputRefForStep1.current) {
            fileInputRefForStep1.current.value = '';
        }

        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updatedMessagesLocally, userId: user?.seq }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save message to database.');
            }
        } catch (err) {
            console.error("Error saving message:", err);
            setError(`Failed to send message: ${err.message}`);
            showModal(`An error occurred while sending the message: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleUserMessageChange = useCallback((e) => {
        const inputValue = e.target.value;
        const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;
        if (koreanRegex.test(inputValue)) {
            showModal('Only English letters are allowed.');
            setUserMessage(inputValue.replace(koreanRegex, ''));
        } else {
            setUserMessage(inputValue);
        }
    }, [showModal]);

    const handleSubmitOrderReview = async () => {
        if (selectedItemsForOrder.size === 0) {
            showModal("Please select at least one item to order.");
            return;
        }

        if (!arePricesAndDiscountsMatching) {
            showModal("Order details have changed. Please review again before confirmation");
            return;
        }

        let deliveryDetailsPayload = {};
        if (deliveryOption === 'onboard') {
            if (!portName.trim() || !expectedShippingDate) {
                showModal("Please enter Port Name and Expected Shipping Date.");
                return;
            }
            deliveryDetailsPayload = { option: deliveryOption, portName: portName.trim(), expectedShippingDate: expectedShippingDate };
        } else {
            if (!deliveryAddress.trim() || !postalCode.trim()) {
                showModal("Please enter delivery address and postal code.");
                return;
            }
            deliveryDetailsPayload = { option: deliveryOption, address: deliveryAddress.trim(), postalCode: postalCode.trim() };
        }

        setLoading(true);
        try {
            const itemsToOrder = cartItems.filter(item => selectedItemsForOrder.has(item.productId));
            const updatedOrderPayload = {
                userEmail: user.email,
                userName: user.name,
                customer: { email: user.email, name: user.name, phoneNumber: user.phoneNumber },
                shipInfo: { shipName: user.shipName, port: deliveryDetailsPayload.portName },
                shippingDetails: { method: deliveryOption, estimatedDelivery: deliveryDetailsPayload.expectedShippingDate, trackingNumber: orderDetail?.shippingDetails?.trackingNumber || null, actualDelivery: orderDetail?.shippingDetails?.actualDelivery || null },
                totalAmount: finalTotalPrice,
                subtotal: productPriceTotal,
                shippingFee: shippingFee,
                tax: 0,
                orderItems: itemsToOrder.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountedUnitPrice: item.unitPrice * (1 - (item.discount || 0) / 100),
                    discount: item.discount,
                    mainImage: item.mainImage,
                    sku: item.slug,
                    adminStatus: item.adminStatus || 'Pending Review',
                    adminQuantity: item.adminQuantity || item.quantity,
                })),
                deliveryDetails: deliveryDetailsPayload,
                messages: messagesForStep1,
                status: 'Payment(Request)',
                date: orderDetail?.date || new Date().toISOString(),
                statusHistory: [
                    ...(orderDetail?.statusHistory || []),
                    { timestamp: new Date().toISOString(), oldStatus: orderDetail?.status || null, newStatus: 'Payment(Request)', changedBy: 'User' }
                ],
            };

            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedOrderPayload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update order information');
            }

            const userUpdateResponse = await fetch(`/api/users/${user.seq}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart: [] }),
            });
            if (!userUpdateResponse.ok) {
                console.error('Failed to clear cart after order confirmation:', await userUpdateResponse.text());
            }

            showModal("Payment request has been submitted. Redirecting to the payment page.", () => {
                router.push(`/orders/payment/${orderId}`);
            });

        } catch (err) {
            console.error("Order confirmation error:", err);
            showModal(`Failed to confirm order: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = () => {
        showConfirmationModal(
            "Cancel Order",
            "Are you sure you want to cancel the order? (You will be redirected to the cart page)",
            () => { router.push('/cart'); },
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
                    <button onClick={() => router.back()} className={styles.iconButton}><BackIcon /></button>
                    <h1 className={styles.title}>Order in Review</h1>
                    <div style={{ width: '24px' }}></div>
                </header>
                <main className={styles.mainContent}>
                    <div className={`${styles.emptyMessage} ${styles.errorText}`}>Error: {error}</div>
                </main>
            </div>
        );
    }
    if (!isLoggedIn) return null;
    if (cartItems.length === 0 && !orderSuccessfullyPlaced) {
        return (
            <div className={styles.pageContainer}>
                <header className={styles.header}>
                    <button onClick={() => router.back()} className={styles.iconButton}><BackIcon /></button>
                    <h1 className={styles.title}>Order in Review</h1>
                    <div style={{ width: '24px' }}></div>
                </header>
                <main className={styles.mainContent}>
                    <div className={styles.emptyMessage}>
                        <p>No items in the cart.</p>
                        <button onClick={() => router.push('/home')} className={styles.shopNowButton}>Shop Now</button>
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
                                    showAdminDetails={true}
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
                    <div className={styles.messageDisplayArea}>
                        {messagesForStep1.length === 0 && !attachedFileForStep1 ? (
                            <p className={styles.emptyMessageText}>No messages have been created.</p>
                        ) : (
                            messagesForStep1.map((msg, index) => (
                                <div key={msg.id || index} className={`${styles.messageBubble} ${msg.sender === 'User' ? styles.user : styles.admin}`} data-sender={msg.sender}>
                                    {msg.text && <p className={styles.existingMessageText}>{msg.text}</p>}
                                    {msg.imageUrl && <img src={msg.imageUrl} alt="Attached Preview" className={styles.attachedImagePreview} />}
                                    <span className={styles.messageTimestamp}>{moment(msg.timestamp).format('YYYY-MM-DD HH:mm')}</span>
                                </div>
                            ))
                        )}
                        {attachedFileForStep1 && (
                            <div className={styles.draftImagePreviewContainer}>
                                <img src={filePreviewUrlForStep1} alt="Attachment Preview" className={styles.draftImagePreview} />
                                <div className={styles.draftImageDetails}>
                                    <button onClick={() => { setAttachedFileForStep1(null); setFilePreviewUrlForStep1(null); if (fileInputRefForStep1.current) fileInputRefForStep1.current.value = ''; }} className={styles.removeDraftImageButton}>x</button>
                                </div>
                            </div>
                        )}
                    </div>
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
                                        e.target.value = ''; return;
                                    }
                                    if (file.size > 5 * 1024 * 1024) {
                                        showModal('Image file size cannot exceed 5MB.');
                                        e.target.value = ''; return;
                                    }
                                    setAttachedFileForStep1(file);
                                    setFilePreviewUrlForStep1(URL.createObjectURL(file));
                                }
                            }}
                        />
                        <button type="button" onClick={() => fileInputRefForStep1.current.click()} className={styles.attachButton}><AttachIcon /></button>
                        <textarea
                            className={styles.messageInput}
                            placeholder={"Write a message"}
                            value={userMessage}
                            onChange={handleUserMessageChange}
                            rows="1"
                        ></textarea>
                        <button type="button" onClick={handleAddMessageForStep1} className={styles.sendMessageButton}><SendIcon /></button>
                    </div>
                </section>

                {/* Delivery Details Section */}
                <section className={styles.section}>
                    <h2>Delivery Details</h2>
                    <div className={styles.deliveryOptions}>
                        <label>
                            <input
                                type="radio" name="deliveryOption" value="onboard"
                                checked={deliveryOption === 'onboard'} onChange={(e) => setDeliveryOption(e.target.value)}
                            /> Onboard Delivery
                        </label>
                        <label>
                            <input
                                type="radio" name="deliveryOption" value="alternative"
                                checked={deliveryOption === 'alternative'} onChange={(e) => setDeliveryOption(e.target.value)}
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
                            <p className={styles.expectedShippingDateLabel}>Expected Shipping Date</p>
                            <div
                                className={styles.dateInputDisplay}
                                onClick={() => setIsDatePickerModalOpen(true)}
                            >
                                <span className={!expectedShippingDate ? styles.placeholder : ''}>
                                    {expectedShippingDate ? moment(expectedShippingDate).format('YYYY-MM-DD') : 'Expected Shipping Date'}
                                </span>
                                <img src="/images/Calendar3.png" alt="Calendar" className={styles.calendarIcon} />
                            </div>
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
                {orderDetail?.statusHistory && orderDetail?.statusHistory.length > 0 && orderDetail?.statusHistory.slice(-1)[0]?.newStatus === "Order(Confirmed)" ? (
                    <button
                        onClick={handleSubmitOrderReview}
                        className={styles.submitButton}
                        disabled={!arePricesAndDiscountsMatching || selectedItemsForOrder.size !== cartItems.length}
                    >
                        Send Order Confirmation
                    </button>
                ) : (
                    <button 
                        className={`${styles.submitButton} ${styles.disabled}`}
                        disabled={true}
                    >
                        Submit
                    </button>
                )}
            </footer>

            {/* [신규] Date Picker Modal 렌더링 */}
            <DatePickerModal
                isOpen={isDatePickerModalOpen}
                onClose={() => setIsDatePickerModalOpen(false)}
                onConfirm={(date) => {
                    setExpectedShippingDate(date);
                    setIsDatePickerModalOpen(false);
                }}
                initialDate={expectedShippingDate}
            />

            {/* GuideModal and other modals... */}
        </div>
    );
}