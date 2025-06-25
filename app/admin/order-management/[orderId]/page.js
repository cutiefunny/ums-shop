// app/admin/order-management/[orderId]/page.js
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './order-detail.module.css'; // CSS Modules 임포트

// Mock 데이터 - 실제로는 API에서 orderId를 기반으로 데이터를 불러옵니다.
const MOCK_ORDER_DETAIL = {
  orderId: 'ORD-10001',
  customer: {
    name: 'John Smith',
    email: 'john@example.com',
    phoneNumber: '+1 555-123-4567',
    registrationDate: '2025-01-15'
  },
  shipInfo: {
    shipName: 'Ocean Explorer',
    port: 'Port: Miami Harbor'
  },
  shippingDetails: {
    method: 'Standard Shipping',
    estimatedDelivery: 'Jun 18, 2025',
    trackingNumber: 'TRK123456789',
    actualDelivery: 'Jun 16, 2025' // 이미지에 맞춰 날짜 변경
  },
  orderItems: [
    {
      productId: 'PROD-001',
      image: '/images/placeholder_product.png',
      name: 'Product NameProduct NameProduct Name',
      unitPrice: 10.00,
      quantity: 2,
      packingStatus: true,
      adminStatus: 'Available',
      adminQuantity: 2,
      isNewMessage: false,
    },
    {
      productId: 'PROD-002',
      image: '/images/placeholder_product.png',
      name: 'Another Product Name',
      unitPrice: 15.50,
      quantity: 1,
      packingStatus: false,
      adminStatus: 'Limited',
      adminQuantity: 1,
      isNewMessage: true,
    },
    {
      productId: 'PROD-003',
      image: '/images/placeholder_product.png',
      name: 'Third Product',
      unitPrice: 20.00,
      quantity: 3,
      packingStatus: true,
      adminStatus: 'Out of Stock',
      adminQuantity: 0,
      isNewMessage: false,
    },
  ],
  subtotal: 309.97, // Calculated from mock items for display consistency
  shippingFee: 15.00,
  tax: 0.00,
  totalAmount: 324.97, // Calculated from mock items for display consistency

  messages: [
    {
      id: 1,
      sender: 'Admin',
      text: 'Please deliver by April 25, 2025.',
      timestamp: '2025-04-20T10:00:00Z',
      isNew: false,
    },
    {
      id: 2,
      sender: 'User',
      text: 'Order confirmed. Tracking number will be updated soon.',
      timestamp: '2025-04-20T10:05:00Z',
      isNew: false,
    },
    {
      id: 3,
      sender: 'Admin', // Admin can send images
      text: '확인했습니다. 참고 이미지입니다.',
      imageUrl: '/images/sample_attachment.png', // 실제 이미지 경로
      timestamp: '2025-04-20T10:06:00Z',
      isNew: false,
    },
    {
      id: 4,
      sender: 'User',
      text: null, // Image only message from user
      imageUrl: '/images/sample_user_image.jpg',
      timestamp: '2025-04-20T10:08:00Z',
      isNew: false,
    },
    {
      id: 5,
      sender: 'Admin',
      text: '상품 중 일부 재고가 부족하여 대체 상품을 제안합니다. [NEW]', // NEW 뱃지 예시
      timestamp: '2025-06-25T09:00:00Z',
      isNew: true,
    }
  ],
  note: 'Special handling required for fragile items. Customer prefers early morning delivery.'
};

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

  // DynamoDB API 엔드포인트는 /api/orders/[orderId]가 될 것입니다.
  async function fetchOrderDetail() {
    try {
      setLoading(true);
      setError(null);
      // 실제 API 호출: await fetch(`/api/orders/${orderId}`);
      // Mock 데이터 사용
      setOrder({ ...MOCK_ORDER_DETAIL, orderId: orderId }); // URL의 orderId를 mock에 적용
    } catch (err) {
      console.error("Error fetching order detail:", err);
      setError(`Failed to load order details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

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
        alert('이미지 파일만 첨부할 수 있습니다.');
        setAttachedImage(null);
        e.target.value = ''; // 같은 파일 재선택을 위해 input 초기화
        return;
      }
      setAttachedImage(file);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageText.trim() && !attachedImage) {
      alert('메시지 내용을 입력하거나 이미지를 첨부해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    const newMessage = {
      id: order.messages.length + 1, // 임시 ID
      sender: 'Admin', // 관리자가 보내는 메시지
      text: newMessageText.trim() || null,
      imageUrl: null,
      timestamp: new Date().toISOString(),
      isNew: false, // 새로 보낸 메시지는 New 뱃지 없음
    };

    try {
      // 이미지 첨부 시 S3에 업로드
      if (attachedImage) {
        // 실제 S3 Presigned URL 요청 및 파일 업로드 로직
        // 예: const uploadResponse = await fetch('/api/s3-upload-url?filename=...');
        // const { url, fields } = await uploadResponse.json();
        // const formData = new FormData();
        // Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
        // formData.append('file', attachedImage);
        // await fetch(url, { method: 'POST', body: formData });
        // newMessage.imageUrl = `https://your-s3-bucket-url/${fields.key}`; // S3 URL 설정

        // Mock S3 URL
        newMessage.imageUrl = URL.createObjectURL(attachedImage); // 미리보기용 로컬 URL
      }

      // 실제 API 호출 (예: PUT /api/orders/[orderId]/messages)
      // 이 API는 주문의 메시지 배열에 새 메시지를 추가해야 합니다.
      // const response = await fetch(`/api/orders/${order.orderId}/messages`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newMessage),
      // });
      // if (!response.ok) {
      //   throw new Error('Failed to send message');
      // }

      // Mock 데이터 업데이트 (UI 즉시 반영)
      setOrder(prevOrder => ({
        ...prevOrder,
        messages: [...prevOrder.messages, newMessage],
      }));

      setNewMessageText('');
      setAttachedImage(null);
      fileInputRef.current.value = ''; // 파일 입력 필드 초기화
    } catch (err) {
      console.error("Error sending message:", err);
      setError(`Failed to send message: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    alert('Download 기능은 미구현입니다.');
    // TODO: 주문 정보를 PDF, Excel 등으로 다운로드하는 기능 구현
  };

  const handleSave = async () => {
    // 현재 OrderSummary, Message, Note 영역의 변경 사항을 DynamoDB에 저장
    // 이를 위해 /api/orders/[orderId] 에 PUT 요청을 보내야 합니다.
    alert('Save 기능은 미구현입니다. (Order Summary, Message, Note 저장)');
    console.log('Saving order data:', order);

    // TODO: 실제 API 호출
    /*
    try {
      const response = await fetch(`/api/orders/${order.orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order), // 전체 주문 객체 또는 변경된 필드만 전송
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save order data');
      }
      alert('Order saved successfully!');
    } catch (err) {
      console.error("Error saving order:", err);
      setError(`Failed to save order: ${err.message}`);
      alert(`Error saving order: ${err.message}`);
    }
    */
  };


  if (loading) {
    return <div className={styles.container}>Loading order details...</div>;
  }

  if (error) {
    return <div className={`${styles.container} ${styles.errorText}`}>Error: {error}</div>;
  }

  if (!order) {
    return <div className={styles.container}>Order not found.</div>;
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
            <span className={styles.infoValue}>{order.customer.name}</span>
            <span className={styles.infoSubValue}>{order.customer.email}</span>
            <span className={styles.infoSubValue}>{order.customer.phoneNumber}</span>
          </div>

          {/* Ship Information (Ocean Explorer, Port) */}
          <div className={styles.customerInfoBlock}>
            <span className={styles.infoBlockTitle}>Ship Information</span> {/* Added title */}
            <span className={styles.infoValue}>{order.shipInfo.shipName}</span>
            <span className={styles.infoSubValue}>{order.shipInfo.port}</span>
          </div>

          {/* Shipping Details (Method, Estimated, Tracking, Actual) */}
          <div className={styles.customerInfoBlock}>
            <span className={styles.infoBlockTitle}>Shipping Details</span> {/* Added title */}
            <div className={styles.customerInfoBlock2}>
              <div className={styles.customerInfoRow}>
                <span className={styles.infoSubValue}>Shipping Method:</span>
                <span className={styles.infoValue}>{order.shippingDetails.method}</span>
              </div>
              <div className={styles.customerInfoRow}>
                <span className={styles.infoSubValue}>Estimated Delivery:</span>
                <span className={styles.infoValue}>{order.shippingDetails.estimatedDelivery}</span>
              </div>
              <div className={styles.customerInfoRow}>
                <span className={styles.infoSubValue}>Tracking Number:</span>
                <span className={styles.infoValue}>{order.shippingDetails.trackingNumber}</span>
              </div>
              <div className={styles.customerInfoRow}>
                <span className={styles.infoSubValue}>Actual Delivery:</span>
                <span className={styles.infoValue}>{order.shippingDetails.actualDelivery}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 주문 상품 요약 (Order Summary), 메시지 영역, 배송 메모 영역을 묶는 컨테이너 */}
      <div className={styles.bottomSectionGroup}>
        {/* Order Summary Section */}
        <section className={`${styles.section} ${styles.orderSummarySection}`}>
          <h2 className={styles.sectionTitle}>Order Summary</h2>
          <div className={styles.orderSummaryGrid}>
            {order.orderItems.map(item => (
              <div key={item.productId} className={styles.orderItemCard}>
                <div className={styles.orderItemDetails}>
                  <Image src={item.image} alt={item.name} width={80} height={80} className={styles.orderItemImage} />
                  <div>
                    <div className={styles.productName}>{item.name}</div>
                    <div className={styles.unitPrice}>Unit Price: ${item.unitPrice.toFixed(2)}</div>
                    <div className={styles.quantity}>Quantity: {item.quantity}</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={item.packingStatus}
                  onChange={() => handleItemPackingChange(item.productId)}
                  className={styles.packingCheckbox}
                  title="Packing Status"
                />
                {item.isNewMessage && <span className={styles.newBadge}>[NEW]</span>}
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
              {order.messages.map(msg => (
                <div key={msg.id} className={`${styles.messageItem} ${msg.sender === 'Admin' ? styles.admin : styles.user}`}>
                  <span className={styles.messageSender}>
                    {msg.sender === 'Admin' ? '관리자' : '사용자'} {msg.isNew && <span className={styles.newBadge}>NEW</span>}
                  </span>
                  {msg.text && <div className={styles.messageBubble}>{msg.text}</div>}
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Attached" className={styles.messageImage} />
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className={styles.messageInputArea}>
              <input
                type="file"
                accept="image/jpeg, image/png, image/webp"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleImageChange}
              />
              <button onClick={handleImageAttachClick} className={styles.attachButton}>
                {/* 첨부 파일 아이콘 (SVG) */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 13.5l-3.24-3.24a2.82 2.82 0 0 0-3.96 0L2 17"></path>
                  <path d="M13 7H7a2 2 0 0 0-2 2v6"></path>
                </svg>
              </button>
              <input
                type="text"
                placeholder={attachedImage ? `Image attached: ${attachedImage.name}` : "메시지를 작성해주세요."}
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className={styles.messageInput}
                disabled={!!attachedImage}
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
            {order.note.length}/500
          </p>
        </section>
      </div> {/* bottomSectionGroup 끝 */}

      {/* Totals Section */}
        <div className={styles.totalsSection}> {/* 기존 totalsSection 스타일 재활용 */}
          <div className={styles.totalRow}>
            <span className={styles.infoSubValue}>Subtotal:</span> {/* New class for label */}
            <input
                type="text"
                value={`$${order.subtotal.toFixed(2)}`}
                readOnly
                className={styles.totalInput}
            />
          </div>
          <div className={styles.totalRow}>
            <span className={styles.infoSubValue}>Shipping Fee:</span> {/* New class for label */}
            <input
                type="text"
                value={`$${order.shippingFee.toFixed(2)}`}
                readOnly
                className={styles.totalInput}
            />
          </div>
          <div className={styles.totalRow}>
            <span className={styles.infoSubValue}>Tax:</span> {/* New class for label */}
            <input
                type="text"
                value={`$${order.tax.toFixed(2)}`}
                readOnly
                className={styles.totalInput}
            />
          </div>
          <div className={`${styles.totalRow} ${styles.finalTotalRow}`}> {/* New class for final total row */}
            <span className={styles.finalTotalDisplay}>${order.totalAmount.toFixed(2)}</span> {/* New class for display */}
          </div>
        </div>
        
      <div className={styles.bottomActions}>
        <div className={styles.actionButtonsGroup}> {/* Download and Save buttons group */}
            <button onClick={handleDownload} className={styles.downloadButton}>
              Download
            </button>
            <button onClick={handleSave} className={styles.saveButton}>
              Save
            </button>
        </div>
      </div>
    </div>
  );
}
