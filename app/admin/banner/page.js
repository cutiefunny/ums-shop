'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from '../common.module.css';
import { useAdminModal } from '@/contexts/AdminModalContext';

const ITEMS_PER_PAGE = 10;

// 캘린더 아이콘 컴포넌트
const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.8333 3.33331H4.16667C3.24619 3.33331 2.5 4.0795 2.5 4.99998V16.6666C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6666V4.99998C17.5 4.0795 16.7538 3.33331 15.8333 3.33331Z" stroke="#6C757D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.3334 1.66669V5.00002" stroke="#6C757D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.66663 1.66669V5.00002" stroke="#6C757D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2.5 8.33331H17.5" stroke="#6C757D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// 배너 추가/수정 모달 컴포넌트
function AddEditBannerModal({ isOpen, onClose, onSave, isEditMode, initialData }) {
    const [location, setLocation] = useState('Home');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [exposureType, setExposureType] = useState('외부 링크');
    const [link, setLink] = useState('');
    const [status, setStatus] = useState('노출중');
    const [isPriority, setIsPriority] = useState(false);
    
    // 'Open' 위치 선택 시 사용할 페이지 유형 상태 추가
    const [pageType, setPageType] = useState('product'); // 기본값 설정
    const [productId, setProductId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && initialData) {
                setLocation(initialData.location || 'Home');
                setStartDate(initialData.startDate?.split('T')[0] || '');
                setEndDate(initialData.endDate?.split('T')[0] || '');
                setPreviewUrl(initialData.imageUrl || null);
                setExposureType(initialData.exposureType || '외부 링크');
                setLink(initialData.link || '');
                setStatus(initialData.status || '노출중');
                setIsPriority(initialData.isPriority || false);
                setPageType(initialData.pageType || 'product'); // 수정 시 초기값
                setProductId(initialData.productId || '');
                setCategoryId(initialData.categoryId || '');
                setImageFile(null);
            } else {
                // 추가 모드 상태 초기화
                setLocation('Home');
                setStartDate('');
                setEndDate('');
                setImageFile(null);
                setPreviewUrl(null);
                setExposureType('외부 링크');
                setLink('');
                setStatus('노출중');
                setIsPriority(false);
                setPageType('Notice'); // 추가 시 초기값
            }
        }
    }, [isOpen, isEditMode, initialData]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setImageFile(null);
            setPreviewUrl(isEditMode && initialData ? initialData.imageUrl : null);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        let requiredFieldsMet = true;
        // 'Home' 위치일 때는 링크 주소가 필수 (단, 노출 방식이 '없음'이 아닐 때)
        if (location === 'Home' && exposureType !== '없음' && !link) {
            requiredFieldsMet = false;
        }
        // 공통 필수 필드
        if (!startDate || !endDate || (!imageFile && !previewUrl)) {
            requiredFieldsMet = false;
        }

        if (!requiredFieldsMet) {
            alert('필수 항목을 모두 입력해주세요.');
            return;
        }

        const bannerData = {
            location,
            startDate,
            endDate,
            imageFile,
            imageUrl: previewUrl,
            exposureType,
            link,
            pageType, // 페이지 유형 상태 전달
            status,
            isPriority,
        };
        onSave(bannerData, isEditMode, initialData?.bannerId);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={styles.modalContentWide} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        <img src="/images/imageBox.png" alt="" style={{width: '24px', marginRight: '8px'}} />
                        {isEditMode ? '배너 수정' : '배너 추가'}
                    </h2>
                    <button className={styles.closeButton} onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit} className={styles.modalBody}>
                    {/* 배너 위치 */}
                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>배너 위치</label>
                        <div className={styles.radioGroup}>
                            <label><input type="radio" name="location" value="Home" checked={location === 'Home'} onChange={(e) => setLocation(e.target.value)} /> Home</label>
                            <label><input type="radio" name="location" value="Open" checked={location === 'Open'} onChange={(e) => setLocation(e.target.value)} /> Open</label>
                        </div>
                    </div>
                    
                    {/* 노출 기간 (항상 표시) */}
                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>노출 기간</label>
                        <div className={styles.dateRangePicker}>
                            <div className={styles.dateInputWrapper}>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                <CalendarIcon />
                            </div>
                            <span>-</span>
                            <div className={styles.dateInputWrapper}>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                <CalendarIcon />
                            </div>
                        </div>
                    </div>

                    {/* 배너 이미지 (항상 표시) */}
                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>배너 이미지</label>
                        <div className={styles.imageUploadSection}>
                            <div className={styles.imagePreviewBox}>
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Banner preview" />
                                ) : (
                                    <span>이미지 미리보기</span>
                                )}
                            </div>
                            <button type="button" className={styles.uploadButton} onClick={() => fileInputRef.current?.click()}>
                                <img src="/images/attach.png" alt="" style={{width: '16px', marginRight: '4px'}}/>
                                이미지 업로드
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                            <p className={styles.formHint}>300*260로 업로드 권장. 이외의 부분은 잘려서 보여집니다.</p>
                        </div>
                    </div>
                    
                    {/* 노출 방식 (항상 표시) */}
                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>노출 방식</label>
                        <div className={styles.radioGroup}>
                            <label><input type="radio" name="exposureType" value="외부 링크" checked={exposureType === '외부 링크'} onChange={(e) => setExposureType(e.target.value)} /> 외부 링크</label>
                            <label><input type="radio" name="exposureType" value="내부 페이지" checked={exposureType === '내부 페이지'} onChange={(e) => setExposureType(e.target.value)} /> 내부 페이지</label>
                            <label><input type="radio" name="exposureType" value="없음" checked={exposureType === '없음'} onChange={(e) => setExposureType(e.target.value)} /> 없음</label>
                        </div>
                    </div>
                    
                    {/* location 값에 따라 '링크 주소' 또는 '페이지 유형' 표시 */}
                    {location === 'Home' ? (
                        <div className={styles.formRow}>
                            <label className={styles.formLabel}>링크 주소</label>
                            <input type="text" className={styles.formInputFull} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} disabled={exposureType === '없음'}/>
                        </div>
                    ) : ( // location === 'Open'
                        <div className={styles.formRowOpen}>
                            <div className={styles.formRow}>
                                <label className={styles.formLabel}>페이지 유형</label>
                            
                                <select className={styles.formInputFull} value={pageType} onChange={(e) => setPageType(e.target.value)} disabled={exposureType === '없음'}>
                                    <option value="product">상품</option>
                                    <option value="category">카테고리</option>
                                    {/* 필요에 따라 다른 페이지 유형 추가 */}
                                </select>
                            </div>
                            <div className={styles.formRow}>
                                {/* pageType='product'일 경우 input, pageType='category'일 경우 select */}
                                <label className={styles.formLabel}></label>
                                {pageType === 'product' ? (
                                    <input type="text" className={styles.formInputFull} placeholder="상품 ID" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={exposureType === '없음'} />
                                ) : (
                                    <select className={styles.formInputFull} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={exposureType === '없음'}>
                                        <option value="">카테고리 선택</option>
                                        {/* 카테고리 옵션 추가 */}
                                    </select>
                                )}
                            </div>
                        </div>
                        
                    )}

                    {/* 배너 상태 (항상 표시) */}
                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>배너 상태</label>
                        <div className={styles.radioGroup}>
                            <label><input type="radio" name="status" value="노출중" checked={status === '노출중'} onChange={(e) => setStatus(e.target.value)} /> 노출중</label>
                            <label><input type="radio" name="status" value="숨김" checked={status === '숨김'} onChange={(e) => setStatus(e.target.value)} /> 숨김</label>
                        </div>
                    </div>

                    {/* 우선 노출 (항상 표시) */}
                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>우선 노출</label>
                        <div className={styles.radioGroup}>
                            <label>
                                <input 
                                    type="checkbox" 
                                    checked={isPriority} 
                                    onChange={(e) => setIsPriority(e.target.checked)} 
                                /> 
                                우선 노출
                            </label>
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>취소</button>
                        <button type="submit" className={styles.saveButton}>저장</button>
                    </div>
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

            const res = await fetch(`/api/admin/banner?${queryParams}`);
            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }
            const data = await res.json();
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
    
    const handleSaveBanner = async (bannerData, isEditMode, bannerId = null) => {
        setLoading(true);
        try {
            let imageUrlToSave = bannerData.imageUrl;
            
            // 'Open' 위치일 경우, pageType에 따라 link를 생성
            if (bannerData.location === 'Open' && bannerData.pageType) {
                const pageLinks = {
                    'Notice': '/notice',
                    'Q&A': '/q-and-a',
                    'Event': '/events'
                };
                bannerData.link = pageLinks[bannerData.pageType] || '';
            }
            
            const { imageFile, ...otherData } = bannerData;

            if (imageFile) {
                const s3UploadUrlResponse = await fetch(`/api/s3-upload-url?filename=${encodeURIComponent(imageFile.name)}`);
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
                ...otherData,
                imageUrl: imageUrlToSave,
                order: initialBannerData?.order || 99, 
            };
            delete payload.imageFile;

            const url = isEditMode ? `/api/admin/banner/${bannerId}` : '/api/admin/banner';
            const method = isEditMode ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Error: ${res.status}`);
            }

            showAdminNotificationModal(`배너가 성공적으로 ${isEditMode ? '수정' : '추가'}되었습니다.`);
            fetchBanners();
        } catch (err) {
            console.error('Failed to save banner:', err);
            showAdminNotificationModal(`배너 ${isEditMode ? '수정' : '추가'}에 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
            setIsAddEditModalOpen(false);
        }
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchBanners();
    };

    const handleFilterLocationChange = (e) => {
        setFilterLocation(e.target.value);
        setCurrentPage(1);
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
    
    const handleStatusToggle = async (banner) => {
        const newStatus = banner.status === '노출중' ? '숨김' : '노출중';
        setLoading(true);
        try {
            const payload = { ...banner, status: newStatus };
            const res = await fetch(`/api/admin/banner/${banner.bannerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
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

    if (loading && banners.length === 0) {
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
                                    <td>{banner.uploadedDate?.split('T')[0]}</td>
                                    <td>
                                        <button
                                            onClick={() => handleStatusToggle(banner)}
                                            className={`${styles.statusButton} ${
                                                banner.status === '노출중' ? styles.statusActive : styles.statusHidden
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
                    disabled={currentPage === totalPages || totalPages === 0}
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