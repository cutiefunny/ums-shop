'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ProductCardOrderDetail.module.css'; // 새로운 CSS 모듈 임포트
import { useModal } from '@/contexts/ModalContext'; // 알림 모달 사용

export default function ProductCardOrderDetail({ item, onUpdateQuantity, onRemoveItem }) {
  const { showModal } = useModal();
  const [productDetails, setProductDetails] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [errorProduct, setErrorProduct] = useState(null);

  // 상품 상세 정보를 DynamoDB에서 가져오는 함수
  const fetchProductDetails = useCallback(async () => {
    if (!item?.productId) {
      setLoadingProduct(false);
      return;
    }
    setLoadingProduct(true);
    setErrorProduct(null);
    try {
      // item.productId를 사용하여 상품 상세 정보를 가져옵니다.
      const response = await fetch(`/api/products/${item.productId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProductDetails(data);
    } catch (err) {
      console.error(`Error fetching product details for ${item.productId}:`, err);
      setErrorProduct(`상품 정보를 불러오는 데 실패했습니다: ${err.message}`);
      showModal(`장바구니 상품 정보를 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoadingProduct(false);
    }
  }, [item?.productId, showModal]);

  useEffect(() => {
    fetchProductDetails();
  }, [fetchProductDetails]);

  const handleQuantityChange = (amount) => {
    onUpdateQuantity(item.productId, item.quantity + amount);
  };

  const handleRemoveClick = () => {
    onRemoveItem(item.productId);
  };

  // productLink는 item.slug를 우선 사용하고, 없으면 item.productId를 사용 (SKU로 가정)
  const productLink = `/products/detail/${item.slug || item.productId}`;

  // 할인율 및 가격 계산
  const originalUnitPrice = item.unitPrice || 0; // 장바구니에 저장된 단가 (할인 전)
  const discountPercentage = productDetails?.discount || 0;
  const discountedUnitPrice = originalUnitPrice * (1 - discountPercentage / 100);
  const itemTotalPrice = discountedUnitPrice * (item.quantity || 0);

  if (loadingProduct) {
    return (
      <div className={styles.cartItemCard}>
        <div className={styles.loadingOverlay}>Loading product details...</div>
      </div>
    );
  }

  if (errorProduct) {
    return (
      <div className={styles.cartItemCard}>
        <div className={styles.errorOverlay}>Error: {errorProduct}</div>
      </div>
    );
  }

  // adminStatus에 따른 수량/대체 상품 정보 표시
  const displayQuantityOrAlternative = () => {
    if (item.adminStatus === 'Alternative Offer') {
      return (
        <Link href={`/products/detail/${item.alternativeOffer}`} className={styles.alternativeOfferLink}>
          <span className={styles.alternativeOfferText}>
            {item.alternativeOffer || 'N/A'}
          </span>
        </Link>
      );
    } else if (item.adminStatus !== 'Out of Stock') {
      return (
        <span>
          {item.adminStatus === 'Limited' ? (
            `max ${item.adminQuantity || 'N/A'}`
          ) : (
            `${item.adminQuantity || 'N/A'}`
          )}
        </span>
      );
    }
    return null; // Out of Stock일 경우 표시하지 않음
  };

  return (
    <div className={styles.cartItemCard}>
        <div className={styles.itemImageContainer}>
            <Link href={productLink} passHref className={styles.itemImageLink}>
                <Image
                src={item.mainImage}
                alt={item.name}
                width={80}
                height={80}
                style={{ objectFit: 'cover' }} // Image 컴포넌트 스타일 적용
                />
            </Link>
            
            <div className={styles.itemDetails}>
                <Link href={productLink} passHref className={styles.itemNameLink}>
                <h3 className={styles.itemName}>{item.name}</h3>
                </Link>
                
                    <p className={styles.itemOriginalPrice}>${originalUnitPrice.toFixed(2)}</p>
                    <p className={styles.itemDiscountedPrice}>
                    <span className={styles.discountBadge}>{discountPercentage}%</span>
                    ${discountedUnitPrice.toFixed(2)}
                    </p>
            </div>

            <button onClick={handleRemoveClick} className={styles.removeButton}>&times;</button>
            
        </div>
        
        <div className={styles.quantityPriceContainer}>
            {item.adminStatus !== 'Out of Stock' && (
                <div className={styles.quantityControl}>
                    <button onClick={() => handleQuantityChange(-1)} disabled={item.quantity <= 1}>-</button>
                    <span className={styles.itemQuantity}>{item.quantity}</span>
                    <button onClick={() => handleQuantityChange(1)} disabled={item.adminQuantity === item.quantity}>+</button>
                </div>
            )}
            <p className={styles.itemTotalPrice}>Subtotal: ${(itemTotalPrice).toFixed(2)}</p>
        </div>

        <div className={`${styles.adminFeedbackDisplay} ${styles[item.adminStatus.replace(/\s+/g, '')]}`}>
            <span>
              {item.adminStatus === 'Limited' && (
              <>
                <img src="/images/caution.png" alt="Limited" className={styles.limitedIcon} />
              </>
            )}
              {item.adminStatus || 'N/A'}
            </span>
            {displayQuantityOrAlternative()} {/* 새로운 함수 호출 */}
        </div>
    </div>
  );
}