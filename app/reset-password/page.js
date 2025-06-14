'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';
import AuthHeader from '@/components/AuthHeader';
import ConfirmationModal from '@/components/ConfirmationModal'; // 모달 컴포넌트 import

// 1단계: 사용자 인증 컴포넌트 (코드는 이전과 동일)
const VerificationStep = ({ onBack, formData, handleChange }) => {
  return (
    <>
      <AuthHeader onBack={onBack} />
      <div className={styles.contentPadding}>
        <h2 className={styles.title} style={{marginBottom: '20px'}}>Reset Password</h2>

        <form id="verification-form" className={styles.form}>
          <label className={styles.inputLabel}>Email</label>
          <input 
            name="email"
            type="email" 
            placeholder="abcd@gmail.com" 
            className={styles.input} 
            value={formData.email}
            onChange={handleChange}
            required 
          />
          
          <label className={styles.inputLabel}>Full Name</label>
          <input 
            name="fullName"
            type="text" 
            placeholder="John Doe" 
            className={styles.input} 
            value={formData.fullName}
            onChange={handleChange}
            required 
          />

          <label className={styles.inputLabel}>Phone Number</label>
          <input 
            name="phoneNumber"
            type="tel" 
            placeholder="+10 1 4561 4567" 
            className={styles.input} 
            value={formData.phoneNumber}
            onChange={handleChange}
            required 
          />
        </form>
      </div>
    </>
  );
};

// 2단계: 새 비밀번호 설정 컴포넌트 (코드는 이전과 동일)
const NewPasswordStep = ({ onBack, formData, handleChange }) => {
  return (
    <>
      <AuthHeader onBack={onBack} />
      <div className={styles.contentPadding}>
        <h2 className={styles.title} style={{marginBottom: '10px'}}>Set New Password</h2>
        <p className={styles.subtitle} style={{marginBottom: '20px'}}>Create a new password for your account.</p>
        
        <form id="new-password-form" className={styles.form}>
          <label className={styles.inputLabel}>Password</label>
          <input 
            name="password"
            type="password" 
            placeholder="Password" 
            className={styles.input} 
            value={formData.password}
            onChange={handleChange}
            required 
          />
          <p className={styles.inputHelper}>Minimum 8 characters, including letters and numbers</p>
          
          <input 
            name="confirmPassword"
            type="password" 
            placeholder="Confirm Password" 
            className={styles.input} 
            value={formData.confirmPassword}
            onChange={handleChange}
            required 
          />
        </form>
      </div>
    </>
  )
}

// 메인 페이지 컴포넌트
export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 상태 추가

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isStep1Valid = 
    formData.email.trim() !== '' && 
    formData.fullName.trim() !== '' && 
    formData.phoneNumber.trim() !== '';

  const isStep2Valid = 
    formData.password.length >= 8 &&
    /^(?=.*[A-Za-z])(?=.*\d)/.test(formData.password) &&
    formData.password === formData.confirmPassword;
  
  const handleVerificationSubmit = (e) => {
    e.preventDefault();
    // TODO: 실제 사용자 정보 인증 로직
    setStep(2);
  };

  // [수정] 비밀번호 재설정 제출 시, alert 대신 모달을 띄웁니다.
  const handleResetSubmit = (e) => {
    e.preventDefault();
    if (isStep2Valid) {
      // TODO: 실제 비밀번호 변경 API 호출
      console.log('Resetting password with new password.');
      setIsModalOpen(true); // 모달 열기
    }
  };

  // [추가] 모달의 Login 버튼 클릭 시 실행될 함수
  const handleConfirmAndRedirect = () => {
    setIsModalOpen(false); // 모달 닫기
    router.push('/'); // 로그인 페이지로 리디렉션
  };

  return (
    <div className={styles.pageWithFixedFooter}>
      <div className={styles.scrollableContent}>
        {step === 1 ? (
          <VerificationStep
            onBack={() => router.push('/')}
            formData={formData}
            handleChange={handleChange}
          />
        ) : (
          <NewPasswordStep
            onBack={() => setStep(1)}
            formData={formData}
            handleChange={handleChange}
          />
        )}
      </div>

      <div className={styles.fixedFooter}>
        {step === 1 ? (
          <>
            <button 
              type="button" 
              onClick={handleVerificationSubmit}
              className={styles.button} 
              disabled={!isStep1Valid}
            >
              Next
            </button>
          </>
        ) : (
          <button 
            type="submit" 
            form="new-password-form"
            onClick={handleResetSubmit}
            className={styles.button} 
            disabled={!isStep2Valid}
          >
            Reset Password
          </button>
        )}
      </div>

      {/* 모달 컴포넌트 렌더링 */}
      <ConfirmationModal
        isOpen={isModalOpen}
        title="New Password"
        message={"The password change completed.\nPlease Log in again."}
        buttonText="Login"
        onConfirm={handleConfirmAndRedirect}
      />
    </div>
  );
}