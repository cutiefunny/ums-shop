// /admin/manager/page.js
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../common.module.css'; // 새로 생성한 CSS Modules
import { useAdminModal } from '@/contexts/AdminModalContext'; // AdminModalContext 사용

const ITEMS_PER_PAGE = 5;

// 체크 아이콘 (권한 활성화 시 사용)
const CheckIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

// X 아이콘 (권한 비활성화 시 사용)
const XIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

// 관리자 추가/수정 모달 컴포넌트
function AddEditManagerModal({ isOpen, onClose, onSave, isEditMode, initialData }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('Product Manager'); // Default role
    const [permissions, setPermissions] = useState({
        canManageProduct: false,
        canManageOrder: false,
        canManagePacking: false,
        canManageUserApproval: false,
        canManageQnA: false,
        canManageBanner: false,
    });
    const [passwordError, setPasswordError] = useState('');
    const { showAdminNotificationModal } = useAdminModal();

    useEffect(() => {
        if (isEditMode && initialData) {
            setName(initialData.name || '');
            setEmail(initialData.email || '');
            setRole(initialData.role || 'Product Manager');
            setPassword(''); // Password never pre-filled in edit mode for security
            setConfirmPassword('');
            setPermissions({
                canManageProduct: initialData.canManageProduct || false,
                canManageOrder: initialData.canManageOrder || false,
                canManagePacking: initialData.canManagePacking || false,
                canManageUserApproval: initialData.canManageUserApproval || false,
                canManageQnA: initialData.canManageQnA || false,
                canManageBanner: initialData.canManageBanner || false,
            });
        } else {
            // Reset for Add mode
            setName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setRole('Product Manager');
            setPermissions({
                canManageProduct: false, canManageOrder: false, canManagePacking: false,
                canManageUserApproval: false, canManageQnA: false, canManageBanner: false,
            });
        }
        setPasswordError('');
    }, [isOpen, isEditMode, initialData]);

    useEffect(() => {
        // Update permissions based on selected role
        switch (role) {
            case 'Super Admin':
                setPermissions({
                    canManageProduct: true, canManageOrder: true, canManagePacking: true,
                    canManageUserApproval: true, canManageQnA: true, canManageBanner: true,
                });
                break;
            case 'Product Manager':
                setPermissions(prev => ({ ...prev, canManageProduct: true, canManageOrder: false, canManagePacking: false, canManageUserApproval: false, canManageQnA: false, canManageBanner: false }));
                break;
            case 'Order Manager':
                setPermissions(prev => ({ ...prev, canManageProduct: false, canManageOrder: true, canManagePacking: false, canManageUserApproval: false, canManageQnA: false, canManageBanner: false }));
                break;
            case 'CS Manager':
                setPermissions(prev => ({ ...prev, canManageProduct: false, canManageOrder: false, canManagePacking: false, canManageUserApproval: false, canManageQnA: true, canManageBanner: false }));
                break;
            default:
                setPermissions({
                    canManageProduct: false, canManageOrder: false, canManagePacking: false,
                    canManageUserApproval: false, canManageQnA: false, canManageBanner: false,
                });
                break;
        }
    }, [role]);

    const handlePermissionChange = (e) => {
        const { name, checked } = e.target;
        setPermissions(prev => ({ ...prev, [name]: checked }));
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (e.target.value.length < 6) { // Minimum length example
            setPasswordError('비밀번호는 최소 6자 이상이어야 합니다.');
        } else {
            setPasswordError('');
        }
    };

    const handleConfirmPasswordChange = (e) => {
        setConfirmPassword(e.target.value);
        if (password !== e.target.value) {
            setPasswordError('비밀번호가 일치하지 않습니다.');
        } else {
            setPasswordError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !email || !role) {
            showAdminNotificationModal('모든 필수 필드를 입력해주세요.');
            return;
        }
        if (!isEditMode && (!password || password !== confirmPassword || passwordError)) {
            showAdminNotificationModal('비밀번호를 확인해주세요.');
            return;
        }
        if (isEditMode && password && password !== confirmPassword) { // 수정 모드에서 비밀번호 변경 시
             showAdminNotificationModal('비밀번호가 일치하지 않습니다.');
             return;
        }

        const payload = {
            name,
            email,
            role,
            ...permissions,
        };

        if (!isEditMode || password) { // Add mode or password explicitly changed in edit mode
            payload.password = password; // Hashed in backend
        }
        
        onSave(payload, isEditMode, initialData?.username); // Pass username for edit mode
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.modalCloseButton} onClick={onClose}>&times;</button>
                <h2 className={styles.modalTitle}>{isEditMode ? '관리자 수정' : '새 관리자 추가'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="managerName">이름</label>
                        <input type="text" id="managerName" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="managerEmail">이메일 (로그인 계정)</label>
                        <input type="email" id="managerEmail" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isEditMode} /> {/* Email cannot be changed in edit mode (PK) */}
                    </div>
                    {!isEditMode || password ? ( // Show password fields only for add mode or if user has started typing in edit mode
                        <>
                            <div className={styles.formGroup}>
                                <label htmlFor="managerPassword">비밀번호 {!isEditMode && '(필수)'}</label>
                                <input type="password" id="managerPassword" value={password} onChange={handlePasswordChange} required={!isEditMode} />
                                {passwordError && password.length > 0 && <p style={{ color: 'red', fontSize: '0.8em', marginTop: '5px' }}>{passwordError}</p>}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="confirmPassword">비밀번호 확인 {!isEditMode && '(필수)'}</label>
                                <input type="password" id="confirmPassword" value={confirmPassword} onChange={handleConfirmPasswordChange} required={!isEditMode} />
                                {confirmPassword.length > 0 && password !== confirmPassword && <p style={{ color: 'red', fontSize: '0.8em', marginTop: '5px' }}>비밀번호가 일치하지 않습니다.</p>}
                            </div>
                        </>
                    ) : (
                        <div className={styles.formGroup} style={{ marginBottom: '25px' }}>
                            <label>비밀번호</label>
                            <span style={{ fontSize: '0.9em', color: '#666' }}>변경하려면 새 비밀번호를 입력하세요.</span>
                            <button type="button" onClick={() => setPassword('')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '0.9em', marginLeft: '10px' }}>변경</button>
                        </div>
                    )}
                    
                    <div className={styles.formGroup}>
                        <label htmlFor="managerRole">권한 레벨 (Role)</label>
                        <select id="managerRole" value={role} onChange={(e) => setRole(e.target.value)} required>
                            <option value="Super Admin">Super Admin (전체 접근)</option>
                            <option value="Product Manager">Product Manager (상품/카테고리/배너 접근) </option>
                            <option value="Order Manager">Order Manager (주문/결제/배송 접근)</option>
                            <option value="CS Manager">CS Manager (Q&A 접근)</option>
                            {/* 필요한 역할 추가 */}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>개별 권한 설정</label>
                        <div className={styles.permissionGrid}>
                            <div className={styles.permissionItem}>
                                <input type="checkbox" name="canManageProduct" checked={permissions.canManageProduct} onChange={handlePermissionChange} id="permProduct" disabled={role === 'Super Admin'} />
                                <label htmlFor="permProduct">상품 관리</label>
                            </div>
                            <div className={styles.permissionItem}>
                                <input type="checkbox" name="canManageOrder" checked={permissions.canManageOrder} onChange={handlePermissionChange} id="permOrder" disabled={role === 'Super Admin'} />
                                <label htmlFor="permOrder">오더 관리</label>
                            </div>
                            <div className={styles.permissionItem}>
                                <input type="checkbox" name="canManagePacking" checked={permissions.canManagePacking} onChange={handlePermissionChange} id="permPacking" disabled={role === 'Super Admin'} />
                                <label htmlFor="permPacking">포장 관리</label>
                            </div>
                            <div className={styles.permissionItem}>
                                <input type="checkbox" name="canManageUserApproval" checked={permissions.canManageUserApproval} onChange={handlePermissionChange} id="permUser" disabled={role === 'Super Admin'} />
                                <label htmlFor="permUser">회원 승인</label>
                            </div>
                            <div className={styles.permissionItem}>
                                <input type="checkbox" name="canManageQnA" checked={permissions.canManageQnA} onChange={handlePermissionChange} id="permQnA" disabled={role === 'Super Admin'} />
                                <label htmlFor="permQnA">Q&A 관리</label>
                            </div>
                            <div className={styles.permissionItem}>
                                <input type="checkbox" name="canManageBanner" checked={permissions.canManageBanner} onChange={handlePermissionChange} id="permBanner" disabled={role === 'Super Admin'} />
                                <label htmlFor="permBanner">배너 관리</label>
                            </div>
                        </div>
                    </div>
                    <button type="submit" className={styles.modalButton}>{isEditMode ? '변경 사항 저장' : '관리자 추가'}</button>
                </form>
            </div>
        </div>
    );
}


export default function ManagerPage() {
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('All'); // Example filter for status or role
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [initialManagerData, setInitialManagerData] = useState(null);

    const router = useRouter();
    const { showAdminNotificationModal, showAdminConfirmationModal } = useAdminModal();

    const fetchManagers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const queryParams = new URLSearchParams({
                ...(searchTerm && { search: searchTerm }),
                ...(filterAction && filterAction !== 'All' && { role: filterAction }), // Filter by role or status
            }).toString();

            const res = await fetch(`/api/admin/manager?${queryParams}`);
            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }
            const data = await res.json();
            setManagers(data.items || []); // API에서 items와 totalPages를 반환한다고 가정
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error('Failed to fetch managers:', err);
            setError(`관리자 목록을 불러오는 데 실패했습니다: ${err.message}`);
            showAdminNotificationModal(`관리자 목록을 불러오는 데 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterAction, showAdminNotificationModal]);

    useEffect(() => {
        fetchManagers();
    }, [fetchManagers]);

    const handleSearch = () => {
        setCurrentPage(1);
        fetchManagers();
    };

    const handleAddManagerClick = () => {
        setEditMode(false);
        setInitialManagerData(null);
        setIsAddEditModalOpen(true);
    };

    const handleEditManagerClick = (manager) => {
        setEditMode(true);
        setInitialManagerData(manager);
        setIsAddEditModalOpen(true);
    };

    const handleSaveManager = async (payload, isEditMode, username = null) => {
        setLoading(true);
        try {
            let res;
            if (isEditMode) {
                res = await fetch(`/api/admin/manager/${username}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch('/api/admin/manager', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Error: ${res.status}`);
            }

            showAdminNotificationModal(`관리자가 성공적으로 ${isEditMode ? '수정' : '추가'}되었습니다.`);
            fetchManagers(); // 데이터 새로고침
        } catch (err) {
            console.error('Failed to save manager:', err);
            showAdminNotificationModal(`관리자 ${isEditMode ? '수정' : '추가'}에 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
            setIsAddEditModalOpen(false);
        }
    };

    const handleDeleteManager = async (username) => {
        showAdminConfirmationModal(
            '정말로 이 관리자를 삭제하시겠습니까?',
            async () => {
                setLoading(true);
                try {
                    const res = await fetch(`/api/admin/manager/${username}`, {
                        method: 'DELETE',
                    });
                    if (!res.ok) {
                        const errorData = await res.json();
                        throw new Error(errorData.message || `Error: ${res.status}`);
                    }
                    showAdminNotificationModal('관리자가 성공적으로 삭제되었습니다.');
                    fetchManagers();
                } catch (err) {
                    console.error('Failed to delete manager:', err);
                    showAdminNotificationModal(`관리자 삭제에 실패했습니다: ${err.message}`);
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
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

    if (loading) {
        return <div className={styles.container}>Loading managers...</div>;
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
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="All">All Roles</option>
                        <option value="Super Admin">Super Admin</option>
                        <option value="Product Manager">Product Manager</option>
                        <option value="Order Manager">Order Manager</option>
                        <option value="CS Manager">CS Manager</option>
                        {/* Add more role filters as needed */}
                    </select>
                    <button onClick={handleAddManagerClick} className={styles.addButton}>+ Add</button>
                </div>
            </header>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>관리자 정보</th>
                            <th>계정 정보</th>
                            <th>Product.M</th>
                            <th>Order.M</th>
                            <th>Packing.M</th>
                            <th>User.M</th>
                            <th>Q&A.M</th>
                            <th>Banner.M</th>
                            <th>Setting</th>
                        </tr>
                    </thead>
                    <tbody>
                        {managers.length > 0 ? (
                            managers.map(manager => (
                                <tr key={manager.username}>
                                    <td>{manager.name}</td>
                                    <td>{manager.email}</td>
                                    <td>{manager.canManageProduct ? <CheckIcon /> : <XIcon />}</td>
                                    <td>{manager.canManageOrder ? <CheckIcon /> : <XIcon />}</td>
                                    <td>{manager.canManagePacking ? <CheckIcon /> : <XIcon />}</td>
                                    <td>{manager.canManageUserApproval ? <CheckIcon /> : <XIcon />}</td>
                                    <td>{manager.canManageQnA ? <CheckIcon /> : <XIcon />}</td>
                                    <td>{manager.canManageBanner ? <CheckIcon /> : <XIcon />}</td>
                                    <td>
                                        <div className={styles.actionButtons}>
                                            <button onClick={() => handleEditManagerClick(manager)} className={styles.actionButton}>
                                                <img src="/images/write.png" alt="수정" />
                                            </button>
                                            <button onClick={() => handleDeleteManager(manager.username)} className={styles.actionButton}>
                                                <img src="/images/delete.png" alt="삭제" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                                    표시할 관리자 계정이 없습니다.
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

            {isAddEditModalOpen && (
                <AddEditManagerModal
                    isOpen={isAddEditModalOpen}
                    onClose={() => setIsAddEditModalOpen(false)}
                    onSave={handleSaveManager}
                    isEditMode={editMode}
                    initialData={initialManagerData}
                />
            )}
        </div>
    );
}