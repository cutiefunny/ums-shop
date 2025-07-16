// app/profile/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './profile.module.css'; // 프로필 페이지 전용 CSS
import { useAuth } from '@/contexts/AuthContext'; // AuthContext 훅 임포트
import { useModal } from '@/contexts/ModalContext'; // ModalContext 훅 임포트
import ConfirmationModal from '@/components/ConfirmationModal'; // ConfirmationModal 임포트 추가

// 아이콘 컴포넌트
const EditIcon = () => (
  <img src="/images/write-pen.png" alt="Edit" width="20" height="20" />
);
const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);
// BottomNav 아이콘은 공통 컴포넌트에서 가져옴
import BottomNav from '@/app/home/components/BottomNav';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isLoggedIn } = useAuth(); // AuthContext에서 user, logout, isLoggedIn 가져오기
  const { showModal } = useModal(); // ModalContext에서 showModal 가져오기

  // 사용자 정보 상태 (수정 가능하도록 별도 관리)
  const [editableUser, setEditableUser] = useState(null);
  const [isEditingShipName, setIsEditingShipName] = useState(false);
  const [isEditingPhoneNumber, setIsEditingPhoneNumber] = useState(false);
  const [tempShipName, setTempShipName] = useState('');
  const [tempPhoneNumber, setTempPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);

  // 모달 상태 추가 (로그아웃, 탈퇴)
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [showQuestionsSubmittedModal, setShowQuestionsSubmittedModal] = useState(false); // My Questions 후
  const [showWillMissYouModal, setShowWillMissYouModal] = useState(false); // Unsubscribe 후

  useEffect(() => {
    if (isLoggedIn && user) {
      setEditableUser(user);
      setTempShipName(user.shipName || '');
      setTempPhoneNumber(user.phoneNumber || '');
      console.log('User data loaded:', user);
    } else {
      // 로그인되어 있지 않으면 로그인 페이지로 리다이렉트
      router.replace('/');
    }
  }, [user, isLoggedIn, router]);

  // 전화번호 유효성 검사 (숫자, 하이픈, 괄호, 공백 허용)
  const validatePhoneNumber = (number) => {
    // 숫자, 하이픈, 괄호, 공백만 허용하는 정규식
    const phoneRegex = /^[\d\s\-()]+$/; 
    return phoneRegex.test(number);
  };

  const handleEditClick = (field) => {
    if (field === 'shipName') {
      setIsEditingShipName(true);
    } else if (field === 'phoneNumber') {
      setIsEditingPhoneNumber(true);
      setPhoneError(''); // 편집 시작 시 에러 초기화
    }
  };

  const handleSave = async (field) => {
    setLoading(true);
    setPhoneError('');

    let updatedValue = {};
    let isDataValid = true;

    if (field === 'shipName') {
      updatedValue = { shipName: tempShipName.toUpperCase() };
      setIsEditingShipName(false);
    } else if (field === 'phoneNumber') {
    //   if (!validatePhoneNumber(tempPhoneNumber)) {
    //     setPhoneError('Invalid phone number format.');
    //     showModal('Invalid phone number format.');
    //     isDataValid = false;
    //   }
      updatedValue = { phoneNumber: tempPhoneNumber };
      setIsEditingPhoneNumber(false);
    }

    if (!isDataValid) {
      setLoading(false);
      return;
    }

    try {
      // /api/users/[seq] 엔드포인트로 PATCH 요청 대신 PUT 요청을 보냅니다.
      // PUT 요청은 일반적으로 리소스 전체 업데이트에 사용되지만,
      // 현재 백엔드 API가 부분 업데이트를 지원하도록 구현되어 있다면 PUT으로도 가능합니다.
      // (기존 users/[seq]/route.js 파일에 PUT 메서드가 구현되어 있습니다.)
      const response = await fetch(`/api/users/${user.seq}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedValue),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update data.');
      }

      const data = await response.json();
      setEditableUser(prev => ({ ...prev, ...updatedValue })); // UI 업데이트
      showModal(`${field === 'shipName' ? 'Ship Name' : 'Phone Number'} updated successfully!`); // 성공 모달
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      showModal(`Failed to update ${field}: ${err.message}`); // 실패 모달
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = (field) => {
    if (field === 'shipName') {
      setIsEditingShipName(false);
      setTempShipName(editableUser.shipName);
    } else if (field === 'phoneNumber') {
      setIsEditingPhoneNumber(false);
      setTempPhoneNumber(editableUser.phoneNumber);
      setPhoneError('');
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true); // "See You Soon" 모달 열기
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false); // 모달 닫기
    setLoading(true);
    try {
      await logout(); // AuthContext의 로그아웃 함수 호출 (서버 토큰 삭제 포함)
      router.replace('/'); // 로그인 페이지로 이동
    } catch (err) {
      console.error("Logout failed:", err);
      showModal("로그아웃 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribeClick = () => {
    setShowUnsubscribeModal(true); // "Thinking of Leaving?" 모달 열기
  };

  const confirmUnsubscribe = () => {
    setShowUnsubscribeModal(false); // 모달 닫기
    setShowWillMissYouModal(true); // "We'll Miss You" 모달 열기 (탈퇴 완료 메시지)
    // TODO: 실제 탈퇴 API 호출 로직 추가
    // 여기서는 단순히 모달만 보여줍니다.
    // 실제 구현에서는 서버에 사용자 계정 삭제 요청을 보내야 합니다.
  };

  const handleMyQuestionsClick = () => {
    router.push('/q-and-a?tab=my'); // My Questions 페이지로 이동
  };

  const handleAskQuestionClick = () => {
    router.push('/q-and-a?tab=ask'); // 통합된 Q&A 페이지의 'Ask a Question' 탭으로 이동
  };

  if (!editableUser) {
    return <div className={styles.container}>Loading profile...</div>;
  }

  if (loading) {
    return <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Page</h1>
      </header>

      <section className={styles.profileInfo} style={{ margin: '20px' }}>
        <div className={styles.infoRow}>
          <div className={styles.nameEmail}>
            <span className={styles.value} style ={{ fontSize: '1.2rem' }}>{editableUser.name}</span>
            <span style ={{ color: 'gray' }}>{editableUser.email}</span>
          </div>
          <button onClick={handleLogoutClick} className={styles.logoutButton} disabled={loading}>
          {loading ? 'Logging out...' : 'Log Out'}
        </button>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>Ship Name</span>
          <span style = {{ display: 'flex', alignItems: 'center' }}>
          {isEditingShipName ? (
            <input 
              type="text" 
              value={tempShipName} 
              onChange={(e) => setTempShipName(e.target.value.toUpperCase())} // 대문자로 변환
              className={styles.editInput} 
              disabled={loading}
            />
          ) : (
            <span>{editableUser.shipName}</span>
          )}
          <button 
            onClick={() => isEditingShipName ? handleSave('shipName') : handleEditClick('shipName')} 
            className={styles.editButton}
            disabled={loading}
          >
            {isEditingShipName ? 'Save' : <EditIcon />}
          </button>
          {isEditingShipName && (
            <button onClick={() => handleCancelEdit('shipName')} className={styles.cancelButton} disabled={loading}>
              Cancel
            </button>
          )}
            </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>Phone</span>
          <span style = {{ display: 'flex', alignItems: 'center' }}>
          {isEditingPhoneNumber ? (
            <input 
              type="tel" 
              value={tempPhoneNumber} 
              onChange={(e) => setTempPhoneNumber(e.target.value)}
              className={styles.editInput} 
              disabled={loading}
            />
          ) : (
            <span>{editableUser.phoneNumber}</span>
          )}
          <button 
            onClick={() => isEditingPhoneNumber ? handleSave('phoneNumber') : handleEditClick('phoneNumber')} 
            className={styles.editButton}
            disabled={loading}
          >
            {isEditingPhoneNumber ? 'Save' : <EditIcon />}
          </button>
          {isEditingPhoneNumber && (
            <button onClick={() => handleCancelEdit('phoneNumber')} className={styles.cancelButton} disabled={loading}>
              Cancel
            </button>
          )}
          </span>
        </div>
        {phoneError && <p className={styles.errorMessage}>{phoneError}</p>}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Q&A</h2>
        <ul className={styles.menuList}>
          <li>
            <button className={styles.menuItem} onClick={handleMyQuestionsClick}>
              <span className={styles.menuItemText}>My Questions</span>
              <ChevronRightIcon />
            </button>
          </li>
          <li>
            <button className={styles.menuItem} onClick={handleAskQuestionClick}>
              <span>Ask a Question</span>
              <ChevronRightIcon />
            </button>
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Privacy</h2>
        <ul className={styles.menuList}>
          <li>
            <button className={styles.menuItem} onClick={() => router.push('/privacy-policy')}>
              <span>Privacy Policy</span>
              <ChevronRightIcon />
            </button>
          </li>
          <li>
            <button className={styles.menuItem} onClick={() => router.push('/terms-of-service')}>
              <span>Terms of Service</span>
              <ChevronRightIcon />
            </button>
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Settings</h2>
        <ul className={styles.menuList}>
          <li>
            <button className={styles.menuItem} onClick={() => router.push('/notifications')}>
              <span>Notifications</span>
              <ChevronRightIcon />
            </button>
          </li>
          <li>
            <button className={styles.menuItem} onClick={() => router.push('/order-step')}>
              <span>Order Step</span>
              <ChevronRightIcon />
            </button>
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <ul className={styles.menuList}>
          <li>
            <button className={styles.menuItem} onClick={handleUnsubscribeClick}>
              <span>Unsubscribe</span>
              <ChevronRightIcon />
            </button>
          </li>
        </ul>
      </section>

      <BottomNav activePath="/profile" />

      {/* 모달: See You Soon (로그아웃 확인) */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        title="See You Soon"
        message="Come back anytime. We'll be right here!"
        buttonText="Log Out"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
        // 이미지에 맞춰 버튼 스타일 재정의
        confirmButtonClass={styles.logoutConfirmButton}
        cancelButtonClass={styles.logoutCancelButton}
      />

      {/* 모달: Thinking of Leaving? (탈퇴 확인) */}
      <ConfirmationModal
        isOpen={showUnsubscribeModal}
        title="Thinking of Leaving?"
        message="Are you sure you want to unsubscribe?\nYou'll miss great deals and new updates."
        buttonText="Unsubscribe"
        onConfirm={confirmUnsubscribe}
        onCancel={() => setShowUnsubscribeModal(false)}
      />

      {/* 모달: We'll Miss You (탈퇴 완료) */}
      <ConfirmationModal
        isOpen={showWillMissYouModal}
        title="We'll Miss You"
        message="Thanks for being with UMS SHOP.\nCome back anytime for fresh new deals."
        buttonText="Submit" // 여기서는 "Submit"이지만, 실제로는 "OK"나 "확인"이 적절할 수 있음
        onConfirm={() => { setShowWillMissYouModal(false); router.replace('/'); }} // 로그인 화면으로 이동
        onCancel={() => setShowWillMissYouModal(false)}
      />

      {/* 모달: My Questions (메시지 제출 완료) */}
      <ConfirmationModal
        isOpen={showQuestionsSubmittedModal}
        title="My Questions"
        message="Your message has been successfully submitted. You will receive a reply based on business hours."
        buttonText="OK"
        onConfirm={() => setShowQuestionsSubmittedModal(false)}
        onCancel={() => setShowQuestionsSubmittedModal(false)}
      />
    </div>
  );
}
