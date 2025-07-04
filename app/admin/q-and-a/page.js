// /admin/q-and-a/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../common.module.css'; // CSS Modules import

export default function AdminQandAPage() {
    const [qnaList, setQnaList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1); // totalPages 상태 추가
    const itemsPerPage = 5; // 한 페이지에 보여줄 항목 수
    const router = useRouter();

    const fetchQnAs = async () => {
        try {
            const queryParams = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage,
                ...(searchTerm && { search: searchTerm }),
                ...(categoryFilter && { category: categoryFilter }),
                ...(statusFilter && { status: statusFilter }),
            }).toString();

            const res = await fetch(`/api/admin/q-and-a?${queryParams}`);
            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }
            const data = await res.json();
            setQnaList(data.items || []);
            setTotalPages(data.totalPages || 1); // totalPages 상태 업데이트
        } catch (error) {
            console.error('Failed to fetch Q&As:', error);
            // 에러 메시지 표시 등의 사용자 피드백 추가
        }
    };

    useEffect(() => {
        fetchQnAs();
    }, [currentPage, searchTerm, categoryFilter, statusFilter]); // 필터나 페이지 변경 시 다시 fetch

    const handleSearch = () => {
        setCurrentPage(1); // 검색 시 첫 페이지로 이동
        // fetchQnAs는 useEffect에서 currentPage 변경 감지하여 호출되므로 여기서 직접 호출할 필요 없음
    };

    const handleCategoryChange = (e) => {
        setCategoryFilter(e.target.value);
        setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
    };

    const handleStatusChange = (e) => {
        setStatusFilter(e.target.value);
        setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
    };

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

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.searchGroup}>
                    <input
                        type="text"
                        placeholder="Name, Ship Name"
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                        onClick={handleSearch}
                        className={styles.searchButton}
                    >
                        Search
                    </button>

                </div>
                <div className={styles.controlsOnlyFilter}>
                    <select
                        className={styles.filterSelect}
                        value={categoryFilter}
                        onChange={handleCategoryChange}
                    >
                        <option value="">Category</option>
                        <option value="Order">Order</option>
                        <option value="Product">Product</option>
                        <option value="Delivery">Delivery</option>
                        <option value="Payment">Payment</option> {/* 추가된 카테고리 */}
                        <option value="Service">Service</option> {/* 추가된 카테고리 */}
                        {/* 필요한 카테고리 추가 */}
                    </select>

                    <select
                        className={styles.filterSelect}
                        value={statusFilter}
                        onChange={handleStatusChange}
                    >
                        <option value="">Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Answered">Answered</option>
                    </select>
                </div>
            </div>

                {/* Q&A Table */}
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead className={styles.tableThead}>
                            <tr>
                                <th className={styles.tableTh}>Title</th>
                                <th className={styles.tableTh}>Category</th>
                                <th className={styles.tableTh}>Name</th>
                                <th className={styles.tableTh}>Submitted Date</th>
                                <th className={styles.tableTh}>Status</th>
                                <th className={styles.tableTh}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tableTbody}>
                            {qnaList.map((qna) => (
                                <tr key={qna.id}>
                                    <td className={styles.tableTd}>{qna.title}</td>
                                    <td className={styles.tableTd}>{qna.category}</td>
                                    <td className={styles.tableTd}>{qna.name}</td>
                                    <td className={styles.tableTd}>{qna.submittedDate}</td>
                                    <td className={styles.tableTd}>
                                        <span className={
                                            qna.status === 'Pending' ? styles.InDelivery : styles.Delivered
                                        }>
                                            {qna.status}
                                        </span>
                                    </td>
                                    <td className={styles.tableTd}>
                                        <button
                                            onClick={() => router.push(`/admin/q-and-a/${qna.id}`)} // 상세 페이지로 이동
                                            className={styles.actionButton}
                                        >
                                            View & Reply
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className={styles.paginationContainer}>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={styles.paginationButton}
                        >
                            &lt;
                        </button>
                        {renderPagination()}
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={styles.paginationButton}
                        >
                            &gt;
                        </button>
                    </div>
                </div>
        </div>
    );
}