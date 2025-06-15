'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // 앱 로딩 시 localStorage를 확인하여 로그인 상태를 복원합니다.
  useEffect(() => {
    const userSession = localStorage.getItem('ums-shop-user-session');
    if (userSession) {
      setUser(JSON.parse(userSession));
    }
  }, []);

  const value = {
    user,
    isLoggedIn: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};