'use client';
import React from 'react';
import Image from 'next/image';
import styles from '../products.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';

// 채워진 하트 (위시리스트에 있을 때)
const HeartIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#E57373"/></svg>;

// 테두리 하트 (위시리스트에 없을 때)
const HeartOutlineIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#495057" strokeWidth="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;

export default function ProductCard({ product, onAddToCart }) {
  const { isLoggedIn } = useAuth();
  const { isProductInWishlist, toggleWishlist } = useWishlist();
  
  const isWishlisted = isProductInWishlist(product.id);
  const discountedPrice = product.price * (1 - (product.discount || 0) / 100);

  const handleAddToCartClick = (e) => {
    e.preventDefault();  // Link의 기본 동작(페이지 이동)을 막습니다.
    e.stopPropagation(); // 이벤트가 상위 요소로 전파되는 것을 막습니다.
    onAddToCart(product);
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <div className={styles.card}>
      <div className={styles.imageWrapper}>
        {/* 'alt' 속성 수정 및 'objectFit="cover"' 추가 */}
        <Image 
          src={product.image} 
          alt={product.name || 'Product Image'} 
          width={150} 
          height={150} 
          style={{ objectFit: 'cover' }} // 'objectFit' prop을 'style' 속성으로 이동
        />
        {isLoggedIn && (
          <button onClick={handleWishlistClick} className={styles.heartButton}>
            {isWishlisted ? <HeartIcon /> : <HeartOutlineIcon />}
          </button>
        )}
      </div>
      <div className={styles.info}>
        <h3 className={styles.productName}>{product.name}</h3>
          <div className={styles.priceContainer}>
            <span className={styles.discount}>{product.discount}%</span>
            <span className={styles.originalPrice}>${product.price.toFixed(2)}</span>
          </div>
        <p className={styles.finalPrice}>${discountedPrice.toFixed(2)}</p>
      </div>
      <button className={styles.addToCartButton} onClick={handleAddToCartClick}>
        Add to Cart
      </button>
    </div>
  );
}