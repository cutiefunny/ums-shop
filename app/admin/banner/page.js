// /admin/banner/page.js
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from '../common.module.css'; // 배너 페이지 전용 CSS Modules
import modalStyles from '../category-management/modals/modal.module.css'; // 공통 모달 스타일 재사용
import { useAdminModal } from '@/contexts/AdminModalContext'; // AdminModalContext 사용

// AWS SDK import는 클라이언트 컴포넌트에서 직접 사용하는 대신 API Routes를 통해 사용해야 합니다.
// 여기서는 API Route를 호출하는 것으로 가정합니다.

const ITEMS_PER_PAGE = 5;

// 배너 추가/수정 모달 컴포넌트
function AddEditBannerModal({ isOpen, onClose, onSave, isEditMode, initialData }) {
    const [order, setOrder] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [link, setLink] = useState('');
    const [location, setLocation] = useState('Home'); // Default location
    const [status, setStatus] = useState('노출 중'); // Default status
    const [imageFile, setImageFile] = useState(null); // File object for new upload
    const [previewUrl, setPreviewUrl] = useState(null); // Preview for new image
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isEditMode && initialData) {
            setOrder(initialData.order);
            setImageUrl(initialData.imageUrl); // Existing image URL
            setPreviewUrl(initialData.imageUrl); // Set preview to existing image
            setLink(initialData.link);
            setLocation(initialData.location);
            setStatus(initialData.status);
            setImageFile(null); // Reset file input
        } else {
            // Reset for Add mode
            setOrder('');
            setImageUrl('');
            setLink('');
            setLocation('Home');
            setStatus('노출 중');
            setImageFile(null);
            setPreviewUrl(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Clear file input field
            }
        }
    }, [isOpen, isEditMode, initialData]);

    const handleFileChange = (e) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file)); // Create local URL for preview
        } else {
            setImageFile(null);
            setPreviewUrl(null);
            alert('이미지 파일만 업로드 가능합니다.');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!order || !link || !location || !status || (!imageFile && !imageUrl)) {
            alert('모든 필수 정보를 입력하고 이미지를 업로드해주세요.');
            return;
        }

        const formData = new FormData();
        formData.append('order', order);
        formData.append('link', link);
        formData.append('location', location);
        formData.append('status', status);

        if (imageFile) {
            formData.append('imageFile', imageFile); // New image file
        } else if (imageUrl) {
            formData.append('imageUrl', imageUrl); // Existing image URL if not changed
        }

        onSave(formData, isEditMode, initialData?.bannerId); // Pass bannerId for edit mode
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>&times;</button>
                <h2 className={styles.modalTitle}>{isEditMode ? '배너 수정' : '새 배너 추가'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="bannerOrder">순서</label>
                        <input
                            type="number"
                            id="bannerOrder"
                            value={order}
                            onChange={(e) => setOrder(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="bannerLink">링크</label>
                        <input
                            type="url"
                            id="bannerLink"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="예: https://example.com"
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="bannerLocation">위치</label>
                        <select
                            id="bannerLocation"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            required
                        >
                            <option value="Home">Home</option>
                            <option value="Open">Open</option>
                            {/* 필요에 따라 위치 옵션 추가 */}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="bannerStatus">상태</label>
                        <select
                            id="bannerStatus"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            required
                        >
                            <option value="노출 중">노출 중</option>
                            <option value="숨김">숨김</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="bannerImage">배너 이미지</label>
                        <input
                            type="file"
                            id="bannerImage"
                            accept="image/*"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            required={!isEditMode || !imageUrl} // 추가 모드이거나 기존 이미지가 없으면 필수
                        />
                        <p className={styles.fileUploadInfo}>권장 이미지 비율: 2:1 또는 16:9</p>
                        {previewUrl ? (
                            <div className={styles.imagePreviewContainer}>
                                <img src={previewUrl} alt="Image Preview" className={styles.imagePreview} />
                            </div>
                        ) : (
                            <div className={styles.imagePreviewContainer}>
                                <span className={styles.noImageText}>이미지 없음</span>
                            </div>
                        )}
                    </div>
                    <button type="submit" className={styles.modalButton}>{isEditMode ? '변경 사항 저장' : '추가'}</button>
                </form>
            </div>
        </div>
    );
}

export default function BannerManagementPage() {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLocation, setFilterLocation] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [initialBannerData, setInitialBannerData] = useState(null);

    const router = useRouter();
    const { showAdminNotificationModal, showAdminConfirmationModal } = useAdminModal();

    const fetchBanners = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const queryParams = new URLSearchParams({
                ...(searchTerm && { search: searchTerm }),
                ...(filterLocation && filterLocation !== 'All' && { location: filterLocation }),
            }).toString();

            const res = await fetch(`/api/admin/banner?${queryParams}`); // 배너 API 엔드포인트 호출
            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }
            const data = await res.json();
            // order 필드를 기준으로 정렬
            setBanners(data.sort((a, b) => a.order - b.order) || []);
        } catch (err) {
            console.error('Failed to fetch banners:', err);
            setError(`배너 목록을 불러오는 데 실패했습니다: ${err.message}`);
            showAdminNotificationModal(`배너 목록을 불러오는 데 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterLocation, showAdminNotificationModal]);

    useEffect(() => {
        fetchBanners();
    }, [fetchBanners]);

    const handleSearch = () => {
        setCurrentPage(1);
        fetchBanners(); // 검색 버튼 클릭 시 즉시 데이터 다시 불러옴
    };

    const handleFilterLocationChange = (e) => {
        setFilterLocation(e.target.value);
        setCurrentPage(1);
        // fetchBanners는 useEffect에서 filterLocation 변경 감지하여 호출됨
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleAddBannerClick = () => {
        setEditMode(false);
        setInitialBannerData(null);
        setIsAddEditModalOpen(true);
    };

    const handleEditBannerClick = (banner) => {
        setEditMode(true);
        setInitialBannerData(banner);
        setIsAddEditModalOpen(true);
    };

    const handleSaveBanner = async (formData, isEditMode, bannerId = null) => {
        setLoading(true);
        try {
            let imageUrlToSave = formData.get('imageUrl'); // 기존 이미지 URL
            const imageFile = formData.get('imageFile'); // 새로 업로드할 파일

            if (imageFile && imageFile.size > 0) {
                // S3 Presigned URL 요청 및 이미지 업로드
                const s3UploadUrlResponse = await fetch(`/api/s3-upload-url?filename=${imageFile.name}`);
                if (!s3UploadUrlResponse.ok) {
                    const errorData = await s3UploadUrlResponse.json();
                    throw new Error(errorData.message || 'Failed to get S3 upload URL');
                }
                const { url, fields } = await s3UploadUrlResponse.json();

                const uploadFormData = new FormData();
                Object.entries(fields).forEach(([key, value]) => uploadFormData.append(key, value));
                uploadFormData.append('file', imageFile);

                const s3Response = await fetch(url, { method: 'POST', body: uploadFormData });
                if (!s3Response.ok) throw new Error('Failed to upload image to S3');

                const s3BaseUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/`;
                imageUrlToSave = `${s3BaseUrl}${fields.key}`;
            }

            const payload = {
                order: parseInt(formData.get('order')),
                imageUrl: imageUrlToSave,
                link: formData.get('link'),
                location: formData.get('location'),
                status: formData.get('status'),
            };

            let res;
            if (isEditMode) {
                res = await fetch(`/api/admin/banner/${bannerId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch('/api/admin/banner', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Error: ${res.status}`);
            }

            showAdminNotificationModal(`배너가 성공적으로 ${isEditMode ? '수정' : '추가'}되었습니다.`);
            fetchBanners(); // 데이터 새로고침
        } catch (err) {
            console.error('Failed to save banner:', err);
            showAdminNotificationModal(`배너 ${isEditMode ? '수정' : '추가'}에 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
            setIsAddEditModalOpen(false);
        }
    };

    const handleDeleteBanner = async (bannerId) => {
        showAdminConfirmationModal(
            '정말로 이 배너를 삭제하시겠습니까?',
            async () => {
                setLoading(true);
                try {
                    const res = await fetch(`/api/admin/banner/${bannerId}`, {
                        method: 'DELETE',
                    });
                    if (!res.ok) {
                        const errorData = await res.json();
                        throw new Error(errorData.message || `Error: ${res.status}`);
                    }
                    showAdminNotificationModal('배너가 성공적으로 삭제되었습니다.');
                    fetchBanners();
                } catch (err) {
                    console.error('Failed to delete banner:', err);
                    showAdminNotificationModal(`배너 삭제에 실패했습니다: ${err.message}`);
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const handleStatusToggle = async (bannerId, currentStatus) => {
        const newStatus = currentStatus === '노출 중' ? '숨김' : '노출 중';
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/banner/${bannerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Error: ${res.status}`);
            }
            showAdminNotificationModal('배너 상태가 변경되었습니다.');
            fetchBanners();
        } catch (err) {
            console.error('Failed to toggle banner status:', err);
            showAdminNotificationModal(`배너 상태 변경에 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(banners.length / ITEMS_PER_PAGE);
    const currentBanners = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return banners.slice(startIndex, endIndex);
    }, [banners, currentPage]);

    const availableLocations = useMemo(() => {
        const locations = new Set(banners.map(b => b.location));
        return ['All', ...Array.from(locations).sort()];
    }, [banners]);

    if (loading) {
        return <div className={styles.container}>Loading banners...</div>;
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
                        value={filterLocation}
                        onChange={handleFilterLocationChange}
                        className={styles.filterSelect}
                    >
                        {availableLocations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </select>
                    <button onClick={handleAddBannerClick} className={styles.addButton}>+ Add</button>
                </div>
            </header>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>순서</th>
                            <th>미리보기</th>
                            <th>링크</th>
                            <th>위치</th>
                            <th>업로드일</th>
                            <th>상태</th>
                            <th>설정</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentBanners.length > 0 ? (
                            currentBanners.map(banner => (
                                <tr key={banner.bannerId}>
                                    <td>{banner.order}</td>
                                    <td>
                                        {banner.imageUrl ? (
                                            <Image
                                                src={banner.imageUrl}
                                                alt="배너 이미지"
                                                width={100}
                                                height={60}
                                                className={styles.thumbnailImage}
                                            />
                                        ) : (
                                            <span>이미지 없음</span>
                                        )}
                                    </td>
                                    <td>{banner.link}</td>
                                    <td>{banner.location}</td>
                                    <td>{banner.uploadedDate}</td>
                                    <td>
                                        <button
                                            onClick={() => handleStatusToggle(banner.bannerId, banner.status)}
                                            className={`${styles.statusButton} ${
                                                banner.status === '노출 중' ? styles.statusActive : styles.statusHidden
                                            }`}
                                        >
                                            {banner.status}
                                        </button>
                                    </td>
                                    <td>
                                        <div className={styles.actionButtons}>
                                            <button onClick={() => handleEditBannerClick(banner)} className={styles.actionButton}>
                                                <img src="/images/write.png" alt="수정" />
                                            </button>
                                            <button onClick={() => handleDeleteBanner(banner.bannerId)} className={styles.actionButton}>
                                                <img src="/images/delete.png" alt="삭제" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                                    표시할 배너가 없습니다.
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`${styles.paginationButton} ${currentPage === page ? styles.paginationButtonActive : ''}`}
                    >
                        {page}
                    </button>
                ))}
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={styles.paginationButton}
                >
                    &gt;
                </button>
            </div>

            {isAddEditModalOpen && (
                <AddEditBannerModal
                    isOpen={isAddEditModalOpen}
                    onClose={() => setIsAddEditModalOpen(false)}
                    onSave={handleSaveBanner}
                    isEditMode={editMode}
                    initialData={initialBannerData}
                />
            )}
        </div>
    );
}