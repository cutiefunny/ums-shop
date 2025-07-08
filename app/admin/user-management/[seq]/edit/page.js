// app/admin/user-management/[seq]/edit/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './edit.module.css'; // CSS Modules 임포트

export default function UserEditPage() {
  const router = useRouter();
  const params = useParams();
  const userSeq = params.seq; // URL에서 seq 값 가져오기

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('information'); // 'information' or 'orderHistory'
  const [userOrders, setUserOrders] = useState([]); // 사용자의 주문 내역 상태
  const [loadingOrders, setLoadingOrders] = useState(false); // 주문 내역 로딩 상태
  const [errorOrders, setErrorOrders] = useState(null); // 주문 내역 에러 상태

  // 사용자 데이터 불러오기
  useEffect(() => {
    async function fetchUser() {
      if (!userSeq) return;

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/users/${userSeq}`); // API Route 호출
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch user data');
        }
        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error("Error fetching user:", err);
        setError(`Failed to load user data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [userSeq]);

  // 사용자의 주문 내역을 불러오는 함수
  const fetchUserOrders = useCallback(async (userEmail) => {
    if (!userEmail) return;

    setLoadingOrders(true);
    setErrorOrders(null);
    try {
      // 모든 주문을 가져와서 클라이언트 측에서 이메일로 필터링
      // TODO: 서버 측에서 이메일로 필터링하는 API를 구현하는 것이 더 효율적입니다.
      const response = await fetch('/api/orders');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const allOrders = await response.json();

      const filteredOrders = allOrders.filter(order => order.userEmail === userEmail);
      setUserOrders(filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date))); // 최신순 정렬
    } catch (err) {
      console.error("Error fetching user orders:", err);
      setErrorOrders(`주문 내역을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // user 데이터가 로드되면 주문 내역을 불러옴
  useEffect(() => {
    if (user && user.email) {
      fetchUserOrders(user.email);
    }
  }, [user, fetchUserOrders]);


  // 입력 필드 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser(prevUser => ({
      ...prevUser,
      [name]: value,
    }));
  };

  // 저장 버튼 핸들러
  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      // /api/users/[seq] API Route로 PUT 요청을 보내어 DynamoDB에 사용자 정보를 저장합니다.
      const response = await fetch(`/api/users/${user.seq}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user), // 수정된 사용자 객체 전체 전송
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user data');
      }

      const updatedUser = await response.json();
      console.log('User updated successfully:', updatedUser);
      alert('User data saved successfully!'); // 사용자에게 알림
      // router.push('/admin/user-management'); // 목록 페이지로 돌아가기 (선택 사항)
    } catch (err) {
      console.error("Error saving user:", err);
      setError(`Failed to save user data: ${err.message}`);
      alert(`Error saving data: ${err.message}`); // 사용자에게 에러 알림
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading user data...</div>;
  }

  if (error) {
    return <div className={`${styles.container} ${styles.errorText}`}>Error: {error}</div>; // 에러 텍스트 스타일 추가
  }

  if (!user) {
    return <div className={styles.container}>User not found.</div>;
  }

  // 총 주문 금액 계산
  const totalOrderAmount = userOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>User</h1>
        <button onClick={() => router.back()} className={styles.closeButton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabButton} ${activeTab === 'information' ? styles.active : ''}`}
          onClick={() => setActiveTab('information')}
        >
          Information
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'orderHistory' ? styles.active : ''}`}
          onClick={() => setActiveTab('orderHistory')}
        >
          Order History
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'information' && (
        <div className={styles.tabContent}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Name</label>
            <input
              type="text"
              name="name"
              value={user.name || ''}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={user.email || ''}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Phone Number</label>
            <input
              type="tel"
              name="phoneNumber"
              value={user.phoneNumber || ''}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Registration Date</label>
            <input
              type="text"
              name="registrationDate"
              value={user.registrationDate || 'N/A'} // 읽기 전용으로 표시
              readOnly
              className={`${styles.input} ${styles.readOnlyInput}`}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Ship Name</label>
            <input
              type="text"
              name="shipName"
              value={user.shipName || ''}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Company</label>
            <input
              type="text"
              name="company"
              value={user.company || ''}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Rank</label>
            <input
              type="text"
              name="rank"
              value={user.rank || ''}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          {/* SAVE Button - Moved here */}
          <div className={styles.saveButtonContainer}>
            <button onClick={handleSave} className={styles.saveButton}>
              SAVE
            </button>
          </div>
        </div>
      )}

      {activeTab === 'orderHistory' && (
        <div className={styles.tabContent}>
          <div className={styles.inputGroup2}>
            <label className={styles.label2}>Total</label>
            <input
              type="text"
              value={`$ ${totalOrderAmount.toFixed(2)}`}
              readOnly
              className={styles.input2}
            />
          </div>

          {loadingOrders ? (
            <p>주문 내역을 불러오는 중...</p>
          ) : errorOrders ? (
            <p style={{ color: 'red' }}>오류: {errorOrders}</p>
          ) : userOrders.length === 0 ? (
            <p>주문 내역이 없습니다.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {userOrders.map(order => (
                  <tr key={order.orderId}>
                    <td>{order.orderId}</td>
                    <td>{order.date ? order.date.split('T')[0] : 'N/A'}</td>
                    <td>${order.totalAmount?.toFixed(2) || '0.00'}</td>
                    <td>{order.status || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Footer removed */}
    </div>
  );
}
