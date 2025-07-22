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
                        };
                    }
                    const productData = await productResponse.json();
                    return {
                        productId: item.productId,
                        calculatedPriceUsd: productData.calculatedPriceUsd,
                        discount: productData.discount || 0,
                    };
                } catch (productFetchError) {
                    console.error(`Error fetching product ${item.productId} details:`, productFetchError);
                    // 네트워크 오류 등 발생 시 주문 시점의 가격 정보로 대체
                    return {
                        productId: item.productId,
                        calculatedPriceUsd: item.unitPrice,
                        discount: item.discount || 0,
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
        // 로딩 중이거나 데이터가 없거나, 상품 디테일 맵이 아직 채워지지 않았다면 비교 불가능
        if (loading || !orderId || cartItems.length === 0 || Object.keys(productDetailsMap).length === 0) {
            return false;
        }

        // 선택된 모든 상품에 대해 가격 및 할인율 비교
        for (const item of cartItems) {
            // 선택되지 않은 상품은 비교 대상에서 제외
            if (!selectedItemsForOrder.has(item.productId)) {
                continue;
            }

            const productDetails = productDetailsMap[item.productId];

            // 특정 상품의 최신 정보가 없는 경우, 불일치로 간주
            if (!productDetails) {
                console.warn(`Product details not found in map for item ${item.productId}. Assuming mismatch.`);
                return false;
            }

            // 주문 시점의 가격 및 할인율
            const orderedUnitPrice = parseFloat(item.unitPrice?.toFixed(2));
            const orderedDiscount = parseFloat((item.discount || 0)?.toFixed(2));

            // 현재 상품의 가격 및 할인율 (API에서 가져온 최신 정보)
            const currentUnitPrice = parseFloat(productDetails.calculatedPriceUsd?.toFixed(2));
            const currentDiscount = parseFloat((productDetails.discount || 0)?.toFixed(2));

            // 가격 또는 할인율이 일치하지 않으면 false 반환
            if (orderedUnitPrice !== currentUnitPrice || orderedDiscount !== currentDiscount) {
                console.log(`Mismatch detected for item ${item.productId}:`);
                console.log(`  Ordered: Price=${orderedUnitPrice}, Discount=${orderedDiscount}`);
                console.log(`  Current: Price=${currentUnitPrice}, Discount=${currentDiscount}`);
                return false;
            }
        }
        return true; // 모든 선택된 상품이 일치
    }, [cartItems, productDetailsMap, selectedItemsForOrder, loading, orderId]); // 의존성 추가


    // 페이지 로드 시 가격 불일치 모달 발생
    useEffect(() => {
        // 로딩이 완료되고 (loading이 false), orderId가 존재하며,
        // cartItems와 productDetailsMap이 비어있지 않고,
        // arePricesAndDiscountsMatching의 계산이 의미를 가질 때 실행
        // 즉, 데이터 로드가 모두 끝나고 나서야 유효한 비교를 수행
        if (!loading && orderId && cartItems.length > 0 && Object.keys(productDetailsMap).length > 0) {
            if (!arePricesAndDiscountsMatching) {
                showModal("Order details have changed. Please review again before confirmation");
            }
        }
    }, [arePricesAndDiscountsMatching, loading, orderId, cartItems.length, productDetailsMap, showModal]);

    // 새롭게 추가된 함수: 전체 주문을 삭제하는 로직
    const deleteEntireOrder = useCallback(async () => {
        showConfirmationModal(
            "Order Deletion",
            "There are no items left in this order. Do you want to delete the entire order?",
            async () => {
                setLoading(true);
                try {
                    const response = await fetch(`/api/orders/${orderId}`, {
                        method: 'DELETE', // DELETE 요청으로 전체 주문 삭제
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to delete order.');
                    }

                    showModal("Order successfully deleted. Redirecting to order list.", () => {
                        router.replace('/orders'); // router.push 대신 router.replace 사용
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
        // 제품 수량이 변경되면 해당 제품의 체크박스를 해제합니다.
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
            setCartItems(updatedCart); // 로컬 상태 먼저 업데이트
            deleteEntireOrder(); // 전체 주문 삭제 트리거
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
            showModal("삭제할 상품을 선택해주세요.");
            return;
        }
        showConfirmationModal(
            "상품 삭제",
            "선택된 상품들을 장바구니에서 삭제하시겠습니까?",
            () => {
                const updatedCart = cartItems.filter(item => !selectedItemsForOrder.has(item.productId));
                setSelectedItemsForOrder(new Set()); // 선택 초기화

                if (updatedCart.length === 0) {
                    setCartItems(updatedCart); // 로컬 상태 먼저 업데이트
                    deleteEntireOrder(); // 전체 주문 삭제 트리거
                } else {
                    setCartItems(updatedCart);
                    showModal("선택된 상품이 삭제되었습니다.");
                }
            }
        );
    }, [cartItems, selectedItemsForOrder, showModal, showConfirmationModal, deleteEntireOrder]); // deleteEntireOrder 의존성 추가

    // Step 1에서 메시지를 추가하는 함수
    const handleAddMessageForStep1 = async () => {
        if (!userMessage.trim() && !attachedFileForStep1) {
            showModal('메시지 내용 또는 첨부 파일을 입력해주세요.');
            return;
        }

        let fileData = null;
        setLoading(true); // Start loading state for message sending

        // S3 upload logic
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

                if (!uploadFileToS3Response.ok) {
                    throw new Error('Failed to upload file to S3.');
                }

                fileData = {
                    name: attachedFileForStep1.name,
                    type: attachedFileForStep1.type,
                    size: attachedFileForStep1.size,
                    url: imageUrl,
                };

            } catch (uploadError) {
                console.error("S3 upload error:", uploadError);
                showModal(`파일 업로드 실패: ${uploadError.message}`);
                setLoading(false); // Stop loading on error
                return;
            }
        }

        // Prepare the new message
        const newMessage = {
            id: messagesForStep1.length > 0 ? Math.max(...messagesForStep1.map(m => m.id)) + 1 : 1,
            sender: 'User',
            timestamp: new Date().toISOString(),
            text: userMessage.trim(),
            imageUrl: fileData ? fileData.url : null,
        };

        // Optimistically update local state
        const updatedMessagesLocally = [...messagesForStep1, newMessage];
        setMessagesForStep1(updatedMessagesLocally);

        // Clear input fields immediately
        setUserMessage('');
        setAttachedFileForStep1(null);
        setFilePreviewUrlForStep1(null);
        if (fileInputRefForStep1.current) {
            fileInputRefForStep1.current.value = '';
        }

        try {
            // Send the entire updated messages array to DynamoDB
            console.log('userId:', user?.seq, 'orderId:', orderId, 'messages:', updatedMessagesLocally);
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updatedMessagesLocally, userId: user?.seq }), // Send updated messages array
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save message to database.');
            }
            console.log('Message saved to DynamoDB successfully2!');

        } catch (err) {
            console.error("Error saving message:", err);
            setError(`Failed to send message: ${err.message}`);
            showModal(`메시지 전송 중 오류가 발생했습니다: ${err.message}`);
            // Optionally, revert local state if save fails:
            // setMessagesForStep1(messagesForStep1); // Revert to previous state
        } finally {
            setLoading(false); // Stop loading after save attempt
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

        // 가격 및 할인율 불일치 시 모달 띄우기
        if (!arePricesAndDiscountsMatching) {
            showModal("Order details have changed. Please review again before confirmation");
            return; // 제출 중단
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
            const itemsToOrder = cartItems.filter(item => selectedItemsForOrder.has(item.productId));

            // Prepare the updated order payload
            const updatedOrderPayload = {
                userEmail: user.email,
                userName: user.name,
                customer: {
                    email: user.email,
                    name: user.name,
                    phoneNumber: user.phoneNumber // Assuming user.phoneNumber is available from AuthContext
                },
                shipInfo: {
                    shipName: user.shipName, // Assuming user.shipName is available from AuthContext
                    port: deliveryDetailsPayload.portName,
                },
                shippingDetails: {
                    method: deliveryOption,
                    estimatedDelivery: deliveryDetailsPayload.expectedShippingDate,
                    trackingNumber: orderDetail?.shippingDetails?.trackingNumber || null, // Preserve existing
                    actualDelivery: orderDetail?.shippingDetails?.actualDelivery || null, // Preserve existing
                },
                totalAmount: finalTotalPrice, // Recalculated total
                subtotal: productPriceTotal,
                shippingFee: shippingFee,
                tax: 0, // Assuming tax is always 0 based on current code
                orderItems: itemsToOrder.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountedUnitPrice: item.unitPrice * (1 - (item.discount || 0) / 100),
                    discount: item.discount,
                    mainImage: item.mainImage,
                    sku: item.slug,
                    adminStatus: item.adminStatus || 'Pending Review', // Preserve or default
                    adminQuantity: item.adminQuantity || item.quantity, // Preserve or default
                })),
                deliveryDetails: deliveryDetailsPayload,
                messages: messagesForStep1, // Include all messages
                status: 'Order', // Change status to 'Confirmed'
                date: orderDetail?.date || new Date().toISOString(), // Preserve original order date
                statusHistory: [
                    ...(orderDetail?.statusHistory || []), // Keep existing history
                    {
                        timestamp: new Date().toISOString(),
                        oldStatus: orderDetail?.status || null,
                        newStatus: 'Order(Confirmed)', // Reflect the new status
                        changedBy: 'User',
                    }
                ],
            };

            // Send PUT request to update the order
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT', // Change to PUT
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedOrderPayload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '주문 정보 업데이트 실패');
            }

            // After successful update, clear cart (if applicable)
            // This assumes that after order confirmation, items from the cart are "moved" to the order.
            const userUpdateResponse = await fetch(`/api/users/${user.seq}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart: [] }),
            });
            if (!userUpdateResponse.ok) {
                console.error('Failed to clear cart after order confirmation:', await userUpdateResponse.text());
            }

            // Redirect to the new payment page
            showModal("주문이 성공적으로 확정되었습니다. 결제 페이지로 이동합니다.", () => {
                router.push(`/orders/payment/${orderId}`); // Redirect to the new payment page
            });

        } catch (err) {
            console.error("Order confirmation error:", err);
            showModal(`주문 확정에 실패했습니다: ${err.message}`);
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
                                    showAdminDetails={true} // showAdminDetails prop 추가
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
                                <div key={msg.id || index} className={`${styles.messageBubble} ${msg.sender === 'User' ? styles.user : styles.admin}`} data-sender={msg.sender}>
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
                    <button
                        onClick={handleSubmitOrderReview}
                        className={styles.submitButton}
                        disabled={!arePricesAndDiscountsMatching || selectedItemsForOrder.size !== cartItems.length}
                    >
                        Send Order Confirmation
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