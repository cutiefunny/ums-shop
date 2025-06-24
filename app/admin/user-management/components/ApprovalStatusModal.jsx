// app/admin/user-management/components/ApprovalStatusModal.jsx
import React from 'react';

// 이 모달을 위한 간단한 스타일 (inline style 또는 CSS Module 사용 가능)
const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // background: 'rgba(0, 0, 0, 0.1)', // 배경 클릭 시 닫히도록 투명하게 설정
    zIndex: 1050, // 테이블 위에 나타나도록
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
  optionButtonHover: {
    backgroundColor: '#f0f0f0',
  },
  // 현재 선택된 상태를 나타내는 스타일 (선택 사항)
  currentOption: {
    fontWeight: 'bold',
    color: '#007bff', // 예시 색상
  },
};

const getButtonColor = (status) => {
  switch (status) {
    case 'request':
      return '#ffc107'; // Yellow
    case 'approve':
      return '#28a745'; // Green
    case 'reject':
      return '#dc3545'; // Red
    default:
      return '#6c757d'; // Gray
  }
};

/**
 * 사용자 승인 상태를 선택하는 드롭다운 모달 컴포넌트
 * @param {object} props
 * @param {boolean} props.isOpen - 모달 표시 여부
 * @param {function} props.onClose - 모달 닫기 함수
 * @param {function} props.onSelectStatus - 상태 선택 시 호출될 함수 (선택된 상태를 인자로 받음)
 * @param {string} props.currentStatus - 현재 사용자의 승인 상태
 * @param {{top: number, left: number}} props.position - 모달이 나타날 위치 (CSS top, left 값)
 */
export default function ApprovalStatusModal({ isOpen, onClose, onSelectStatus, currentStatus, position }) {
  if (!isOpen) {
    return null;
  }

  // 사용 가능한 모든 상태 옵션
  const STATUS_OPTIONS = ['request', 'approve', 'reject'];

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div
        style={{
          ...modalStyles.modalContent,
          top: position.top,
          left: position.left,
        }}
        // 모달 컨텐츠 클릭 시 오버레이로 이벤트 전파 방지
        onClick={(e) => e.stopPropagation()}
      >
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => onSelectStatus(status)}
            // 마우스 오버 효과를 위한 인라인 스타일 추가
            style={{
              ...modalStyles.optionButton,
              ...(status === currentStatus ? modalStyles.currentOption : {}),
              // 선택된 상태의 버튼에 색상을 적용하여 현재 상태를 시각적으로 표시
              backgroundColor: status === currentStatus ? getButtonColor(status) : 'transparent',
              color: status === currentStatus ? 'white' : '#333',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = (status === currentStatus ? getButtonColor(status) : '#f0f0f0')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = (status === currentStatus ? getButtonColor(status) : 'transparent')}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)} {/* 첫 글자 대문자 */}
          </button>
        ))}
      </div>
    </div>
  );
}
