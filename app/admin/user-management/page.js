// app/admin/user-management/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link'; // Next.js Link 컴포넌트 임포트

// DynamoDB 관련 import 제거 (이제 API Route를 통해 통신)
// import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
// import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

// DynamoDB 클라이언트 초기화 제거 (이제 서버 측 API Route에서 처리)
// const client = new DynamoDBClient({...});
// const docClient = DynamoDBDocumentClient.from(client);

// DynamoDB 테이블 이름 환경 변수도 이제 클라이언트 측에서는 필요 없습니다.
// const USERS_TABLE_NAME = process.env.NEXT_PUBLIC_DYNAMODB_TABLE_USERS || 'user-management';

const ITEMS_PER_PAGE = 5; // 페이지당 항목 수

export default function UserManagementPage() {
  const [users, setUsers] = useState([]); // API에서 불러올 사용자 데이터
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // API를 통해 사용자 데이터를 가져오는 함수
  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/users'); // 새로운 API Route 호출
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // DynamoDB에서 가져온 데이터로 users 상태 업데이트
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
  }, []); // 빈 배열은 컴포넌트가 처음 마운트될 때 한 번만 실행되도록 합니다.

  const filteredUsers = useMemo(() => {
    if (!users) return []; // users가 null 또는 undefined일 경우 빈 배열 반환
    return users.filter(user => {
      // user.id 대신 user.seq 사용
      const matchesSearch =
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.shipName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        filterStatus === 'All' || user.approvalStatus?.toLowerCase() === filterStatus.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [users, searchTerm, filterStatus]); // users가 변경될 때마다 재계산

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const currentUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // 검색 시 첫 페이지로 리셋
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 리셋
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleApprovalChange = async (userSeq, currentStatus) => {
    const newStatus = (() => {
      switch (currentStatus) {
        case 'request':
          return 'approve';
        case 'approve':
          return 'reject';
        case 'reject':
          return 'request';
        default:
          return currentStatus;
      }
    })();

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
      // 성공적으로 업데이트되면 데이터를 다시 불러와 최신 상태를 반영
      fetchUsers(); 

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
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>User Management</h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Name, Email, Shipname"
            value={searchTerm}
            onChange={handleSearchChange}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '250px' }}
          />
          <button
            style={{ padding: '8px 15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Search
          </button>
        </div>
        <select
          value={filterStatus}
          onChange={handleFilterChange}
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="All">All</option>
          <option value="Request">Request</option>
          <option value="Approve">Approve</option>
          <option value="Reject">Reject</option>
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #eee', backgroundColor: '#f8f8f8' }}>
            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Email</th>
            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Ship Name</th>
            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Phone Number</th>
            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Approval</th>
            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Setting</th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.map(user => (
            // key prop을 user.seq로 변경
            <tr key={user.seq} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px 8px' }}>{user.name}</td>
              <td style={{ padding: '12px 8px' }}>{user.email}</td>
              <td style={{ padding: '12px 8px' }}>{user.shipName}</td>
              <td style={{ padding: '12px 8px' }}>{user.phoneNumber}</td>
              <td style={{ padding: '12px 8px' }}>
                {user.approvalStatus === 'request' && (
                  <button
                    onClick={() => handleApprovalChange(user.seq, user.approvalStatus)}
                    style={{ backgroundColor: '#ffc107', color: 'white', padding: '6px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    request
                  </button>
                )}
                {user.approvalStatus === 'approve' && (
                  <button
                    onClick={() => handleApprovalChange(user.seq, user.approvalStatus)}
                    style={{ backgroundColor: '#28a745', color: 'white', padding: '6px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Approve
                  </button>
                )}
                {user.approvalStatus === 'reject' && (
                  <button
                    onClick={() => handleApprovalChange(user.seq, user.approvalStatus)}
                    style={{ backgroundColor: '#dc3545', color: 'white', padding: '6px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Reject
                  </button>
                )}
              </td>
              <td style={{ padding: '12px 8px' }}>
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

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            style={{
              padding: '8px 12px',
              border: `1px solid ${currentPage === page ? '#000' : '#ccc'}`,
              borderRadius: '4px',
              backgroundColor: currentPage === page ? '#f0f0f0' : 'white',
              cursor: 'pointer',
              fontWeight: currentPage === page ? 'bold' : 'normal',
            }}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
}
