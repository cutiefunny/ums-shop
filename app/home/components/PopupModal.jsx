'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from '../home.module.css';

export default function PopupModal({ imageUrl, onClose }) {
  const [dontShowToday, setDontShowToday] = useState(false);

  const handleClose = () => {
    if (dontShowToday) {
      // 현재 시간을 'YYYY-MM-DD' 형식으로 저장
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('popupDontShowUntil', today);
    }
    onClose();
  };

  return (
    <div className={styles.popupOverlay} onClick={handleClose}>
      <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.popupImageContainer}>
          {/* TODO: Replace with the actual banner image path. */}
          <Image src={imageUrl} alt="Event Banner" width={300} height={450} style={{ width: '100%', height: 'auto' }} />
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