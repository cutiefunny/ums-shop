// app/admin/user-management/[seq]/edit/page.js
'use client';

import React, { useState, useEffect } from 'react';
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
          <div className={styles.saveButtonContainer}> {/* 새 컨테이너 추가 */}
            <button onClick={handleSave} className={styles.saveButton}>
              SAVE
            </button>
          </div>
        </div>
      )}

      {activeTab === 'orderHistory' && (
        <div className={styles.tabContent}>
          <p>Order history details will be displayed here.</p>
        </div>
      )}

      {/* Footer removed */}
    </div>
  );
}
