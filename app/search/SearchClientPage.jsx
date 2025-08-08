// app/search/SearchClientPage.jsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../products/[slug]/products.module.css'; // products listing CSS 재활용
import ProductCard from '@/components/ProductCard';
import AddToCartModal from '../products/detail/[slug]/components/AddToCartModal';
import { useModal } from '@/contexts/ModalContext';
import BottomNav from '../home/components/BottomNav'; // 하단 내비게이션
import { useAuth } from '@/contexts/AuthContext'; // 사용자 정보
import SearchComponent from '../home/components/SearchComponent';

// 아이콘 컴포넌트 (products/[slug]/page.js에서 재활용)
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const CartIcon = () => <img src="/images/cart.png" alt="Cart" style={{width: 24, height: 24}} />;

export default function SearchClientPage() { // 컴포넌트 이름 변경
  const router = useRouter();
  const searchParams = useSearchParams(); // URL 쿼리 파라미터 접근 훅
  const { showModal, showConfirmationModal } = useModal();
  const { user, isLoggedIn } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const searchTerm = searchParams.get('q') || ''; // 'q' 쿼리 파라미터 가져오기

  // 검색 결과를 DynamoDB에서 가져오는 함수
  const fetchSearchResults = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    if (!query) {
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(`/api/products?searchTerm=${encodedQuery}`); // 수정된 API 엔드포인트 호출
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // ProductCard가 기대하는 형식에 맞춰 데이터 매핑 (calculatedPriceUsd를 price로, mainImage를 image로)
      const mappedProducts = data.map(product => ({
        id: product.productId,
        name: product.productName,
        price: product.calculatedPriceUsd,
        discount: product.discount || 0,
        image: product.mainImage,
        slug: product.sku, // Link용 slug 또는 productId
        // 기타 필요한 필드 추가
      }));
      console.log("Fetched products:", mappedProducts); // 디버깅용 로그
      setProducts(mappedProducts || []);
    } catch (err) {
      console.error("Error fetching search results:", err);
      setError(`검색 결과를 불러오는 데 실패했습니다: ${err.message}`);
      showModal(`검색 결과를 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [showModal]);

  // 검색어 변경 시마다 결과 다시 불러오기
  useEffect(() => {
    fetchSearchResults(searchTerm);
  }, [searchTerm, fetchSearchResults]);

  // Add to Cart 모달 열기
  const handleOpenCartModal = (product) => {
    setSelectedProduct(product);
    setIsCartModalOpen(true);
  };

  // 장바구니 추가 확정 로직 (ProductDetailPage, Category1DepthPage와 동일)
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
        slug: selectedProduct.slug,
    };

    try {
        const userResponse = await fetch(`/api/users/${user.seq}`);
        if (!userResponse.ok) {
            throw new Error('Failed to fetch user cart data.');
        }
        const userData = await userResponse.json();
        const currentCart = userData.cart || [];

        const existingItemIndex = currentCart.findIndex(item => item.productId === itemToAdd.productId);
        let updatedCart;

        if (existingItemIndex > -1) {
            updatedCart = currentCart.map((item, index) =>
                index === existingItemIndex
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
            );
        } else {
            updatedCart = [...currentCart, itemToAdd];
        }

        const response = await fetch(`/api/users/${user.seq}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart: updatedCart }),
        });

        if (!response.ok) {
            throw new Error('Failed to add item to cart in DB.');
        }

        console.log(`장바구니에 추가된 상품 정보:`, itemToAdd);
        showConfirmationModal(
            "장바구니 추가 완료",
            `${productName} 제품이 장바구니에 추가되었습니다. 장바구니로 가시겠습니까?`,
            () => {
                router.push('/cart');
            },
            () => {}
        );
        setIsCartModalOpen(false);
        
    } catch (error) {
        console.error("장바구니에 상품 추가 실패:", error);
        showModal(`장바구니에 상품을 추가하지 못했습니다: ${error.message}`);
    }
  };

  if (loading) {
    return <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />;
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={`${styles.emptyMessage} ${styles.errorText}`}> 오류: {error} </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.iconButton}><BackIcon /></button>
        <div className={styles.headerIcons}>
          <button onClick={() => router.push('/cart')} className={styles.iconButton}><CartIcon /></button>
        </div>
      </header>

      <SearchComponent
        isVisible={true}
        onClose={() => router.push('/')} // 검색 컴포넌트 닫기
      />

      <div className={styles.titleContainer}>
        <h2>Search Results for "{searchTerm}"</h2> {/* 검색어 표시 */}
      </div>

      <main className={styles.mainContent}>
        <div className={styles.productGrid}>
          {products.length > 0 ? (
            products.map(product => (
              <Link href={`/products/detail/${product.slug || product.id}`} key={product.id} className={styles.productLink}>
                <ProductCard product={product} onAddToCart={handleOpenCartModal} />
              </Link>
            ))
          ) : (
            <div className={styles.emptyMessage}>
              <p>"{searchTerm}"에 대한 검색 결과가 없습니다.</p>
            </div>
          )}
        </div>
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