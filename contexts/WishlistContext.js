'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { wishlist } from '@/data/mockData'; // 실제 데이터는 API로 가져올 예정

const WishlistContext = createContext(null);

export const useWishlist = () => useContext(WishlistContext);

// 실제로는 API로 가져올 위시리스트 Mock 데이터
const MOCK_WISHLIST = wishlist; 

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

  const wishlistItems = wishlist; // 위시리스트 아이템들을 외부에서 사용할 수 있도록 제공

  const isProductInWishlist = (productId) => {
    return wishlist.includes(productId);
  };

  const value = {
    toggleWishlist,
    isProductInWishlist,
    wishlistItems,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};