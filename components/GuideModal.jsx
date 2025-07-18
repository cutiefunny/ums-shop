// components/GuideModal.jsx
'use client';

import React, { useState, useEffect } from 'react';
import styles from './GuideModal.module.css'; // 새로운 CSS 모듈 임포트

export default function GuideModal({ isOpen, title, stepText, message, buttonText, onNext, onGoToMyOrders }) {
    const [hasConfirmed, setHasConfirmed] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setHasConfirmed(false); // 모달이 열릴 때마다 체크박스 상태 초기화
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleNextClick = () => {
        if (hasConfirmed) {
            onNext();
        } else {
            alert("Please read and confirm."); // 실제 앱에서는 더 좋은 알림 사용 (예: Toast, NotificationModal)
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modalContent}>
                <div className={styles.stepIndicator}>{stepText}</div>
                <h3 className={styles.modalTitle}>{title}</h3>
                <div className={styles.modalMessage} dangerouslySetInnerHTML={{ __html: message }} />

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={hasConfirmed}
                        onChange={(e) => setHasConfirmed(e.target.checked)}
                    />
                    I have read and confirm.
                </label>

                <div className={styles.buttonContainer}>
                    <button
                        onClick={onGoToMyOrders}
                        className={styles.goToMyOrdersButton}
                    >
                        Go to My Orders
                    </button>
                    <button
                        onClick={handleNextClick}
                        className={styles.nextButton}
                        disabled={!hasConfirmed}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
}