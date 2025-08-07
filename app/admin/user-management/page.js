// app/admin/user-management/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link'; // Next.js Link 컴포넌트 임포트
import ApprovalStatusModal from './components/ApprovalStatusModal'; // 새 모달 컴포넌트 임포트
import styles from '../common.module.css';
import { useSearchParams } from 'next/navigation'; // useSearchParams 임포트

const ITEMS_PER_PAGE = 10; // 페이지당 항목 수

export default function UserManagementPage() {
  const [users, setUsers] = useState([]); // API에서 불러올 사용자 데이터
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // 팝업 모달 관련 상태
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [selectedUserForApproval, setSelectedUserForApproval] = useState(null); // { seq, currentStatus }

  const searchParams = useSearchParams(); // useSearchParams 훅 사용

  // API를 통해 사용자 데이터를 가져오는 함수
  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/users'); // API Route 호출
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please check your network or server configuration.");
    } finally {
      setLoading(false);
    }
  }

  // 컴포넌트 마운트 시 사용자 데이터를 가져옵니다.
  useEffect(() => {
    fetchUsers();

    // URL 쿼리에서 filterStatus를 읽어와 초기 상태로 적용
    const urlFilterStatus = searchParams.get('filterStatus');
    if (urlFilterStatus) {
      setFilterStatus(urlFilterStatus);
    }
  }, [searchParams]); // searchParams가 변경될 때마다 실행되도록 의존성 추가

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
      const matchesSearch =
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.shipName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        filterStatus === 'All' || user.approvalStatus?.toLowerCase() === filterStatus.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [users, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const currentUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1);
  };

  // --- Pagination logic from /admin/history/page.js ---
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    //if (totalPages <= 1) return null;
    const maxPagesToShow = 5;
    const pages = [];
    let startPage, endPage;
    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const maxPagesBeforeCurrentPage = Math.floor(maxPagesToShow / 2);
      const maxPagesAfterCurrentPage = Math.ceil(maxPagesToShow / 2) - 1;
      if (currentPage <= maxPagesBeforeCurrentPage) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - maxPagesBeforeCurrentPage;
        endPage = currentPage + maxPagesAfterCurrentPage;
      }
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`${styles.paginationButton} ${currentPage === i ? styles.paginationButtonActive : ''}`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  // 'Approval' 버튼 클릭 시 모달을 여는 함수
  const handleOpenApprovalModal = (event, user) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setModalPosition({
      top: rect.bottom + window.scrollY, // 버튼 바로 아래
      left: rect.left + window.scrollX,  // 버튼 왼쪽 정렬
    });
    setSelectedUserForApproval({ seq: user.seq, currentStatus: user.approvalStatus });
    setShowApprovalModal(true);
  };

  // 모달에서 상태 선택 시 실제 API를 호출하는 함수
  const handleSelectApprovalStatus = async (newStatus) => {
    if (!selectedUserForApproval) return;

    const userSeq = selectedUserForApproval.seq;
    console.log(`Attempting to change User ${userSeq} approval status to: ${newStatus}`);

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seq: userSeq, newStatus: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update status for user ${userSeq}`);
      }

      console.log(`User ${userSeq} approval status updated successfully.`);
      fetchUsers(); // 성공 시 데이터를 다시 불러와 최신 상태 반영
      setShowApprovalModal(false); // 모달 닫기

    } catch (err) {
      console.error("Error updating user approval status:", err);
      setError(`Failed to update approval status: ${err.message}`);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading users...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <div className={styles.searchGroup}>
          <input
            type="text"
            placeholder="Name, Email, Shipname"
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          <button className={styles.searchButton}>
            Search
          </button>
        </div>
        <select
          value={filterStatus}
          onChange={handleFilterChange}
          className={styles.filterSelect}
        >
          <option value="All">All</option>
          <option value="Request">Request</option>
          <option value="Approve">Approve</option>
          <option value="Reject">Reject</option>
        </select>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Ship Name</th>
            <th>Phone Number</th>
            <th>Approval</th>
            <th>Setting</th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.map(user => (
            <tr key={user.seq}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.shipName}</td>
              <td>{user.phoneNumber}</td>
              <td>
                <button
                  onClick={(e) => handleOpenApprovalModal(e, user)}
                  style={{
                    backgroundColor: (() => {
                      switch (user.approvalStatus) {
                        case 'request': return '#ffc107'; // Yellow
                        case 'approve': return '#28a745'; // Green
                        case 'reject': return '#dc3545'; // Red
                        default: return '#6c757d'; // Gray (기본값 또는 알 수 없는 상태)
                      }
                    })(),
                    color: 'white',
                    padding: '6px 10px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    minWidth: '80px', // 버튼 너비를 고정하여 UI 흔들림 방지
                  }}
                >
                  {user.approvalStatus.charAt(0).toUpperCase() + user.approvalStatus.slice(1)}
                </button>
              </td>
              <td>
                <Link href={`/admin/user-management/${user.seq}/edit`} passHref>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.pagination}>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles.paginationButton}
        >
          &lt;
        </button>
        {renderPagination()}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles.paginationButton}
        >
          &gt;
        </button>
      </div>

      {showApprovalModal && selectedUserForApproval && (
        <ApprovalStatusModal
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          onSelectStatus={handleSelectApprovalStatus}
          currentStatus={selectedUserForApproval.currentStatus}
          position={modalPosition}
        />
      )}
    </div>
  );
}
