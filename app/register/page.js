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
              <input type="checkbox" name="termsOfUse" className='checkbox' checked={agreements.termsOfUse} onChange={handleSingleAgreeChange} />
              <div>
                <span>[Required] </span>
                <span>Terms of Use</span>
              </div>
            </label>
            <a href="/terms/use" target="_blank" className={styles.viewLink}>view</a>
          </div>
          <div className={styles.termItem}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" name="privacyPolicy" className='checkbox' checked={agreements.privacyPolicy} onChange={handleSingleAgreeChange} />
              <div>
                <span className={styles.requiredText}>[Required] </span>
                <span>Consent to Collection and Use of <br />Personal Information</span>
              </div>
            </label>
            <a href="/terms/privacy" target="_blank" className={styles.viewLink}>view</a>
          </div>
        </div>
      </div>
    </>
  );
};


// 정보 입력 컴포넌트에 에러 메시지 표시 로직 추가
const InfoStep = ({ onBack, formData, handleChange, errors }) => {
  const [otherRank, setOtherRank] = useState('');
  const [rankSelected, setRankSelected] = useState(formData.rank);

  const handleRankChange = (e) => {
    handleChange(e);
    setRankSelected(e.target.value);
  };

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
          <select name="rank" value={formData.rank} onChange={handleRankChange} className={styles.input} required>
            <option value="">Select Rank</option>
            <option value="captain">Captain</option>
            <option value="chiefOfficer">Chief Officer / First Mate</option>
            <option value="secondOfficer">Second Officer</option>
            <option value="thirdOfficer">Third Officer</option>
            <option value="chiefEngineer">Chief Engineer</option>
            <option value="secondEngineer">Second Engineer</option>
            <option value="thirdEngineer">Third Engineer</option>
            <option value="deckhand">Deckhand / Able Seaman</option>
            <option value="boatswain">Boatswain (Bosun)</option>
            <option value="cook">Cook</option>
            <option value="radioOperator">Radio Operator</option>
            <option value="other">Other</option>
          </select>

          {rankSelected === 'other' && (
            <>
              <label className={styles.inputLabel}>Other Rank</label>
              <input
                type="text"
                name="otherRank"
                value={otherRank}
                onChange={(e) => {
                  setOtherRank(e.target.value);
                  setFormData(prev => ({ ...prev, otherRank: e.target.value }));
                }}
                placeholder="Please specify your rank"
                className={styles.input}
                required
              />
            </>
          )}

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
  const [loading, setLoading] = useState(false); // 로딩 상태 추가
  const [modalTitle, setModalTitle] = useState("Welcome to UMS SHOP"); // 모달 타이틀
  const [modalMessage, setModalMessage] = useState("Your registration is almost complete.\nConfirmation will be sent to your email once approved."); // 모달 메시지

  // 선박명 대문자 변환 로직 추가
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

  // 제출 시 에러 처리 로직 강화
  const handleInfoSubmit = async (e) => { // async 함수로 변경
    e.preventDefault();
    setLoading(true); // 로딩 시작
    setErrors({}); // 에러 초기화

    if (!isStep2FormValid()) {
      setModalTitle("Input Error");
      setModalMessage("Please fill in all required fields or check the password requirements.");
      setIsModalOpen(true);
      setLoading(false);
      return;
    }

    try {
      // 등록 API 호출
      const response = await fetch('/api/auth/register', { // 새로 생성한 API 라우트 호출
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData), // formData 전체를 전송
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed.');
      }

      console.log('Registration successful:', await response.json());
      setModalTitle("Welcome to UMS SHOP");
      setModalMessage("Your registration is almost complete.\nConfirmation will be sent to your email once approved.");
      setIsModalOpen(true);
    } catch (err) {
      console.error("Registration error:", err);
      setModalTitle("Registration Failed");
      setModalMessage(err.message || "An error occurred during registration.");
      setIsModalOpen(true);
    } finally {
      setLoading(false); // 로딩 종료
    }
  };

  const handleConfirmAndRedirect = () => {
    setIsModalOpen(false);
    router.push('/');
  };

  // 로딩 메시지 출력 위치에 이미지로 대체
  if (loading) {
    return <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />;
  }

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
          <button onClick={() => setStep(2)} disabled={!canProceedToNextStep || loading} className={styles.button}>
            Next
          </button>
        ) : (
          <button type="submit" form="info-form" onClick={handleInfoSubmit} className={styles.button} disabled={loading}>
            {loading ? 'Registering...' : 'Next'}
          </button>
        )}
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        title={modalTitle}
        message={modalMessage}
        buttonText="OK"
        onConfirm={handleConfirmAndRedirect}
        onCancel={() => setIsModalOpen(false)} // 취소 버튼 핸들러 추가 (모달 닫기)
      />
    </div>
  );
}
