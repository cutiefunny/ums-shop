// app/admin/order-management/[orderId]/page.js
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './order-detail.module.css'; // CSS Modules 임포트

// 엑셀 다운로드 라이브러리 임포트 (xlsx 대신 exceljs 사용)
import ExcelJS from 'exceljs'; // exceljs 임포트
import { saveAs } from 'file-saver'; // file-saver는 계속 사용
import moment from 'moment'; // 날짜 형식을 위해 moment 사용

// DynamoDB 관련 import (클라이언트 컴포넌트에서 직접 접근)
// WARN: 클라이언트 컴포넌트에서 AWS 자격 증명을 직접 사용하는 것은 보안상 위험합니다.
// 프로덕션 환경에서는 반드시 Next.js API Routes를 통해 서버 사이드에서 통신하도록 리팩토링하세요.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { useAdminModal } from '@/contexts/AdminModalContext';

// DynamoDB 클라이언트 초기화
const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION, // .env.local 또는 .env.production에 설정
    credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
    },
});
const docClient = DynamoDBDocumentClient.from(client);

// DynamoDB 테이블 이름 (환경 변수에서 가져옴)
const ORDER_MANAGEMENT_TABLE_NAME = process.env.NEXT_PUBLIC_DYNAMODB_TABLE_ORDERS || 'order-management';


const ADMIN_STATUS_OPTIONS = ['Limited', 'Available', 'Alternative Offer', 'Out of Stock'];

export default function OrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { orderId } = params; // URL에서 orderId 값 가져오기

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newMessageText, setNewMessageText] = useState('');
    const [attachedImage, setAttachedImage] = useState(null); // 첨부 이미지 파일 객체
    const messagesEndRef = useRef(null); // 메시지 스크롤을 위한 Ref
    const fileInputRef = useRef(null); // 파일 입력 Ref

    const { showAdminNotificationModal, showAdminConfirmationModal } = useAdminModal();

    // API Route를 통해 주문 상세 데이터를 가져오는 함수
    async function fetchOrderDetail() {
        if (!orderId) return; // orderId가 없으면 호출하지 않음

        try {
            setLoading(true);
            setError(null);

            // Next.js API Route를 호출하여 주문 상세 데이터를 가져옵니다.
            const response = await fetch(`/api/orders/${orderId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch order data');
            }
            const data = await response.json();

            if (!data) { // API가 빈 데이터를 반환할 경우
                setError("Order not found.");
                setOrder(null);
            } else {
                // orderItems의 packingStatus에 기본값(false) 설정
                const processedOrderItems = data.orderItems?.map(item => ({
                    ...item,
                    packingStatus: item.packingStatus ?? false // packingStatus가 undefined 또는 null일 경우 false로 설정
                })) || [];
                setOrder({ ...data, orderItems: processedOrderItems }); // 조회된 항목으로 order 상태 업데이트
            }

        } catch (err) {
            console.error("Error fetching order detail:", err);
            setError(`Failed to load order details: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    // 컴포넌트 마운트 시 또는 orderId 변경 시 주문 데이터를 가져옵니다.
    useEffect(() => {
        fetchOrderDetail();
    }, [orderId]); // orderId가 변경될 때마다 데이터를 다시 불러옵니다.

    // 메시지 스크롤을 최하단으로
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [order?.messages]); // 메시지 목록이 업데이트될 때마다 스크롤

    const handleItemPackingChange = (productId) => {
        setOrder(prevOrder => ({
            ...prevOrder,
            orderItems: prevOrder.orderItems.map(item =>
                item.productId === productId ? { ...item, packingStatus: !item.packingStatus } : item
            ),
        }));
    };

    const handleAdminStatusChange = (productId, newStatus) => {
        setOrder(prevOrder => ({
            ...prevOrder,
            orderItems: prevOrder.orderItems.map(item =>
                item.productId === productId ? { ...item, adminStatus: newStatus } : item
            ),
        }));
    };

    const handleAdminQuantityChange = (productId, e) => {
        const value = parseInt(e.target.value);
        setOrder(prevOrder => ({
            ...prevOrder,
            orderItems: prevOrder.orderItems.map(item =>
                item.productId === productId ? { ...item, adminQuantity: isNaN(value) ? '' : value } : item
            ),
        }));
    };

    const handleNoteChange = (e) => {
        setOrder(prevOrder => ({
            ...prevOrder,
            note: e.target.value,
        }));
    };

    const handleImageAttachClick = () => {
        fileInputRef.current.click(); // 숨겨진 파일 입력 클릭
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // 파일 타입 유효성 검사
            if (!file.type.startsWith('image/')) {
                showAdminNotificationModal('이미지 파일만 첨부할 수 있습니다.');
                setAttachedImage(null);
                e.target.value = ''; // 같은 파일 재선택을 위해 input 초기화
                return;
            }
            setAttachedImage(file);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessageText.trim() && !attachedImage) {
            showAdminNotificationModal('메시지 내용을 입력하거나 이미지를 첨부해주세요.');
            return;
        }

        setLoading(true);
        setError(null);

        const currentMessages = order.messages || [];
        const newMessageId = currentMessages.length > 0 ? Math.max(...currentMessages.map(m => m.id)) + 1 : 1;

        const newMessage = {
            id: newMessageId,
            sender: 'Admin', // 관리자가 보내는 메시지
            text: newMessageText.trim() || null,
            imageUrl: null,
            timestamp: new Date().toISOString(),
            isNew: false, // 새로 보낸 메시지는 New 뱃지 없음
        };

        // 이미지 첨부 시 S3에 업로드 (실제 S3 API Route 구현 필요)
        if (attachedImage) {
            // 1. S3 Presigned URL 요청
            const s3UploadUrlResponse = await fetch(`/api/s3-upload-url?filename=${attachedImage.name}`);
            if (!s3UploadUrlResponse.ok) {
                const errorData = await s3UploadUrlResponse.json();
                throw new Error(errorData.message || 'Failed to get S3 upload URL');
            }
            const { url, fields } = await s3UploadUrlResponse.json();

            // 2. FormData 구성 (Presigned URL의 필드와 실제 파일 포함)
            const formData = new FormData();
            Object.entries(fields).forEach(([key, value]) => {
                formData.append(key, value);
            });
            formData.append('file', attachedImage); // 실제 파일 추가

            // 3. S3에 파일 업로드 (PUT 요청)
            const s3Response = await fetch(url, {
                method: 'POST', // Presigned POST URL이므로 POST 메서드 사용
                body: formData,
            });

            if (!s3Response.ok) {
                throw new Error('Failed to upload image to S3');
            }

            // S3 버킷의 퍼블릭 URL 구성 (또는 S3 Download URL API를 사용)
            // 여기서는 직접 URL을 구성합니다. S3 버킷 정책에 따라 접근 가능해야 합니다.
            // `fields.key`는 S3에 저장될 파일의 전체 경로입니다 (예: `uploads/uniqueFilename.jpg`).
            const s3BaseUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/`;
            newMessage.imageUrl = `${s3BaseUrl}${fields.key}`; // S3 URL로 업데이트
        }

        // 로컬 상태 먼저 업데이트하여 UI에 즉시 반영 (낙관적 업데이트)
        const updatedMessages = [...currentMessages, newMessage];
        setOrder(prevOrder => ({
            ...prevOrder,
            messages: updatedMessages,
            userId: prevOrder.userId,
        }));

        setNewMessageText('');
        setAttachedImage(null);
        if (fileInputRef.current) { // null 체크 추가
            fileInputRef.current.value = ''; // 파일 입력 필드 초기화
        }

        try {
            // DynamoDB에 메시지 추가 (API Route 호출)
            // 메시지 목록만 업데이트하므로, messages 필드만 전송
            const response = await fetch(`/api/orders/${order.orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updatedMessages, userId: order.userId }), // 업데이트된 messages 배열 전송
            });

            if (!response.ok) {
                const errorData = await response.json();
                // 오류 발생 시 로컬 상태를 이전으로 되돌릴 수 있음 (선택 사항)
                // setOrder(prevOrder => ({ ...prevOrder, messages: currentMessages }));
                throw new Error(errorData.message || 'Failed to send message and save order.');
            }

            console.log('Message sent and order updated successfully!');

        } catch (err) {
            console.error("Error sending message or saving order:", err);
            setError(`Failed to send message: ${err.message}`);
            showAdminNotificationModal(`Error sending message: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMessage = async (messageIdToDelete) => {
        if (!confirm('Are you sure you want to delete this message?')) {
            return;
        }

        setLoading(true);
        setError(null);

        const currentMessages = order.messages || [];
        const updatedMessages = currentMessages.filter(msg => msg.id !== messageIdToDelete);

        // 로컬 상태 먼저 업데이트 (낙관적 업데이트)
        setOrder(prevOrder => ({
            ...prevOrder,
            messages: updatedMessages,
        }));

        try {
            // DynamoDB에 메시지 목록 업데이트 (API Route 호출)
            const response = await fetch(`/api/orders/${order.orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updatedMessages }), // 업데이트된 messages 배열 전송
            });

            if (!response.ok) {
                const errorData = await response.json();
                // 오류 발생 시 로컬 상태를 이전으로 되돌릴 수 있음 (선택 사항)
                // setOrder(prevOrder => ({ ...prevOrder, messages: currentMessages }));
                throw new Error(errorData.message || 'Failed to delete message.');
            }

            console.log(`Message ${messageIdToDelete} deleted and order updated successfully!`);
        } catch (err) {
            console.error("Error deleting message:", err);
            setError(`Failed to delete message: ${err.message}`);
            showAdminNotificationModal(`Error deleting message: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };


    const handleDownload = async () => { // async 추가
        if (!order) {
            showAdminNotificationModal('주문 정보가 없습니다.');
            return;
        }

        // 엑셀 워크북 생성
        const workbook = new ExcelJS.Workbook(); // ExcelJS.Workbook 인스턴스 생성

        // 1. 주문 전체 정보 시트 (상단 요약 정보)
        const orderInfoSheet = workbook.addWorksheet('Order Summary');
        const orderInfoData = [
            ['Order ID:', order.orderId],
            ['Date:', order.date],
            ['Customer Name:', order.customer?.name],
            ['Customer Email:', order.customer?.email],
            ['Ship Name:', order.shipInfo?.shipName],
            ['Shipping Method:', order.shippingDetails?.method],
            ['Tracking Number:', order.shippingDetails?.trackingNumber],
            ['Estimated Delivery:', order.shippingDetails?.estimatedDelivery],
            ['Actual Delivery:', order.shippingDetails?.actualDelivery],
            [], // 빈 줄
            ['Overall Totals'],
            ['Subtotal:', `$${order.subtotal?.toFixed(2)}`],
            ['Shipping Fee:', `$${order.shippingFee?.toFixed(2)}`],
            ['Tax:', `$${order.tax?.toFixed(2)}`],
            ['Grand Total:', `$${order.totalAmount?.toFixed(2)}`]
        ];
        orderInfoData.forEach(row => {
            orderInfoSheet.addRow(row);
        });

        // 2. 개별 상품 목록 시트
        const productSheet = workbook.addWorksheet('Order Items');
        const productHeaders = ['순서', '코드넘버', '상품명', '주문 수량', '개별 금액', '총액'];
        productSheet.addRow(productHeaders); // 헤더 추가

        const productData = order.orderItems?.map((item, index) => [
            index + 1,
            item.productId,
            item.name,
            item.quantity,
            parseFloat(item.unitPrice?.toFixed(2)), // Excel에서 숫자로 인식하도록 변환
            parseFloat((item.unitPrice * item.quantity)?.toFixed(2)) // Excel에서 숫자로 인식하도록 변환
        ]);

        (productData || []).forEach(row => {
            productSheet.addRow(row);
        });

        // 엑셀 파일 저장
        try {
            const buffer = await workbook.xlsx.writeBuffer(); // 비동기 작업
            const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(data, `Order_Detail_${order.orderId}.xlsx`);
            // showAdminNotificationModal('주문 정보 엑셀 파일 다운로드를 시작합니다.');
        } catch (excelError) {
            console.error("Error saving Excel file:", excelError);
            showAdminNotificationModal('엑셀 파일 생성 중 오류가 발생했습니다: ' + excelError.message);
        }
    };

    const handleSave = async () => {
        console.log('Saving order data:', order);

        setLoading(true);
        try {
            // DynamoDB에 업데이트할 속성들을 정의
            // 클라이언트에서 변경 가능한 필드들만 보냅니다. (예: orderItems, messages, note)
            const updatedFields = {
                orderItems: order.orderItems,
                messages: order.messages,
                note: order.note,
                // 필요하다면 shippingDetails의 trackingNumber, actualDelivery 등도 여기에 추가
                shippingDetails: order.shippingDetails // 전체 ShippingDetails 객체를 업데이트하는 경우
            };

            // Next.js API Route를 호출하여 서버에서 DynamoDB와 통신합니다.
            const response = await fetch(`/api/orders/${order.orderId}`, {
                method: 'PUT', // PUT 요청
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedFields), // 변경된 필드만 전송
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save order data');
            }

            console.log('Order saved successfully!');
            showAdminNotificationModal('Order data saved successfully!');
            // router.push('/admin/order-management'); // 저장 후 목록 페이지로 이동 (선택 사항)
        } catch (err) {
            console.error("Error saving order:", err);
            setError(`Failed to save order data: ${err.message}`);
            showAdminNotificationModal(`Error saving data: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleOrderConfirmation = async () => {
        showAdminConfirmationModal(
            "Packing Complete",
            "모든 상품의 Packing이 완료되었음을 확정하시겠습니까? 주문 상태가 'Packed'로 변경됩니다.",
            async () => {
                setLoading(true);
                try {
                    const updatedOrderItems = order.orderItems.map(item => ({
                        ...item,
                        packingStatus: true // 모든 상품의 packingStatus를 true로 변경
                    }));

                    const updatedStatusHistory = [
                        ...(order.statusHistory || []),
                        {
                            timestamp: new Date().toISOString(),
                            oldStatus: order.status,
                            newStatus: 'Packed', // 새로운 상태: Packed
                            changedBy: 'Admin',
                        }
                    ];

                    const updatedOrderData = {
                        orderItems: updatedOrderItems,
                        status: 'Packed', // 주문 전체 상태도 Packed로 변경
                        statusHistory: updatedStatusHistory,
                    };

                    const response = await fetch(`/api/orders/${order.orderId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedOrderData),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to update packing status.');
                    }

                    // 로컬 상태 업데이트
                    setOrder(prevOrder => ({
                        ...prevOrder,
                        orderItems: updatedOrderItems,
                        status: 'Packed',
                        statusHistory: updatedStatusHistory,
                    }));
                    showAdminNotificationModal('Packing status updated to "Packed" successfully!');
                } catch (err) {
                    console.error("Error updating packing status:", err);
                    showAdminNotificationModal(`Failed to update packing status: ${err.message}`);
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const handleSend = async () => {
        showAdminConfirmationModal(
            "Delivery Complete",
            "배송 완료를 확정하시겠습니까? 주문 상태가 'Delivered'로 변경되고 실제 배송일이 기록됩니다.",
            async () => {
                setLoading(true);
                try {
                    const updatedShippingDetails = {
                        ...order.shippingDetails,
                        actualDelivery: moment().format('YYYY-MM-DD'), // 오늘 날짜로 실제 배송일 기록
                    };

                    const updatedStatusHistory = [
                        ...(order.statusHistory || []),
                        {
                            timestamp: new Date().toISOString(),
                            oldStatus: order.status,
                            newStatus: 'Delivered', // 새로운 상태: Delivered
                            changedBy: 'Admin',
                        }
                    ];

                    const updatedOrderData = {
                        shippingDetails: updatedShippingDetails,
                        status: 'Delivered', // 주문 전체 상태도 Delivered로 변경
                        statusHistory: updatedStatusHistory,
                    };

                    const response = await fetch(`/api/orders/${order.orderId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedOrderData),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to update delivery status.');
                    }

                    // 로컬 상태 업데이트
                    setOrder(prevOrder => ({
                        ...prevOrder,
                        shippingDetails: updatedShippingDetails,
                        status: 'Delivered',
                        statusHistory: updatedStatusHistory,
                    }));
                    showAdminNotificationModal('Delivery status updated to "Delivered" successfully!');
                } catch (err) {
                    console.error("Error updating delivery status:", err);
                    showAdminNotificationModal(`Failed to update delivery status: ${err.message}`);
                } finally {
                    setLoading(false);
                }
            }
        );
    };


    if (loading) {
        return <div className={styles.container}>Loading order details...</div>;
    }

    if (error) {
        return <div className={`${styles.container} ${styles.errorText}`}>Error: {error}</div>;
    }

    if (!order) {
        // orderId는 있지만 항목이 없는 경우 (예: 404 Not Found)
        return <div className={styles.container}>Order not found. Check order ID in URL.</div>;
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <h1 className={styles.headerTitle}>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        {/* 뒤로가기 아이콘 (SVG) */}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    Customer Information
                </h1>
            </header>

            {/* 기본 정보 - 이미지와 같이 3단으로 구성 */}
            <section className={styles.section}>
                <div className={styles.customerInfoSummary}> {/* 새로운 컨테이너 */}
                    {/* Customer Information (John Smith, email, phone) */}
                    <div className={styles.customerInfoBlock}>
                        <span className={styles.infoBlockTitle}>Customer Information</span> {/* Added title */}
                        <span className={styles.infoValue}>{order.customer?.name}</span>
                        <span className={styles.infoSubValue}>{order.customer?.email}</span>
                        <span className={styles.infoSubValue}>{order.customer?.phoneNumber}</span>
                    </div>

                    {/* Ship Information (Ocean Explorer, Port) */}
                    <div className={styles.customerInfoBlock}>
                        <span className={styles.infoBlockTitle}>Ship Information</span> {/* Added title */}
                        <span className={styles.infoValue}>{order.shipInfo?.shipName}</span>
                        <span className={styles.infoSubValue}>{order.shipInfo?.port}</span>
                    </div>

                    {/* Shipping Details (Method, Estimated, Tracking, Actual) */}
                    <div className={styles.customerInfoBlock}>
                        <span className={styles.infoBlockTitle}>Shipping Details</span> {/* Added title */}
                        <div className={styles.customerInfoBlock2}>
                            <div className={styles.customerInfoRow}>
                                <span className={styles.infoSubValue}>Shipping Method:</span>
                                <span className={styles.infoValue}>{order.shippingDetails?.method}</span>
                            </div>
                            <div className={styles.customerInfoRow}>
                                <span className={styles.infoSubValue}>Estimated Delivery:</span>
                                <span className={styles.infoValue}>{order.shippingDetails?.estimatedDelivery}</span>
                            </div>
                            <div className={styles.customerInfoRow}>
                                <span className={styles.infoSubValue}>Tracking Number:</span>
                                <span className={styles.infoValue}>{order.shippingDetails?.trackingNumber}</span>
                            </div>
                            <div className={styles.customerInfoRow}>
                                <span className={styles.infoSubValue}>Actual Delivery:</span>
                                <span className={styles.infoValue}>{order.shippingDetails?.actualDelivery}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 주문 상품 요약 (Order Summary), 메시지 영역, 배송 메모 영역을 묶는 컨테이너 */}
            <div className={styles.bottomSectionGroup}> {/* 추가된 그룹 컨테이너 */}
                <section className={`${styles.section} ${styles.orderSummarySection}`}>
                    <h2 className={styles.sectionTitle}>Order Summary</h2>
                    <div className={styles.orderSummaryGrid}>
                        {order.orderItems?.map(item => ( // orderItems가 없을 경우를 대비하여 ?. 추가
                            <div key={item.productId} className={styles.orderItemCard}>
                                <div className={styles.orderItemDetails}>
                                    {item.mainImage && <Image src={item.mainImage} alt={item.name} width={80} height={80} className={styles.orderItemImage} />}
                                    <div>
                                        <div className={styles.productName}>{item.name}</div>
                                        <div className={styles.unitPrice}>Unit Price: ${item.discountedUnitPrice?.toFixed(2)}</div>
                                        <div className={styles.quantity}>Quantity: {item.quantity}</div>
                                    </div>
                                </div>
                                {/* Packing 상태 체크 */}
                                <input
                                    type="checkbox"
                                    checked={item.packingStatus}
                                    onChange={() => handleItemPackingChange(item.productId)}
                                    className={styles.packingCheckbox}
                                    title="Packing Status"
                                />
                                {item.isNewMessage && <span className={styles.newBadge}>[NEW]</span>} {/* NEW 뱃지 */}
                                {/* 관리자 입력 필드 */}
                                <div className={styles.adminControls}>
                                    <select
                                        value={item.adminStatus}
                                        onChange={(e) => handleAdminStatusChange(item.productId, e.target.value)}
                                        className={styles.adminStatusSelect}
                                    >
                                        {ADMIN_STATUS_OPTIONS.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        value={item.adminQuantity}
                                        onChange={(e) => handleAdminQuantityChange(item.productId, e)}
                                        className={styles.adminQuantityInput}
                                        min="0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Totals - Moved to bottomActions */}
                    {/* <div className={styles.totalsSection}>...</div> */}
                </section>

                {/* 메시지 영역 */}
                <section className={`${styles.section} ${styles.messageSection}`}>
                    <h2 className={styles.sectionTitle}>MESSAGE</h2>
                    <div className={styles.messageArea}>
                        <div className={styles.messageThread}>
                            {order.messages?.map(msg => ( // messages가 없을 경우를 대비하여 ?. 추가
                                <div key={msg.id} className={`${styles.messageItem} ${msg.sender === 'Admin' ? styles.admin : styles.user}`}>
                                    {/* 삭제 아이콘 (사용자 요청에 따라 제거됨) */}
                                    {/* <button onClick={() => handleDeleteMessage(msg.id)} className={styles.deleteMessageButton}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button> */}
                                    <span className={styles.messageSender}>
                                        {/* 발신자 텍스트 '관리자' 제거 (단순히 sender 표시) */}
                                        {msg.sender} {msg.isNew && <span className={styles.newBadge}>NEW</span>}
                                    </span>
                                    {msg.text && <div className={styles.messageBubble}>{msg.text}</div>}
                                    {msg.imageUrl && (
                                        <img src={msg.imageUrl} alt="Attached" className={styles.messageImage} />
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} /> {/* 메시지 하단으로 자동 스크롤을 위한 엘리먼트 */}
                        </div>
                        <div className={styles.messageInputArea}>
                            <input
                                type="file"
                                accept="image/jpeg, image/png, image/webp"
                                ref={fileInputRef}
                                style={{ display: 'none' }} // 숨김
                                onChange={handleImageChange}
                            />
                            <button onClick={handleImageAttachClick} className={styles.attachButton}>
                                <img src="/images/imageBox.png" alt="Attach" />
                            </button>
                            <input
                                type="text"
                                placeholder={attachedImage ? `Image attached: ${attachedImage.name}` : "메시지를 작성해주세요."}
                                value={newMessageText}
                                onChange={(e) => setNewMessageText(e.target.value)}
                                className={styles.messageInput}
                                disabled={!!attachedImage} // 이미지가 첨부되면 텍스트 입력 비활성화
                            />
                            <button onClick={handleSendMessage} className={styles.sendButton}>
                                전송
                            </button>
                        </div>
                        {attachedImage && (
                            <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderTop: '1px solid #ddd' }}>
                                <p style={{ margin: '0', fontSize: '0.85rem' }}>첨부 이미지: {attachedImage.name}
                                    <button onClick={() => setAttachedImage(null)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', marginLeft: '10px' }}>x</button>
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* 배송 메모 영역 (NOTE) */}
                <section className={`${styles.section} ${styles.noteSection}`}>
                    <h2 className={styles.sectionTitle}>NOTE</h2>
                    <textarea
                        value={order.note}
                        onChange={handleNoteChange}
                        maxLength={500}
                        placeholder="최대 500자까지 입력 가능합니다."
                        className={styles.noteArea}
                    />
                    <p style={{ textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>
                        {order.note ? order.note.length : 0}/500 {/* order.note가 undefined일 경우 0으로 표시 */}
                    </p>
                </section>
            </div> {/* bottomSectionGroup 끝 */}

            {/* 하단 액션 버튼들 - Totals Section이 이 안으로 들어옴 */}
            <div className={styles.bottomActions}>
                {/* Totals Section */}
                <div className={styles.totalsSection}> {/* 기존 totalsSection 스타일 재활용 */}
                    <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Subtotal:</span>
                        <input
                            type="text"
                            value={`$${order.subtotal?.toFixed(2)}`} // total 값 안전하게 접근
                            readOnly
                            className={styles.totalInput}
                        />
                    </div>
                    <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Shipping Fee:</span>
                        <input
                            type="text"
                            value={`$${order.shippingFee?.toFixed(2)}`} // shippingFee 값 안전하게 접근
                            readOnly
                            className={styles.totalInput}
                        />
                    </div>
                    <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Tax:</span>
                        <input
                            type="text"
                            value={`$${order.tax?.toFixed(2)}`} // tax 값 안전하게 접근
                            readOnly
                            className={styles.totalInput}
                        />
                    </div>
                    <div className={`${styles.totalRow} ${styles.finalTotalRow}`}>
                        <span className={styles.totalLabel}>Total:</span> {/* "Total:" 라벨 추가 */}
                        <span className={styles.finalTotalDisplay}>${order.totalAmount?.toFixed(2)}</span> {/* totalAmount 값 안전하게 접근 */}
                    </div>
                </div>

                <div className={styles.ButtonGroupContainer}> {/* Download and Save buttons group */}
                  <div className={styles.actionButtonsGroup}> {/* Download and Save buttons group */}
                      <button onClick={handleSave} className={styles.saveButton}>
                          Save
                      </button>
                      <button onClick={handleSend} className={styles.saveButton}>
                          Send
                      </button>
                  </div>
                  <div className={styles.actionButtonsGroup}> {/* Download and Save buttons group */}
                      <button onClick={handleDownload} className={styles.saveButton}>
                          Download
                      </button>
                      <button onClick={handleOrderConfirmation} className={styles.saveButton}>
                          Order Confirmation
                      </button>
                  </div>
                </div>
            </div>
        </div>
    );
}