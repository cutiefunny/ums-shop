// app/privacy-policy/page.js
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../app/auth.module.css'; // 공통 스타일 사용 (필요에 따라 별도 CSS 파일 생성 가능)
import AuthHeader from '@/components/AuthHeader'; // 뒤로가기 버튼을 위한 공통 헤더 컴포넌트

export default function PrivacyPolicyPage() {
  const router = useRouter();

  const handleBack = () => {
    router.back(); // 이전 페이지로 돌아가기
  };

  return (
    <div className={styles.pageWithFixedFooter}>
      <div className={styles.scrollableContent}>
        <AuthHeader onBack={handleBack} /> {/* 뒤로가기 버튼 포함된 헤더 */}
        <div className={styles.contentPadding}>
          <h2 className={styles.title}>Privacy Policy</h2>
          <p style={{ marginTop: '20px', lineHeight: '1.6' }}>
            {/* 여기에 개인정보 처리방침 내용을 입력하세요. */}
            Welcome to UMS SHOP. Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our mobile application (the "App"). Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the App.
            <br/><br/>
            We reserve the right to make changes to this Privacy Policy at any time and for any reason. We will alert you about any changes by updating the "Last Updated" date of this Privacy Policy. You are encouraged to periodically review this Privacy Policy to stay informed of updates. You will be deemed to have been made aware of, will be subject to, and will be deemed to have accepted the changes in any revised Privacy Policy by your continued use of the App after the date such revised Privacy Policy is posted.
            <br/><br/>
            Information Collection: We may collect information about you in a variety of ways. The information we may collect on the App includes:
            <br/>
            Personal Data: Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with the App or when you choose to participate in various activities related to the App.
            <br/><br/>
            Use of Your Information: Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the App to:
            <br/>
            - Create and manage your account.
            - Process your transactions and send notices about your transactions.
            - Deliver targeted advertising, coupons, newsletters, and other information regarding promotions and the App.
            - Enable user-to-user communications.
            - Generate a personal profile about you to make your visit to the App more personalized.
            <br/><br/>
            Disclosure of Your Information: We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
            <br/>
            - By Law or to Protect Rights: If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, or safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.
            - Third-Party Service Providers: We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.
            <br/><br/>
            Security of Your Information: We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
            <br/><br/>
            Contact Us: If you have questions or comments about this Privacy Policy, please contact us.
          </p>
        </div>
      </div>
    </div>
  );
}