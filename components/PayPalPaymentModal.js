// src/components/PayPalPaymentModal.js
import React, { useCallback } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useRouter } from 'next/navigation';
import { useModal } from '@/contexts/ModalContext'; // useModal 사용
import styles from './paypalPaymentModal.module.css'; // 새로 분리된 CSS 모듈 임포트

const PayPalPaymentModal = ({ isOpen, onClose, orderId, finalTotalPrice, currency, onPaymentSuccess, onPaymentError, onPaymentCancel }) => {
  const router = useRouter();
  const { showModal } = useModal();
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  // 모든 훅은 컴포넌트의 최상위 레벨에서 조건부 없이 호출되어야 합니다.
  // PayPal 주문을 생성하는 함수
  const createOrder = useCallback(async (data, actions) => {
    if (!orderId || !finalTotalPrice || !currency) {
      console.error('Missing order details for PayPal order creation.');
      showModal("결제 정보가 부족합니다. 다시 시도해주세요.");
      return null;
    }
    try {
      console.log('Calling /api/paypal/create-order from modal with:', { orderId, finalTotalPrice, currency });
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          finalTotalPrice: finalTotalPrice,
          currency: currency,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('PayPal create order API failed in modal:', errorData);
        throw new Error(errorData.message || 'PayPal 주문 생성 실패.');
      }
      const responseData = await response.json();
      console.log('PayPal order created successfully in modal:', responseData);
      return responseData.paypalOrderId; // PayPal Buttons SDK에 PayPal Order ID 반환
    } catch (err) {
      console.error("Error creating PayPal order in modal:", err);
      showModal(`PayPal 주문 생성에 실패했습니다: ${err.message}`);
      return null;
    }
  }, [orderId, finalTotalPrice, currency, showModal]);

  // PayPal 결제가 승인되었을 때 호출되는 함수
  const onApprove = useCallback(async (data, actions) => {
    console.log('PayPal onApprove callback triggered in modal. Data:', data);
    onClose(); // 모달 닫기
    // PaymentPage의 useEffect에서 리다이렉트된 URL을 감지하여 finalizePayPalPayment를 호출합니다.
  }, [onClose]);

  // PayPal 오류 발생 시 호출되는 함수
  const onError = useCallback((err) => {
    console.error("PayPal Buttons onError in modal:", err);
    onClose(); // 모달 닫기
    showModal("PayPal 결제 중 오류가 발생했습니다. 콘솔을 확인해주세요.");
    if (onPaymentError) onPaymentError(err);
  }, [onClose, showModal, onPaymentError]);

  // PayPal 버튼이 취소되었을 때 호출되는 함수
  const onCancel = useCallback((data) => {
    console.log("PayPal Buttons onCancel in modal:", data);
    onClose(); // 모달 닫기
    showModal("PayPal 결제가 취소되었습니다.");
    if (onPaymentCancel) onPaymentCancel(data);
  }, [onClose, showModal, onPaymentCancel]);

  // 훅 호출이 모두 끝난 후 조건부 렌더링을 처리합니다.
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Pay with PayPal</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <p>Order ID: {orderId}</p>
          <p>Total: ${finalTotalPrice} {currency}</p>
          {paypalClientId ? (
            <PayPalScriptProvider options={{ "client-id": paypalClientId, currency: currency, intent: "capture" }}>
              <div className={styles.paypalButtonWrapper}> {/* PayPal 버튼을 감싸는 div 추가 */}
                <PayPalButtons
                  style={{ layout: "vertical", color: "blue", shape: "rect", label: "paypal" }}
                  createOrder={createOrder}
                  onApprove={onApprove}
                  onError={onError}
                  onCancel={onCancel}
                />
              </div>
            </PayPalScriptProvider>
          ) : (
            <p>PayPal SDK를 로드하는 중입니다. 잠시만 기다려 주세요...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayPalPaymentModal;