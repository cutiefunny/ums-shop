// components/PaymentInfoModal.jsx
import React from 'react';
import styles from './PaymentInfoModal.module.css'; // CSS 모듈 임포트

/**
 * PaymentInfoModal 컴포넌트
 * 결제 정보 수정 및 추가 정보를 입력하는 모달입니다.
 * @param {object} props
 * @param {object} props.orderDetail - 현재 주문 상세 정보 객체
 * @param {string} props.receivedBy - 'Received By' 입력 필드 값
 * @param {function} props.setReceivedBy - 'Received By' 값 변경 핸들러
 * @param {string} props.receivedDate - 'Received Date' 입력 필드 값
 * @param {function} props.setReceivedDate - 'Received Date' 값 변경 핸들러
 * @param {string} props.note - 'Note' 입력 필드 값
 * @param {function} props.setNote - 'Note' 값 변경 핸들러
 * @param {function} props.onSave - 'Save' 버튼 클릭 시 호출될 함수
 * @param {function} props.onClose - 모달 닫기 버튼 클릭 시 호출될 함수
 */
export default function PaymentInfoModal({
  orderDetail,
  receivedBy,
  setReceivedBy,
  receivedDate,
  setReceivedDate,
  note,
  setNote,
  onSave,
  onClose,
}) {
  if (!orderDetail) {
    return null; // orderDetail이 없으면 모달을 렌더링하지 않음
  }

  return (
    <div className={styles.paymentModalBackdrop}>
      <div className={styles.paymentModalContent}>
        <button className={styles.paymentModalCloseButton} onClick={onClose}>&times;</button>
        <h3 className={styles.paymentModalTitle}>Payment Information</h3>
        
        {/* Payment Method (이미지와 같이 텍스트로 표시) */}
        <div className={styles.paymentModalField}>
          <label>Payment Method</label>
          <span>{orderDetail.paymentMethod || 'N/A'}</span>
        </div>
        
        {/* Received By 입력 필드 */}
        <div className={styles.paymentModalField}>
          <label htmlFor="receivedBy">Received By</label>
          <input
            type="text"
            id="receivedBy"
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value)}
            className={styles.paymentModalInput}
          />
        </div>
        
        {/* Received Date 입력 필드 */}
        <div className={styles.paymentModalField}>
          <label htmlFor="receivedDate">Received Date</label>
          <input
            type="date" // 날짜 선택을 위한 type="date"
            id="receivedDate"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            className={styles.paymentModalInput}
          />
        </div>
        
        {/* Note 입력 필드 */}
        <div className={styles.paymentModalField}>
          <label htmlFor="note">Note</label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={styles.paymentModalTextarea}
          />
        </div>

        {/* Total (이미지와 같이 텍스트로 표시) */}
        <div className={styles.paymentModalField}>
          <label>Total</label>
          <span>${orderDetail.total?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
    </div>
  );
}
