'use client';

import React, { useState, useMemo } from 'react';
import styles from './AddToCartModal.module.css';

export default function AddToCartModal({ product, isOpen, onClose, onConfirm }) {
  const [quantity, setQuantity] = useState(1);

  // 수량 변경 핸들러
  const handleQuantityChange = (amount) => {
    setQuantity(prev => Math.max(1, prev + amount)); // 최소 수량은 1
  };

  // 가격 계산
  const priceDetails = useMemo(() => {
    const productAmount = product.price * quantity;
    const discountAmount = (product.price * (product.discount / 100)) * quantity;
    const totalPrice = productAmount - discountAmount;
    return { productAmount, discountAmount, totalPrice };
  }, [product, quantity]);

  if (!isOpen) {
    return null;
  }

  const handleConfirmClick = () => {
    // 여기서 onConfirm을 호출하고, 현재 수량과 총액을 넘겨줄 수 있습니다.
    onConfirm(product.name, quantity);
    onClose(); // 모달 닫기
  }

  return (
    // 오버레이 클릭 시 모달이 닫히도록 설정
    <div className={styles.overlay} onClick={onClose}>
      {/* 모달 컨텐츠 클릭 시 이벤트 버블링 방지 */}
      <div className={styles.bottomSheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.quantitySelector}>
          <button onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1}>-</button>
          <input type="text" value={quantity} readOnly />
          <button onClick={() => handleQuantityChange(1)}>+</button>
        </div>

        <div className={styles.priceDetails}>
          <div className={styles.priceRow}>
            <span>Product amount</span>
            <span>${priceDetails.productAmount.toFixed(2)}</span>
          </div>
          <div className={styles.priceRow}>
            <span>Discount amount</span>
            <span className={styles.discountText}>-${priceDetails.discountAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className={styles.totalPrice}>
          <span>Total price</span>
          <span className={styles.totalPriceValue}>${priceDetails.totalPrice.toFixed(2)}</span>
        </div>

        <button className={styles.addToCartButton} onClick={handleConfirmClick}>
          Add to Cart
        </button>
      </div>
    </div>
  );
}