// app/admin/order-management/components/DeliveryDateModal.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './modal.module.css'; // 기존 모달 스타일 재활용

const DeliveryDateModal = ({ isOpen, onClose, onConfirm, initialDate }) => {
    const [selectedDate, setSelectedDate] = useState('');
    const modalRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedDate(initialDate || ''); // 모달 열릴 때 초기 날짜 설정
            // 모달 외부 클릭 감지
            const handleClickOutside = (event) => {
                if (modalRef.current && !modalRef.current.contains(event.target)) {
                    onClose();
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen, onClose, initialDate]);

    if (!isOpen) return null;

    const handleConfirmClick = () => {
        if (!selectedDate) {
            alert('배송 예정일을 입력해주세요.');
            return;
        }
        onConfirm(selectedDate);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer} ref={modalRef}>
                <div className={styles.modalHeader}>
                    <img src="/images/dili.png" alt="Delivery Icon" style={{ width: '32px', height: '32x' }} />
                    <h2>Estimated Delivery Date</h2>
                </div>
                <div className={styles.modalBody}>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className={styles.dateInput}
                    />
                </div>
                <div className={styles.modalFooter}>
                    <button onClick={onClose} className={styles.cancelButton}>
                        Cancel
                    </button>
                    <button onClick={handleConfirmClick} className={styles.confirmButton}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeliveryDateModal;