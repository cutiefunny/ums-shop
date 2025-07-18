'use client';
import React from 'react';
import Image from 'next/image';
import styles from './ProductCard.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';

// 아이콘 컴포넌트들
const HeartIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#E57373"/></svg>;
const HeartOutlineIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#495057" strokeWidth="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;

export default function ProductCard({ product, onAddToCart }) {
  const { isLoggedIn } = useAuth();
  const { isProductInWishlist, toggleWishlist } = useWishlist();
  
  const isWishlisted = isProductInWishlist(product.id);
  const discountedPrice = product.price * (1 - product.discount / 100);

  const handleAddToCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart(product); // 상품 객체 전체를 전달
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  }

  return (
    <div className={styles.card}>
      <div className={styles.imageWrapper}>
        {/* 'alt' 속성에 'product.name'이 유효하지 않을 경우 'Product Image'를 사용하도록 수정 */}
        <Image src={product.image} 
          alt={product.name || 'Product Image'} 
          width={150} 
          height={150} 
          objectFit="cover" // 이미지가 잘리거나 늘어나지 않도록 cover 설정
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