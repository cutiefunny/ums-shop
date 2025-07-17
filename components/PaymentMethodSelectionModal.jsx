// components/PaymentMethodSelectionModal.jsx
'use client';

import React from 'react';
import styles from './PaymentMethodSelectionModal.module.css'; // New CSS module for this modal

export default function PaymentMethodSelectionModal({ isOpen, onClose, onSelectMethod }) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.modalTitle}>Payment Options</h3>
                <div className={styles.paymentOptionsGrid}>
                    <button
                        onClick={() => onSelectMethod('PayPal')}
                        className={styles.paymentMethodButton}
                    >
                        PayPal (Recommended)
                    </button>
                    <button
                        onClick={() => onSelectMethod('Cash upon onboard delivery')}
                        className={styles.paymentMethodButton}
                    >
                        Cash upon onboard delivery
                    </button>
                </div>
                {/* Optional: Add a close button if needed */}
                {/* <button onClick={onClose} className={styles.closeButton}>&times;</button> */}
            </div>
        </div>
    );
}