'use client';

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // 앱 로딩 시 localStorage를 확인하여 로그인 상태를 복원합니다.
  useEffect(() => {
    const userSession = localStorage.getItem('ums-shop-user-session');
    if (userSession) {
      try {
        setUser(JSON.parse(userSession));
      } catch (e) {
        console.error("Failed to parse user session from localStorage", e);
        localStorage.removeItem('ums-shop-user-session'); // 파싱 실패 시 제거
      }
    }
  }, []);

  // 로그인 처리 함수
  const login = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('ums-shop-user-session', JSON.stringify(userData));
  }, []);

  // 로그아웃 처리 함수
  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem('ums-shop-user-session');
    // 서버 측 로그아웃 API 호출 (HttpOnly 쿠키 삭제)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        console.error('Server logout failed:', await response.text());
      }
    } catch (error) {
      console.error('Error during server logout:', error);
    }
  }, []);


  const value = {
    user,
    isLoggedIn: !!user,
    login, // login 함수 제공
    logout, // logout 함수 제공
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
