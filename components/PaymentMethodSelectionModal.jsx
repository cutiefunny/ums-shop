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
                <div className={styles.paymentOptionsGrid}>
                    <button
                        onClick={() => onSelectMethod('PayPal')}
                        className={styles.paymentMethodButton}
                    >
                        <img src="/images/device-message.png" alt="PayPal" className={styles.paymentIcon} />
                        PayPal
                    </button>
                    <button
                        onClick={() => onSelectMethod('Pay in cash')}
                        className={styles.paymentMethodButton}
                    >
                        <img src="/images/file.png" alt="Cash on Delivery" className={styles.paymentIcon} />
                        Pay in cash
                    </button>
                </div>
                {/* Optional: Add a close button if needed */}
                {/* <button onClick={onClose} className={styles.closeButton}>&times;</button> */}
            </div>
        </div>
    );
}