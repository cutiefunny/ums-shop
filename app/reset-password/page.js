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

// [수정] 2단계: 새 비밀번호 설정 컴포넌트
const NewPasswordStep = ({ onBack, formData, handleChange }) => {
  const [error, setError] = useState('');

  // formData의 비밀번호 필드가 변경될 때마다 유효성 검사 실행
  useEffect(() => {
    const { password, confirmPassword } = formData;

    // 사용자가 입력을 시작했을 때만 유효성 검사
    if (password || confirmPassword) {
      // 1. 비밀번호 조건 검사
      if (password && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
        setError("Password must be at least 8 characters and include letters and numbers.");
      } 
      // 2. 비밀번호 일치 여부 검사
      else if (confirmPassword && password !== confirmPassword) {
        setError("Passwords do not match.");
      }
      // 모든 조건을 통과하면 에러 메시지 초기화
      else {
        setError('');
      }
    } else {
        setError('');
    }
  }, [formData.password, formData.confirmPassword]);

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
          {/* 에러 메시지 표시 영역 */}
          <p className={styles.errorMessage}>{error}</p>
        </form>
      </div>
    </>
  )
}

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isStep1Valid = 
    formData.email.trim() !== '' && 
    formData.fullName.trim() !== '' && 
    formData.phoneNumber.trim() !== '';

  // [수정] isStep2Valid 유효성 검사 로직 단순화
  const isStep2Valid = 
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(formData.password) &&
    formData.password === formData.confirmPassword;
  
  const handleVerificationSubmit = (e) => {
    e.preventDefault();
    // TODO: 실제 사용자 정보 인증 로직
    setStep(2);
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    // [수정] "필드 미입력 시" 에러 처리를 위해 조건 추가
    if (!formData.password || !formData.confirmPassword) {
      alert("Please enter your new password.");
      return;
    }
    
    if (isStep2Valid) {
      // TODO: 실제 비밀번호 변경 API 호출
      console.log('Resetting password with new password.');
      setIsModalOpen(true);
    } else {
        // isStep2Valid가 false일 경우, alert으로 유효성 검사 실패 알림
        // (실시간 에러 메시지가 이미 표시되지만, 버튼 클릭 시 추가 피드백 제공)
        alert("Please check the password requirements.")
    }
  };

  const handleConfirmAndRedirect = () => {
    setIsModalOpen(false);
    router.push('/');
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
            <button 
              type="button" 
              onClick={handleVerificationSubmit}
              className={styles.button} 
              disabled={!isStep1Valid}
            >
              Next
            </button>
        ) : (
          <button 
            type="submit" 
            form="new-password-form"
            onClick={handleResetSubmit}
            className={styles.button} 
          >
            Reset Password
          </button>
        )}
      </div>

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