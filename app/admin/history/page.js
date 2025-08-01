// /admin/history/page.js
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../common.module.css'; // 새로 생성한 CSS Modules
import { useAdminModal } from '@/contexts/AdminModalContext'; // AdminModalContext 사용

const ITEMS_PER_PAGE = 10; // 한 페이지에 보여줄 항목 수

export default function AdminHistoryPage() {
    const [historyList, setHistoryList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState(''); // 이름, 상세 내용 검색
    const [dateFilter, setDateFilter] = useState(''); // 날짜 필터 (YYYY-MM-DD)
    const [actionTypeFilter, setActionTypeFilter] = useState('All'); // Action Type 필터
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const router = useRouter();
    const { showAdminNotificationModal } = useAdminModal();

    // API에서 활동 내역 데이터를 불러오는 함수
    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const queryParams = new URLSearchParams({
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                ...(searchTerm && { search: searchTerm }),
                ...(dateFilter && { date: dateFilter }),
                ...(actionTypeFilter && actionTypeFilter !== 'All' && { actionType: actionTypeFilter }),
            }).toString();

            const res = await fetch(`/api/admin/history?${queryParams}`);
            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }
            const data = await res.json();
            setHistoryList(data.items || []);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error('Failed to fetch history:', err);
            setError(`활동 내역을 불러오는 데 실패했습니다: ${err.message}`);
            showAdminNotificationModal(`활동 내역을 불러오는 데 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, dateFilter, actionTypeFilter, showAdminNotificationModal]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]); // 필터나 페이지 변경 시 다시 fetch

    const handleSearch = () => {
        setCurrentPage(1); // 검색 시 첫 페이지로 이동
        fetchHistory(); // 검색 버튼 클릭 시 즉시 데이터 다시 불러옴
    };

    const handleDateChange = (e) => {
        setDateFilter(e.target.value);
        setCurrentPage(1); // 날짜 변경 시 첫 페이지로 이동
    };

    const handleActionTypeChange = (e) => {
        setActionTypeFilter(e.target.value);
        setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // 현재 사용 가능한 Action Type 목록 (백엔드에서 가져오거나 고정된 목록 사용)
    const actionTypes = useMemo(() => {
        const types = new Set(historyList.map(item => item.actionType));
        return ['All', ...Array.from(types).sort()];
    }, [historyList]);

    const renderPagination = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`${styles.paginationButton} ${
                        currentPage === i ? styles.paginationButtonActive : ''
                    }`}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    if (loading) {
        return <div className={styles.container}>Loading history...</div>;
    }

    if (error) {
        return <div className={`${styles.container} ${styles.errorText}`}>Error: {error}</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.searchGroup}>
                    <input
                        type="text"
                        placeholder="Name"
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button onClick={handleSearch} className={styles.searchButton}>Search</button>
                </div>
                <div className={styles.filterGroup}>
                    <input
                        type="date"
                        className={styles.dateInput}
                        value={dateFilter}
                        onChange={handleDateChange}
                    />
                    <select
                        className={styles.filterSelect}
                        value={actionTypeFilter}
                        onChange={handleActionTypeChange}
                    >
                        {actionTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className={styles.tableContainer}>
                <table className={styles.table} style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Manager</th>
                            <th>Device Info</th>
                            <th>Action Type</th>
                            <th style={{ maxWidth: '500px', overflow: 'auto' }}>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historyList.length > 0 ? (
                            historyList.map((entry) => (
                                <tr key={entry.id}>
                                    <td>{new Date(entry.timestamp).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\. /g, '.').replace(/\./g, '. ').trim()}</td>
                                    <td>{entry.manager}</td>
                                    <td>{entry.deviceInfo}</td>
                                    <td>{entry.actionType}</td>
                                    <td style={{ maxWidth: '500px', overflow: 'auto' }}>{entry.details}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                                    표시할 활동 내역이 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

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
        </div>
    );
}