'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../wishlist/wishlist.module.css'; // WishlistPage의 CSS 재활용
// ProductCard 대신 CartItem을 사용합니다.
// import ProductCard from '../products/[slug]/components/ProductCard'; 
import CartItem from '@/components/CartItem'; // CartItem 컴포넌트 임포트
import AddToCartModal from '../products/detail/[slug]/components/AddToCartModal';
import { useModal } from '@/contexts/ModalContext';
import BottomNav from '../home/components/BottomNav';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext'; // 사용자 정보(user)를 가져오기 위해 useAuth 임포트

// 아이콘 컴포넌트
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;

export default function CartPage() { // 컴포넌트 이름 변경
  const router = useRouter();
  const { showModal } = useModal();
  const { user, isLoggedIn } = useAuth(); // 로그인 사용자 정보 가져오기

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [userCartItems, setUserCartItems] = useState([]); // 사용자 장바구니 상품 목록
  const [loadingCart, setLoadingCart] = useState(true);
  const [errorCart, setErrorCart] = useState(null);

  // 장바구니 데이터를 DynamoDB에 업데이트하는 함수
  const updateCartInDb = useCallback(async (updatedCart) => {
    if (!isLoggedIn || !user?.seq) {
      console.warn("Not logged in, cannot update cart in DB.");
      return;
    }
    try {
      const response = await fetch(`/api/users/${user.seq}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cart: updatedCart }), // 'cart' 필드 업데이트
      });
      if (!response.ok) {
        throw new Error('Failed to update cart in DB');
      }
      console.log("Cart updated successfully in DB.");
    } catch (error) {
      console.error("Error updating cart in DB:", error);
      showModal("장바구니 업데이트에 실패했습니다: " + error.message);
    }
  }, [isLoggedIn, user?.seq, showModal]);


  // 사용자 장바구니 데이터를 DB에서 가져오는 함수
  const fetchUserCart = useCallback(async () => {
    if (!isLoggedIn || !user?.seq) {
      setUserCartItems([]);
      setLoadingCart(false);
      return;
    }
    setLoadingCart(true);
    setErrorCart(null);
    try {
      // /api/users/[seq] 엔드포인트를 호출하여 사용자 데이터를 가져옵니다.
      const userResponse = await fetch(`/api/users/${user.seq}`);
      if (!userResponse.ok) {
        throw new Error(`HTTP error! status: ${userResponse.status}`);
      }
      const userData = await userResponse.json();
      let fetchedCart = userData.cart || []; 

      // 각 장바구니 아이템에 대한 상품 상세 정보 (할인율 등)를 가져옵니다.
      const enrichedCartItems = await Promise.all(
        fetchedCart.map(async (cartItem) => {
          try {
            const productResponse = await fetch(`/api/products/${cartItem.productId}`);
            if (!productResponse.ok) {
              console.warn(`Failed to fetch product details for cart item ${cartItem.productId}`);
              return cartItem; // 상품 정보 가져오기 실패 시 기존 cartItem 반환
            }
            const productData = await productResponse.json();
            return { ...cartItem, discount: productData.discount || 0 }; // 상품의 할인율 추가
          } catch (itemError) {
            console.error(`Error fetching details for cart item ${cartItem.productId}:`, itemError);
            return cartItem; // 에러 발생 시 기존 cartItem 반환
          }
        })
      );
      setUserCartItems(enrichedCartItems);
    } catch (err) {
      console.error("Error fetching user cart:", err);
      setErrorCart(`장바구니 목록을 불러오는 데 실패했습니다: ${err.message}`);
      showModal(`장바구니 목록을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoadingCart(false);
    }
  }, [isLoggedIn, user?.seq, showModal]);

  // 컴포넌트 마운트 시 사용자 장바구니 데이터 로드
  useEffect(() => {
    fetchUserCart();
  }, [fetchUserCart]);

  const handleOpenCartModal = (product) => {
    // 장바구니 페이지에서는 AddToCartModal의 역할이 모호할 수 있습니다.
    // 여기서는 수량 변경 등을 위해 재활용한다고 가정합니다.
    setSelectedProduct(product);
    setIsCartModalOpen(true);
  };

  const handleConfirmAddToCart = async (productName, quantity) => {
    // AddToCartModal에서 'Add to Cart' 버튼 클릭 시 호출됩니다.
    // 장바구니 페이지에서는 주로 수량 변경에 사용될 수 있습니다.
    showModal(`${productName} 상품 ${quantity}개로 수량이 업데이트되었습니다.`);
    setIsCartModalOpen(false); // 모달 닫기
    // 실제 수량 변경 로직은 handleUpdateQuantity에서 처리됩니다.
  };

  // 장바구니 항목의 수량 업데이트 함수
  const handleUpdateQuantity = useCallback(async (productId, newQuantity) => {
    if (newQuantity < 1) return; // 수량은 최소 1개

    const updatedCart = userCartItems.map(item =>
      item.productId === productId ? { ...item, quantity: newQuantity } : item
    );
    setUserCartItems(updatedCart); // UI 먼저 업데이트

    await updateCartInDb(updatedCart); // DB에 변경 사항 반영
  }, [userCartItems, updateCartInDb]);

  // 장바구니 항목 제거 함수
  const handleRemoveItem = useCallback(async (productId) => {
    const updatedCart = userCartItems.filter(item => item.productId !== productId);
    setUserCartItems(updatedCart); // UI 먼저 업데이트

    await updateCartInDb(updatedCart); // DB에 변경 사항 반영
    showModal(`상품이 장바구니에서 제거되었습니다.`);
  }, [userCartItems, updateCartInDb, showModal]);


  // 총 주문 금액 계산
  const totalCartAmount = useMemo(() => {
    console.log("Calculating total cart amount for items:", userCartItems);
    return userCartItems.reduce((total, item) => {
    const unitPriceAfterDiscount = (item.unitPrice || 0) * (1 - (item.discount || 0) / 100);
    return total + unitPriceAfterDiscount * (item.quantity || 0);
    }, 0);
  }, [userCartItems]);

  // Checkout 버튼 클릭 핸들러
  const handleCheckoutClick = () => {
    router.push('/checkout'); // 새로 생성된 checkout 페이지로 이동
  };


  if (loadingCart) {
    return (
      <div className={styles.pageContainer}>
        <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      </div>
    );
  }

  if (errorCart) {
    return (
      <div className={styles.pageContainer}>
        <div className={`${styles.emptyMessage} ${styles.errorText}`}>오류: {errorCart}</div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.iconButton}>
          <BackIcon />
        </button>
        <h1 className={styles.title}>Cart</h1> {/* 페이지 제목 변경 */}
        {/* 헤더 공간을 맞추기 위한 빈 div */}
        <div style={{ width: '24px' }}></div>
      </header>
      
      <main className={styles.mainContent}>
        {userCartItems.length > 0 ? (
          <div className={styles.productGridCart}>
            {userCartItems.map(item => (
              <CartItem 
                key={item.productId} 
                item={item} 
                onUpdateQuantity={handleUpdateQuantity} 
                onRemoveItem={handleRemoveItem} 
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyMessage}>
            {/* <p>장바구니가 비어 있습니다.</p> */}
          </div>
        )}

        {userCartItems.length > 0 && (
          <div className={styles.cartSummary}>
            <div className={styles.totalAmountRow}>
              <span>Total Amount:</span>
              <span>${totalCartAmount.toFixed(2)}</span>
            </div>
            {/* 배송비, 세금 등 추가될 수 있음 */}
            <button onClick={handleCheckoutClick} className={styles.checkoutButton}>Checkout</button>
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

      <BottomNav activePath="/cart" /> {/* BottomNav에 현재 경로 활성화 표시 */}
    </div>
  );
}