'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './wishlist.module.css';
import { useWishlist } from '@/contexts/WishlistContext';
import ProductCard from '../products/[slug]/components/ProductCard';
import AddToCartModal from '../products/detail/[slug]/components/AddToCartModal';
import { useModal } from '@/contexts/ModalContext';
import BottomNav from '../home/components/BottomNav';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;

export default function WishlistPage() {
  const router = useRouter();
  const { wishlistItems } = useWishlist();
  console.log('Wishlist Items:', wishlistItems);
  const { showModal } = useModal();
  const { user, isLoggedIn } = useAuth();

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [allProductsFromDb, setAllProductsFromDb] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState(null);

  const fetchAllProducts = useCallback(async () => {
    setLoadingProducts(true);
    setErrorProducts(null);
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAllProductsFromDb(data || []);
    } catch (err) {
      console.error("Error fetching all products for wishlist:", err);
      setErrorProducts(`상품 목록을 불러오는 데 실패했습니다: ${err.message}`);
      showModal(`상품 목록을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoadingProducts(false);
    }
  }, [showModal]);

  useEffect(() => {
    fetchAllProducts();
  }, [fetchAllProducts]);

  const wishlistedProducts = useMemo(() => {
    if (loadingProducts || !allProductsFromDb.length || !wishlistItems) return [];
    
    const wishlistedIds = new Set(wishlistItems);
    return allProductsFromDb.filter(product => wishlistedIds.has(product.productId));
  }, [wishlistItems, allProductsFromDb, loadingProducts]);

  const handleOpenCartModal = (product) => {
    setSelectedProduct(product);
    console.log("Selected Product for Cart Modal:", product);
    setIsCartModalOpen(true);
  };

  const handleConfirmAddToCart = async (productName, quantity) => {
    if (!isLoggedIn || !user?.seq) {
      showModal("장바구니에 상품을 추가하려면 로그인해야 합니다.");
      router.push('/');
      return;
    }

    const itemToAdd = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      quantity: quantity,
      unitPrice: selectedProduct.price,
      mainImage: selectedProduct.image,
    };

    try {
      const userResponse = await fetch(`/api/users/${user.seq}`);
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user cart data.');
      }
      const userData = await userResponse.json();
      const currentCart = userData.cart || [];

      const updatedCart = [...currentCart, itemToAdd];

      const response = await fetch(`/api/users/${user.seq}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: updatedCart }),
      });

      if (!response.ok) {
        throw new Error('Failed to add item to cart in DB.');
      }

      console.log(`장바구니에 추가될 상품 정보:`, itemToAdd);
      console.log(`사용자 (ID: ${user.seq})의 장바구니가 업데이트되었습니다.`);

      showModal(`${productName} 상품 ${quantity}개가 장바구니에 추가되었습니다!`);
      
    } catch (error) {
      console.error("장바구니에 상품 추가 실패:", error);
      showModal(`장바구니에 상품을 추가하지 못했습니다: ${error.message}`);
    }
  };

  // 'Shop Now' 버튼 클릭 핸들러
  const handleShopNowClick = () => {
    router.push('/home'); // 홈 페이지로 이동
  };

  if (loadingProducts) {
    return (
      <div className={styles.pageContainer}>
        <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      </div>
    );
  }

  if (errorProducts) {
    return (
      <div className={styles.pageContainer}>
        <div className={`${styles.emptyMessage} ${styles.errorText}`}>오류: {errorProducts}</div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.iconButton}>
          <BackIcon />
        </button>
        <h1 className={styles.title}>Wishlist</h1>
        <div style={{ width: '24px' }}></div>
      </header>
      
      <main className={styles.mainContent}>
        {wishlistedProducts.length > 0 ? (
          <div className={styles.productGrid}>
            {wishlistedProducts.map(product => (
              <Link href={`/products/detail/${product.slug || product.productId}`} key={product.productId} className={styles.productLink}>
                <ProductCard product={{
                    id: product.productId,
                    name: product.productName,
                    price: product.calculatedPriceUsd,
                    discount: product.discount || 0,
                    image: product.mainImage,
                    slug: product.sku,
                }} onAddToCart={handleOpenCartModal} />
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyMessage}>
            <p>Your Wishlist is Waiting.</p>
            <p>Tap <span style={{ color: '#E57373' }}>❤️</span> on what you like.</p>
            <button onClick={handleShopNowClick} className={styles.shopNowButton}>
              Shop Now
            </button>
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