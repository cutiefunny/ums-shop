'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../auth.module.css';
import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ConfirmationModal from '@/components/ConfirmationModal';

// TermsStep 컴포넌트는 변경 사항 없습니다.
const TermsStep = ({ onNext, agreements, setAgreements, onBack }) => {
  const handleAllAgreeChange = (e) => {
    const { checked } = e.target;
    setAgreements({
      all: checked,
      termsOfUse: checked,
      privacyPolicy: checked,
    });
  };

  const handleSingleAgreeChange = (e) => {
    const { name, checked } = e.target;
    const newAgreements = { ...agreements, [name]: checked };
    newAgreements.all = newAgreements.termsOfUse && newAgreements.privacyPolicy;
    setAgreements(newAgreements);
  };

  const canProceed = agreements.termsOfUse && agreements.privacyPolicy;

  return (
    <>
      <AuthHeader onBack={onBack} />
      <div className={styles.contentPadding}>
        <h2 className={styles.title}>Register</h2>
        <p className={styles.subtitle} style={{ marginTop: '24px' }}>Ship Supply Terms of Agreement</p>
        <div className={styles.termsBox}>
          <label className={styles.checkboxLabelFull}>
            <input type="checkbox" name="all" checked={agreements.all} onChange={handleAllAgreeChange} />
            Agree to All
          </label>
          <hr className={styles.divider} />
          <div className={styles.termItem}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" name="termsOfUse" checked={agreements.termsOfUse} onChange={handleSingleAgreeChange} />
              <div>
                <span>[Required] </span>
                <span>Terms of Use</span>
              </div>
            </label>
            <a href="/terms/use" target="_blank" className={styles.viewLink}>view</a>
          </div>
          <div className={styles.termItem}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" name="privacyPolicy" checked={agreements.privacyPolicy} onChange={handleSingleAgreeChange} />
              <div>
                <span className={styles.requiredText}>[Required] </span>
                <span>Consent to Collection and Use of Personal Information</span>
              </div>
            </label>
            <a href="/terms/privacy" target="_blank" className={styles.viewLink}>view</a>
          </div>
        </div>
      </div>
    </>
  );
};


// [수정] 정보 입력 컴포넌트에 에러 메시지 표시 로직 추가
const InfoStep = ({ onBack, formData, handleChange, errors }) => {
  return (
    <>
      <AuthHeader onBack={onBack} />
      <div className={styles.contentPadding}>
        <h2 className={styles.title}>Register</h2>
        <p className={styles.subtitle}>Just a few steps! Fill out all fields. We'll notify you once your account is approved.</p>
        
        <form id="info-form" className={styles.form}>
          <label className={styles.inputLabel}>Email</label>
          <input name="email" type="email" value={formData.email} placeholder="abcd@gmail.com" onChange={handleChange} className={styles.input} required />
          
          <label className={styles.inputLabel}>Full Name</label>
          <input name="fullName" type="text" value={formData.fullName} placeholder="John Doe" onChange={handleChange} className={styles.input} required />
          
          <label className={styles.inputLabel}>Ship Name</label>
          <input name="shipName" type="text" value={formData.shipName} placeholder="OCEAN EXPLORER" onChange={handleChange} className={styles.input} required />

          <label className={styles.inputLabel}>Company</label>
          <input name="company" type="text" value={formData.company} placeholder="Company name" onChange={handleChange} className={styles.input} />

          <label className={styles.inputLabel}>Rank</label>
          <select name="rank" value={formData.rank} onChange={handleChange} className={styles.input} required>
            <option value="">Select Rank</option>
            <option value="captain">Captain</option>
            <option value="engineer">Engineer</option>
          </select>

          <label className={styles.inputLabel}>Phone Number</label>
          <input name="phoneNumber" type="tel" value={formData.phoneNumber} placeholder="+10 1 4561 4567" onChange={handleChange} className={styles.input} required />

          <label className={styles.inputLabel}>Password</label>
          <input name="password" type="password" value={formData.password} placeholder="Password" onChange={handleChange} className={styles.input} required />
          <p className={styles.inputHelper}>Minimum 8 characters, including letters and numbers</p>
          {/* 비밀번호 조건 에러 메시지 */}
          {errors.password && <p className={styles.errorMessage}>{errors.password}</p>}

          <input name="confirmPassword" type="password" value={formData.confirmPassword} placeholder="Confirm Password" onChange={handleChange} className={styles.input} required />
          {/* 비밀번호 불일치 에러 메시지 */}
          {errors.confirmPassword && <p className={styles.errorMessage}>{errors.confirmPassword}</p>}
        </form>
      </div>
    </>
  );
};


export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [agreements, setAgreements] = useState({
    all: false,
    termsOfUse: false,
    privacyPolicy: false,
  });
  const [formData, setFormData] = useState({
    email: '', fullName: '', shipName: '', company: '', rank: '', phoneNumber: '', password: '', confirmPassword: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errors, setErrors] = useState({}); // 에러 메시지 상태 추가

  // [수정] 선박명 대문자 변환 로직 추가
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'shipName') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // 실시간 유효성 검사를 위한 useEffect
  useEffect(() => {
    const newErrors = {};
    const { password, confirmPassword } = formData;
    
    // 비밀번호 필드에 입력이 시작되면 유효성 검사
    if (password) {
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
        newErrors.password = "Password must be at least 8 characters long and include letters and numbers.";
      }
    }
    
    // 비밀번호 확인 필드에 입력이 시작되면 일치 여부 검사
    if (confirmPassword) {
      if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match.";
      }
    }
    
    setErrors(newErrors);
  }, [formData.password, formData.confirmPassword]);


  const isStep2FormValid = () => {
    const { email, fullName, shipName, rank, phoneNumber, password, confirmPassword } = formData;
    const isPasswordValid = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password) && password === confirmPassword;
    // company는 선택사항이므로 유효성 검사에서 제외
    return email && fullName && shipName && rank && phoneNumber && isPasswordValid;
  };

  const canProceedToNextStep = agreements.termsOfUse && agreements.privacyPolicy;

  // [수정] 제출 시 에러 처리 로직 강화
  const handleInfoSubmit = (e) => {
    e.preventDefault();
    // TODO: 중복 이메일 확인 API 연동 필요
    // if (isEmailDuplicate(formData.email)) {
    //   alert("This email is already registered.");
    //   return;
    // }

    if (isStep2FormValid()) {
      console.log('Registering user:', formData);
      setIsModalOpen(true);
    } else {
      // 폼 유효성 검사 실패 시 포괄적인 알림
      alert("Please fill out all required fields and check password requirements.");
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
          <TermsStep
            agreements={agreements}
            setAgreements={setAgreements}
            onBack={() => router.push('/')}
          />
        ) : (
          <InfoStep
            onBack={() => setStep(1)}
            formData={formData}
            handleChange={handleChange}
            errors={errors} // 에러 상태를 props로 전달
          />
        )}
      </div>

      <div className={styles.fixedFooter}>
        <div className={styles.footer}>
          Already signed up?
          <Link href="/" className={`${styles.link} ${styles.primaryLink}`}>
            Login
          </Link>
        </div>
        {step === 1 ? (
          <button onClick={() => setStep(2)} disabled={!canProceedToNextStep} className={styles.button}>
            Next
          </button>
        ) : (
          <button type="submit" form="info-form" onClick={handleInfoSubmit} className={styles.button}>
            Next
          </button>
        )}
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        title="Welcome to UMS SHOP"
        message={"Your registration is almost complete.\nConfirmation will be sent to your email once approved."}
        buttonText="OK"
        onConfirm={handleConfirmAndRedirect}
      />
    </div>
  );
}