// app/components/CartItem.jsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './CartItem.module.css'; // 새로운 CSS 모듈 임포트
import { useModal } from '@/contexts/ModalContext'; // 알림 모달 사용

export default function CartItem({ item, onUpdateQuantity, onRemoveItem }) {
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
      setErrorProduct(`Failed to load product information: ${err.message}`);
      showModal(`Failed to load cart item information: ${err.message}`);
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
            <div className={styles.quantityControl}>
                <button onClick={() => handleQuantityChange(-1)} disabled={item.quantity <= 1}>-</button>
                <span className={styles.itemQuantity}>{item.quantity}</span>
                <button onClick={() => handleQuantityChange(1)}>+</button>
            </div>
            <p className={styles.itemTotalPrice}>Subtotal: ${(itemTotalPrice).toFixed(2)}</p>
        </div>
    </div>
  );
}