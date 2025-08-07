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

    // 드롭다운 옵션을 별도로 관리하는 상태
    const [actionTypeOptions, setActionTypeOptions] = useState(['All']);

    const router = useRouter();
    const { showAdminNotificationModal } = useAdminModal();

    // API에서 활동 내역 데이터를 불러오는 함수
    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            // --- 여기부터 수정된 부분 ---
            const params = {
                page: currentPage,
                limit: ITEMS_PER_PAGE,
            };

            if (searchTerm) {
                params.search = searchTerm;
            }
            if (actionTypeFilter && actionTypeFilter !== 'All') {
                params.actionType = actionTypeFilter;
            }
            
            // 날짜 필터가 선택된 경우, KST 기준의 하루를 UTC 시간 범위로 변환하여 전송
            if (dateFilter) {
                // 사용자가 선택한 날짜를 KST의 시작 시간(00:00:00)으로 설정
                const startDate = new Date(`${dateFilter}T00:00:00`); 
                // 사용자가 선택한 날짜를 KST의 종료 시간(23:59:59)으로 설정
                const endDate = new Date(`${dateFilter}T23:59:59.999`);

                // KST 기준의 날짜를 UTC ISO 문자열로 변환하여 파라미터에 추가
                params.startDate = startDate.toISOString();
                params.endDate = endDate.toISOString();
            }

            const queryParams = new URLSearchParams(params).toString();
            // --- 여기까지 수정된 부분 ---

            const res = await fetch(`/api/admin/history?${queryParams}`);
            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }
            const data = await res.json();
            const newHistory = data.items || [];
            
            setHistoryList(newHistory);
            setTotalPages(data.totalPages || 1);

            // 새로 불러온 데이터에서 Action Type을 추출하여 기존 옵션에 추가
            if (newHistory.length > 0) {
                setActionTypeOptions(prevOptions => {
                    const updatedTypes = new Set(prevOptions);
                    newHistory.forEach(item => {
                        if (item.actionType) {
                            updatedTypes.add(item.actionType);
                        }
                    });
                    const sortedTypes = Array.from(updatedTypes).filter(type => type !== 'All').sort();
                    return ['All', ...sortedTypes];
                });
            }

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
        setCurrentPage(1);
    };

    const handleDateChange = (e) => {
        setDateFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleActionTypeChange = (e) => {
        setActionTypeFilter(e.target.value);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };
    
    const renderPagination = () => {
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
                        placeholder="Name or Details"
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                        {actionTypeOptions.map(type => (
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
                            historyList.map((entry, index) => (
                                <tr key={entry.id || index}>
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
                    disabled={currentPage >= totalPages}
                    className={styles.paginationButton}
                >
                    &gt;
                </button>
            </div>
        </div>
    );
}