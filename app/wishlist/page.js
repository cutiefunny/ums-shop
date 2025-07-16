'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './wishlist.module.css';
import { useWishlist } from '@/contexts/WishlistContext';
// 더 이상 mock data에서 상품을 가져오지 않습니다.
// import { mockProducts, devices, generals } from '@/data/mockData';
import ProductCard from '../products/[slug]/components/ProductCard';
import AddToCartModal from '../products/detail/[slug]/components/AddToCartModal';
import { useModal } from '@/contexts/ModalContext';
import BottomNav from '../home/components/BottomNav';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext'; // 사용자 정보(user)를 가져오기 위해 useAuth 임포트

// 모든 상품 데이터를 API를 통해 가져오므로, 이 상수는 더 이상 필요 없습니다.
// const allProducts = [...mockProducts, ...devices, ...generals];

// 아이콘 컴포넌트
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;

export default function WishlistPage() {
  const router = useRouter();
  const { wishlistItems } = useWishlist();
  console.log('Wishlist Items:', wishlistItems);
  const { showModal } = useModal();
  const { user, isLoggedIn } = useAuth(); // 로그인 사용자 정보 가져오기

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [allProductsFromDb, setAllProductsFromDb] = useState([]); // DB에서 가져온 모든 상품
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState(null);

  // DB에서 모든 상품 데이터를 가져오는 함수
  const fetchAllProducts = useCallback(async () => {
    setLoadingProducts(true);
    setErrorProducts(null);
    try {
      // /api/products 엔드포인트는 모든 상품을 반환한다고 가정
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

  // 컴포넌트 마운트 시 모든 상품 데이터 로드
  useEffect(() => {
    fetchAllProducts();
  }, [fetchAllProducts]);


  // WishlistProvider에서 제공하는 ID 배열(wishlistItems)을 기반으로
  // 전체 상품 목록(allProductsFromDb)에서 일치하는 상품 정보를 찾아냅니다.
  const wishlistedProducts = useMemo(() => {
    // 상품 데이터와 위시리스트 ID가 모두 로드된 후에 필터링
    if (loadingProducts || !allProductsFromDb.length || !wishlistItems) return [];
    
    const wishlistedIds = new Set(wishlistItems);
    return allProductsFromDb.filter(product => wishlistedIds.has(product.productId)); // product.id 대신 product.productId 사용
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

    // 선택된 상품의 모든 상세 정보 (selectedProduct)와 수량(quantity)을 활용
    const itemToAdd = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      quantity: quantity,
      unitPrice: selectedProduct.price, // USD 가격을 단위 가격으로 사용
      mainImage: selectedProduct.image,
      // 필요한 다른 상품 정보 (예: SKU, 옵션 등) 추가
    };

    try {
      // 1. 현재 사용자 데이터를 다시 불러와서 기존 cart 정보를 가져옵니다.
      const userResponse = await fetch(`/api/users/${user.seq}`);
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user cart data.');
      }
      const userData = await userResponse.json();
      const currentCart = userData.cart || []; // 사용자의 기존 cart 배열, 없으면 빈 배열

      // 2. 새로운 항목을 cart 배열에 추가합니다.
      // (여기서는 단순 추가. 실제 앱에서는 동일 productId가 있을 경우 수량을 업데이트하는 로직이 필요할 수 있습니다.)
      const updatedCart = [...currentCart, itemToAdd];

      // 3. 업데이트된 cart 배열을 /api/users/[seq] 엔드포인트로 PUT 요청을 보내어 저장합니다.
      const response = await fetch(`/api/users/${user.seq}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: updatedCart }), // 'cart' 필드만 업데이트
      });

      if (!response.ok) {
        throw new Error('Failed to add item to cart in DB.');
      }

      console.log(`장바구니에 추가될 상품 정보:`, itemToAdd);
      console.log(`사용자 (ID: ${user.seq})의 장바구니가 업데이트되었습니다.`);

      showModal(`${productName} 상품 ${quantity}개가 장바구니에 추가되었습니다!`); // 성공 모달
      
    } catch (error) {
      console.error("장바구니에 상품 추가 실패:", error);
      showModal(`장바구니에 상품을 추가하지 못했습니다: ${error.message}`);
    }
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
        {/* 헤더 공간을 맞추기 위한 빈 div */}
        <div style={{ width: '24px' }}></div>
      </header>
      
      <main className={styles.mainContent}>
        {wishlistedProducts.length > 0 ? (
          <div className={styles.productGrid}>
            {wishlistedProducts.map(product => (
              <Link href={`/products/detail/${product.slug || product.productId}`} key={product.productId} className={styles.productLink}>
                {/* ProductCard에 필요한 product 속성 전달 */}
                <ProductCard product={{
                    id: product.productId, // ProductCard에서 사용하는 ID (위시리스트 토글용)
                    name: product.productName,
                    price: product.calculatedPriceUsd, // 위시리스트에서는 USD 가격을 주로 표시한다고 가정
                    discount: product.discount || 0,
                    image: product.mainImage,
                    slug: product.sku, // 상세 페이지 이동을 위한 slug
                }} onAddToCart={handleOpenCartModal} />
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
          product={selectedProduct} // selectedProduct 전체를 전달
        />
      )}

      <BottomNav />
    </div>
  );
}