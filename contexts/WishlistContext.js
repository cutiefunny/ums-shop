'use client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'; // useCallback 추가
import { useAuth } from './AuthContext';
// mockData는 더 이상 사용하지 않습니다.
// import { wishlist } from '@/data/mockData'; 

const WishlistContext = createContext(null);

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const { isLoggedIn, user } = useAuth(); // user 객체도 가져옵니다.
  const [wishlist, setWishlist] = useState([]);

  // 위시리스트 데이터를 API에서 불러오는 함수
  const fetchWishlist = useCallback(async () => {
    if (!isLoggedIn || !user?.seq) {
      setWishlist([]);
      return;
    }
    try {
      // 사용자 정보를 가져오는 API 호출
      const response = await fetch(`/api/users/${user.seq}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      const userData = await response.json();
      // 사용자 데이터에서 위시리스트 필드를 사용한다고 가정합니다.
      // DynamoDB 스키마에 따라 필드명이 'wishlist'가 아닐 수 있으니 확인이 필요합니다.
      setWishlist(userData.wishlist || []); 
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      setWishlist([]); // 에러 발생 시 위시리스트 초기화
    }
  }, [isLoggedIn, user?.seq]);

  // 위시리스트를 DynamoDB에 업데이트하는 함수
  const updateWishlistInDb = useCallback(async (updatedList) => {
    if (!isLoggedIn || !user?.seq) {
      console.warn("Not logged in, cannot update wishlist in DB.");
      return;
    }
    try {
      const response = await fetch(`/api/users/${user.seq}`, {
        method: 'PUT', // PUT 요청으로 사용자 정보 업데이트
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wishlist: updatedList }), // 업데이트된 위시리스트 배열 전송
      });
      if (!response.ok) {
        throw new Error('Failed to update wishlist in DB');
      }
      console.log("Wishlist updated successfully in DB.");
    } catch (error) {
      console.error("Error updating wishlist in DB:", error);
    }
  }, [isLoggedIn, user?.seq]);

  // 로그인 상태가 되면 위시리스트 데이터를 불러옵니다.
  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const toggleWishlist = useCallback((productId) => {
    setWishlist(prev => {
      const updatedList = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      
      updateWishlistInDb(updatedList); // DB에 업데이트 요청
      return updatedList;
    });
  }, [updateWishlistInDb]);

  const wishlistItems = wishlist; // 위시리스트 아이템들을 외부에서 사용할 수 있도록 제공

  const isProductInWishlist = useCallback((productId) => {
    return wishlist.includes(productId);
  }, [wishlist]);

  const value = {
    toggleWishlist,
    isProductInWishlist,
    wishlistItems,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};