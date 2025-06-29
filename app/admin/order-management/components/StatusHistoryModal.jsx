// app/admin/order-management/components/StatusHistoryModal.jsx
'use client';

import React, { useEffect, useRef } from 'react';
import styles from './history-modal.module.css'; // 새로운 CSS 모듈 사용 (아래에서 생성)

/**
 * 주문 상태 변경 이력을 표시하는 모달 컴포넌트
 * @param {object} props
 * @param {boolean} props.isOpen - 모달 표시 여부
 * @param {function} props.onClose - 모달 닫기 함수
 * @param {Array<object>} props.historyData - 상태 변경 이력 데이터 (예: {timestamp, oldStatus, newStatus, changedBy})
 */
export default function StatusHistoryModal({ isOpen, onClose, historyData }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    } else {
      document.removeEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  // 시간순으로 정렬 (최신 순)
  const sortedHistory = [...(historyData || [])].sort((b, a) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className={styles.overlay} onClick={onClose} aria-modal="true" role="dialog">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} ref={modalRef}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Status History</h2>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          {sortedHistory.length > 0 ? (
            <ul className={styles.historyList}>
              {sortedHistory.map((entry, index) => (
                <li key={index} className={styles.historyItem}>
                  <div className={styles.historyStatus}>
                    <span className={styles.checkmarkIcon}>&#10003;</span> {/* 체크마크 아이콘 */}
                    {/* {entry.oldStatus && <span>{entry.oldStatus} &rarr; </span>} */}
                    <span className={styles.newStatusText}>
                        {
                            (() => {
                                switch (entry.newStatus) {
                                    case 'Order':
                                        return 'Order(Confirmed)';
                                    case 'Paypal':
                                        return 'payment(paypal)';
                                    case 'Pay in Cash':
                                        return 'payment(pay in cash)';
                                    case 'EMS':
                                        return 'payment(EMS)';
                                    case 'Delivered':
                                        return 'Delivered';
                                    default:
                                        return entry.newStatus;
                                }
                            })()
                        }
                        </span>
                    {entry.changedBy && <span className={styles.changedByText}> ({entry.changedBy})</span>}
                  </div>
                  <div className={styles.historyTimestamp}>
                    {new Date(entry.timestamp).toLocaleDateString('ko-KR', {
                        year: 'numeric', month: 'numeric', day: 'numeric'
                    })} 
                    {' '}
                    {new Date(entry.timestamp).toLocaleTimeString('ko-KR', {
                        hour: '2-digit', minute: '2-digit', hour12: false
                    })}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.noHistoryMessage}>No status history available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
