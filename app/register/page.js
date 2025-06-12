'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../auth.module.css';
import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';

// 약관 동의 컴포넌트
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
            {/* ==================== [수정된 부분 시작] ==================== */}
          <div className={styles.termItem}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" name="termsOfUse" checked={agreements.termsOfUse} onChange={handleSingleAgreeChange} />
              {/* 텍스트 부분을 div로 한 번 감싸줍니다. */}
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
              {/* 텍스트 부분을 div로 한 번 감싸줍니다. */}
              <div>
                <span className={styles.requiredText}>[Required] </span>
                <span>Consent to Collection and Use of Personal Information</span>
              </div>
            </label>
            <a href="/terms/privacy" target="_blank" className={styles.viewLink}>view</a>
          </div>
          {/* ==================== [수정된 부분 끝] ====================== */}
        </div>
      </div>
    </>
  );
};

// 정보 입력 컴포넌트
const InfoStep = ({ onBack, formData, handleChange }) => {

  return (
    <>
      <AuthHeader onBack={onBack} />
      <div className={styles.contentPadding}>
        <h2 className={styles.title}>Register</h2>
        <p className={styles.subtitle}>Just a few steps! Fill out all fields. We'll notify you once your account is approved.</p>
        
        {/* [수정] form의 onSubmit은 이제 부모 컴포넌트에서 전달됩니다. */}
        <form id="info-form" className={styles.form}>
          <label className={styles.inputLabel}>Email</label>
          <input name="email" type="email" value={formData.email} placeholder="abcd@gmail.com" onChange={handleChange} className={styles.input} required />
          
          <label className={styles.inputLabel}>Full Name</label>
          <input name="fullName" type="text" value={formData.fullName} placeholder="John Doe" onChange={handleChange} className={styles.input} required />
          
          {/* ... 다른 input들도 value={formData.fieldName} 으로 props와 연결 ... */}
          <label className={styles.inputLabel}>Ship Name</label>
          <input name="shipName" type="text" value={formData.shipName} placeholder="Ocean Explorer" onChange={handleChange} className={styles.input} required />

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
          
          <input name="confirmPassword" type="password" value={formData.confirmPassword} placeholder="Confirm Password" onChange={handleChange} className={styles.input} required />
        </form>
      </div>
    </>
  );
};


export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // 약관 동의 상태
  const [agreements, setAgreements] = useState({
    all: false,
    termsOfUse: false,
    privacyPolicy: false,
  });

  // [이동] InfoStep의 formData 상태를 RegisterPage로 이동
  const [formData, setFormData] = useState({
    email: '', fullName: '', shipName: '', company: '', rank: '', phoneNumber: '', password: '', confirmPassword: ''
  });

  // [이동] InfoStep의 handleChange 함수를 RegisterPage로 이동
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // [이동] InfoStep의 isStep2FormValid 함수를 RegisterPage로 이동
  const isStep2FormValid = () => {
    const { email, fullName, shipName, rank, phoneNumber, password, confirmPassword } = formData;
    // company는 필수 필드가 아니므로 제외
    return email && fullName && shipName && rank && phoneNumber && password && confirmPassword && password === confirmPassword;
  };

  const canProceedToNextStep = agreements.termsOfUse && agreements.privacyPolicy;

  const handleInfoSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
    alert('회원가입 정보 제출');
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
            // [수정] 상태와 핸들러를 props로 전달
            formData={formData}
            handleChange={handleChange}
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
          // [수정] 이제 RegisterPage 스코프에 있는 isStep2FormValid 함수를 직접 호출 가능
          <button type="submit" form="info-form" onSubmit={handleInfoSubmit} disabled={!isStep2FormValid()} className={styles.button}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
