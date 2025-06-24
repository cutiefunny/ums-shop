// app/admin/order-management/components/OrderStatusModal.jsx
import React from 'react';

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1050,
  },
  modalContent: {
    position: 'absolute',
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    padding: '8px 0',
    minWidth: '120px',
    zIndex: 1060,
    display: 'flex',
    flexDirection: 'column',
  },
  optionButton: {
    background: 'none',
    border: 'none',
    padding: '10px 15px',
    textAlign: 'left',
    width: '100%',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#333',
  },
};

const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case 'order': return '#007bff'; // Blue
    case 'paypal': return '#0070ba'; // PayPal blue
    case 'pay in cash': return '#28a745'; // Green
    case 'ems': return '#ffc107'; // Orange
    case 'delivered': return '#6c757d'; // Gray
    default: return '#333';
  }
};

/**
 * 주문 상태를 선택하는 드롭다운 모달 컴포넌트
 * @param {object} props
 * @param {boolean} props.isOpen - 모달 표시 여부
 * @param {function} props.onClose - 모달 닫기 함수
 * @param {function} props.onSelectStatus - 상태 선택 시 호출될 함수 (선택된 상태를 인자로 받음)
 * @param {string} props.currentStatus - 현재 주문의 상태
 * @param {{top: number, left: number}} props.position - 모달이 나타날 위치 (CSS top, left 값)
 */
export default function OrderStatusModal({ isOpen, onClose, onSelectStatus, currentStatus, position }) {
  if (!isOpen) {
    return null;
  }

  // 'All' 옵션은 제외하고 상태 목록을 가져옵니다.
  const STATUS_OPTIONS_FOR_SELECT = ['Order', 'Paypal', 'Pay in Cash', 'EMS', 'Delivered'];

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div
        style={{
          ...modalStyles.modalContent,
          top: position.top,
          left: position.left,
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {STATUS_OPTIONS_FOR_SELECT.map((status) => (
          <button
            key={status}
            onClick={() => onSelectStatus(status)}
            style={{
              ...modalStyles.optionButton,
              // Highlight current status and apply color
              backgroundColor: status.toLowerCase() === currentStatus.toLowerCase() ? getStatusColor(status) : 'transparent',
              color: status.toLowerCase() === currentStatus.toLowerCase() ? 'white' : '#333',
              fontWeight: status.toLowerCase() === currentStatus.toLowerCase() ? 'bold' : 'normal',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = (status.toLowerCase() === currentStatus.toLowerCase() ? getStatusColor(status) : '#f0f0f0')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = (status.toLowerCase() === currentStatus.toLowerCase() ? getStatusColor(status) : 'transparent')}
          >
            {status}
          </button>
        ))}
      </div>
    </div>
  );
}
