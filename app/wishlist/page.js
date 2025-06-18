'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './wishlist.module.css';
import { useWishlist } from '@/contexts/WishlistContext';
import { mockProducts, devices, generals } from '@/data/mockData';
import ProductCard from '../products/[slug]/components/ProductCard';
import AddToCartModal from '../products/detail/[slug]/components/AddToCartModal';
import { useModal } from '@/contexts/ModalContext';
import BottomNav from '../home/components/BottomNav';
import Link from 'next/link';

// 모든 상품 데이터를 고유 ID를 가진 단일 배열로 합칩니다.
const allProducts = [...mockProducts, ...devices, ...generals];

// 아이콘 컴포넌트
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;

export default function WishlistPage() {
  const router = useRouter();
  const { wishlistItems } = useWishlist();
  console.log('Wishlist Items:', wishlistItems);
  const { showModal } = useModal();

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // WishlistProvider에서 제공하는 ID 배열(wishlistItems)을 기반으로
  // 전체 상품 목록(allProducts)에서 일치하는 상품 정보를 찾아냅니다.
  const wishlistedProducts = useMemo(() => {
    // Set을 사용해 ID 검색 성능을 최적화합니다.
    const wishlistedIds = new Set(wishlistItems);
    return allProducts.filter(product => wishlistedIds.has(product.id));
  }, [wishlistItems]);

  const handleOpenCartModal = (product) => {
    setSelectedProduct(product);
    setIsCartModalOpen(true);
  };

  const handleConfirmAddToCart = (productName, quantity) => {
    console.log(`${productName} ${quantity}개 장바구니에 추가`);
    showModal(`${productName} has been added to your cart.`);
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.iconButton}>
          <BackIcon />
        </button>
        <h1 className={styles.title}>Wishlist</h1>
        {/* 헤더 공간을 맞추기 위한 빈 div */}
        <div style={{ width: '24px' }}></div>
      </header>
      
      <main className={styles.mainContent}>
        {wishlistedProducts.length > 0 ? (
          <div className={styles.productGrid}>
            {wishlistedProducts.map(product => (
              <Link href={`/products/detail/${product.slug}`} key={product.id} className={styles.productLink}>
                <ProductCard product={product} onAddToCart={handleOpenCartModal} />
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyMessage}>
            <p>Your wishlist is empty.</p>
          </div>
        )}
      </main>

      {selectedProduct && (
        <AddToCartModal
          isOpen={isCartModalOpen}
          onClose={() => setIsCartModalOpen(false)}
          onConfirm={handleConfirmAddToCart}
          product={selectedProduct}
        />
      )}

      <BottomNav />
    </div>
  );
}