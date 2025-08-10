'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from '../home.module.css';

export default function PopupModal({ banner, onClose }) {
  const [dontShowToday, setDontShowToday] = useState(false);
  const router = useRouter();

  const handleClose = () => {
    if (dontShowToday) {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('popupDontShowUntil', today);
    }
    onClose();
  };

  // ✨ [추가됨] 배너 클릭 시 링크 처리 핸들러
  const handleBannerClick = () => {
    if (!banner.link || banner.exposureType === '없음') {
      return; // 링크가 없으면 아무 작업도 하지 않음
    }
    
    if (banner.exposureType === '외부 링크') {
      window.open(banner.link, '_blank', 'noopener,noreferrer');
    } else if (banner.exposureType === '내부 페이지') {
      router.push(banner.link);
    }
    
    // 링크 클릭 후 팝업 닫기
    handleClose();
  };

  const imageContent = (
    // ✨ [수정됨] div에 클릭 핸들러와 cursor 스타일 적용
    <div onClick={handleBannerClick} style={{ cursor: banner.link ? 'pointer' : 'default' }}>
      <Image 
        src={banner.imageUrl} 
        alt="Event Banner" 
        width={300} 
        height={450} 
        style={{ width: 'auto', height: '450px', display: 'block', objectFit: 'cover' }}
        priority
      />
    </div>
  );

  return (
    <div className={styles.popupOverlay} onClick={handleClose}>
      <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.popupImageContainer}>
          {imageContent}
        </div>
        <div className={styles.popupFooter}>
          <label className={styles.popupCheckboxLabel}>
            <input 
              type="checkbox" 
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
            />
            Don't show again today
          </label>
          <button onClick={handleClose} className={styles.popupCloseButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}