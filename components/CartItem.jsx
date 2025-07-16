// app/components/CartItem.jsx
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './CartItem.module.css'; // 새로운 CSS 모듈 임포트

export default function CartItem({ item, onUpdateQuantity, onRemoveItem }) {
  const handleQuantityChange = (amount) => {
    onUpdateQuantity(item.productId, item.quantity + amount);
  };

  const handleRemoveClick = () => {
    onRemoveItem(item.productId);
  };

  const productLink = `/products/detail/${item.slug || item.productId}`;

  // 항목별 총 가격 계산
  const itemTotalPrice = (item.unitPrice || 0) * (item.quantity || 0);

  return (
    <div className={styles.cartItemCard}>
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
        <p className={styles.itemUnitPrice}>${(item.unitPrice || 0).toFixed(2)} / pc</p>
        
        <div className={styles.quantityControl}>
          <button onClick={() => handleQuantityChange(-1)} disabled={item.quantity <= 1}>-</button>
          <span className={styles.itemQuantity}>{item.quantity}</span>
          <button onClick={() => handleQuantityChange(1)}>+</button>
        </div>
        <p className={styles.itemTotalPrice}>Total: ${(itemTotalPrice).toFixed(2)}</p>
      </div>

      <button onClick={handleRemoveClick} className={styles.removeButton}>&times;</button>
    </div>
  );
}