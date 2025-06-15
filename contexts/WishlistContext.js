'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export const useWishlist = () => useContext(WishlistContext);

// 실제로는 API로 가져올 위시리스트 Mock 데이터
const MOCK_WISHLIST = [1, 3]; // 상품 ID 1, 3번이 위시리스트에 있다고 가정

export const WishlistProvider = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [wishlist, setWishlist] = useState([]);

  // 로그인 상태가 되면 위시리스트 데이터를 불러옵니다.
  useEffect(() => {
    if (isLoggedIn) {
      setWishlist(MOCK_WISHLIST);
    } else {
      setWishlist([]);
    }
  }, [isLoggedIn]);

  const toggleWishlist = (productId) => {
    setWishlist(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const isProductInWishlist = (productId) => {
    return wishlist.includes(productId);
  };

  const value = {
    toggleWishlist,
    isProductInWishlist,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};