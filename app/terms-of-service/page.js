// app/terms-of-service/page.js
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../app/auth.module.css'; // 공통 스타일 사용
import AuthHeader from '@/components/AuthHeader'; // 뒤로가기 버튼을 위한 공통 헤더 컴포넌트

export default function TermsOfServicePage() {
  const router = useRouter();

  const handleBack = () => {
    router.back(); // 이전 페이지로 돌아가기
  };

  return (
    <div className={styles.pageWithFixedFooter}>
      <div className={styles.scrollableContent}>
        <AuthHeader onBack={handleBack} /> {/* 뒤로가기 버튼 포함된 헤더 */}
        <div className={styles.contentPadding}>
          <h2 className={styles.title}>Terms of Service</h2>
          <p style={{ marginTop: '20px', lineHeight: '1.6' }}>
            {/* 여기에 서비스 이용 약관 내용을 입력하세요. */}
            Welcome to UMS SHOP. These Terms of Service ("Terms") govern your use of our mobile application (the "App"). By accessing or using the App, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the App.
            <br/><br/>
            **1. Acceptance of Terms**
            By creating an account or using the App, you confirm that you are at least 18 years of age and agree to these Terms. If you are using the App on behalf of an organization, you are agreeing to these Terms for that organization and promising that you have the authority to bind that organization to these Terms.
            <br/><br/>
            **2. Changes to Terms**
            We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our App after those revisions become effective, you agree to be bound by the revised terms.
            <br/><br/>
            **3. Your Account**
            When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our App. You are responsible for safeguarding the password that you use to access the App and for any activities or actions under your password.
            <br/><br/>
            **4. Use of the App**
            You agree to use the App only for lawful purposes and in accordance with these Terms. You are prohibited from using the App:
            <br/>
            - In any way that violates any applicable national or international law or regulation.
            - For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way by exposing them to inappropriate content or otherwise.
            - To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail," "chain letter," "spam," or any other similar solicitation.
            <br/><br/>
            **5. Intellectual Property**
            The App and its original content, features, and functionality are and will remain the exclusive property of UMS SHOP and its licensors. The App is protected by copyright, trademark, and other laws of both the Republic of Korea and foreign countries.
            <br/><br/>
            **6. Termination**
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the App will immediately cease. If you wish to terminate your account, you may simply discontinue using the App.
            <br/><br/>
            **7. Governing Law**
            These Terms shall be governed and construed in accordance with the laws of the Republic of Korea, without regard to its conflict of law provisions.
            <br/><br/>
            **8. Contact Us**
            If you have any questions about these Terms, please contact us.
          </p>
        </div>
      </div>
    </div>
  );
}
