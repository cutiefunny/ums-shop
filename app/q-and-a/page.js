// app/q-and-a/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../my-questions/my-questions.module.css'; // my-questions.module.css import
import commonStyles from '../admin/common.module.css'; // 공통 스타일 재활용
import { useAuth } from '@/contexts/AuthContext'; // 사용자 정보 (이메일, 이름, 선박명) 가져오기
import { useModal } from '@/contexts/ModalContext'; // 알림 모달 사용
import Link from 'next/link';

// 아이콘 컴포넌트
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const AttachIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 13.5l-3.24-3.24a2.82 2.82 0 0 0-3.96 0L2 17"></path>
    <path d="M13 7H7a2 2 0 0 0-2 2v6"></path>
  </svg>
);

export default function QnAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn } = useAuth();
  const { showModal } = useModal();

  // 탭 상태 관리: 'ask' (질문하기) 또는 'my' (내 질문)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'ask'); 

  // Ask Question 폼 상태
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const askFileInputRef = useRef(null); // Ask Question 폼의 파일 입력 참조

  // My Questions 리스트 상태
  const [qnaList, setQnaList] = useState([]);
  const [myQuestionsLoading, setMyQuestionsLoading] = useState(true);
  const [myQuestionsError, setMyQuestionsError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All'); // My Questions 필터 상태

  // 공통 로딩 상태
  const [commonLoading, setCommonLoading] = useState(false);

  // URL 쿼리 파라미터에 따라 탭 활성화
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && (tabFromUrl === 'ask' || tabFromUrl === 'my')) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // My Questions 데이터 불러오기
  const fetchMyQuestions = useCallback(async () => {
    if (!isLoggedIn || !user?.email) {
      setMyQuestionsLoading(false);
      return;
    }

    try {
      setMyQuestionsLoading(true);
      setMyQuestionsError(null);
      // 백엔드 API (admin/q-and-a)를 호출하여 모든 Q&A를 가져온 후 클라이언트에서 필터링
      // 실제 구현에서는 사용자 이메일로 필터링하는 API를 사용하는 것이 효율적입니다.
      const response = await fetch('/api/admin/q-and-a'); 
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // 현재 로그인된 사용자의 질문만 필터링
      const userQuestions = data.items.filter(q => q.userEmail === user.email);
      setQnaList(userQuestions || []);

    } catch (err) {
      console.error("Error fetching Q&A:", err);
      setMyQuestionsError(`질문 내역을 불러오는 데 실패했습니다: ${err.message}`);
      showModal(`질문 내역을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setMyQuestionsLoading(false);
    }
  }, [isLoggedIn, user, showModal]);

  useEffect(() => {
    if (activeTab === 'my') {
      fetchMyQuestions();
    }
  }, [activeTab, fetchMyQuestions]);


  // Ask Question 폼 유효성 검사
  const isAskFormValid = useMemo(() => {
    return category !== '' && title.trim() !== '' && message.trim() !== '';
  }, [category, title, message]);

  // Ask Question 파일 선택 핸들러
  const handleAskFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        showModal('Only image files are allowed.');
        setAttachedFile(null);
        setFilePreviewUrl(null);
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showModal('Image file size cannot exceed 5MB.');
        setAttachedFile(null);
        setFilePreviewUrl(null);
        e.target.value = '';
        return;
      }

      setAttachedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
    }
  };

  // Ask Question 첨부 파일 제거 핸들러
  const handleRemoveAskFile = () => {
    setAttachedFile(null);
    setFilePreviewUrl(null);
    if (askFileInputRef.current) {
      askFileInputRef.current.value = '';
    }
  };

  // Ask Question 제출 핸들러
  const handleAskSubmit = async (e) => {
    e.preventDefault();
    if (!isAskFormValid) {
      showModal('Please fill in all required fields.');
      return;
    }

    if (!isLoggedIn || !user?.email) {
      showModal('Please log in to submit a question.');
      router.push('/');
      return;
    }

    setCommonLoading(true);
    let imageUrl = null;

    try {
      if (attachedFile) {
        showModal('Uploading image...');
        const s3UploadUrlResponse = await fetch(`/api/s3-upload-url?filename=${attachedFile.name}`);
        if (!s3UploadUrlResponse.ok) {
          const errorData = await s3UploadUrlResponse.json();
          throw new Error(errorData.message || 'Failed to get S3 upload URL');
        }
        const { url, fields } = await s3UploadUrlResponse.json();

        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
        formData.append('file', attachedFile);

        const s3Response = await fetch(url, {
          method: 'POST',
          body: formData,
        });

        if (!s3Response.ok) {
          throw new Error('Failed to upload image to S3');
        }
        const s3BaseUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/`;
        imageUrl = `${s3BaseUrl}${fields.key}`;
      }

      showModal('Submitting your question...');
      const qnaData = {
        category: category,
        title: title.trim(),
        question: message.trim(),
        imageUrl: imageUrl,
        name: user.name,
        userEmail: user.email,
        shipName: user.shipName,
      };

      const response = await fetch('/api/admin/q-and-a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(qnaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit question.');
      }

      showModal('Your question has been successfully submitted.', () => {
        // 성공 후 폼 초기화 및 'My Questions' 탭으로 전환
        setCategory('');
        setTitle('');
        setMessage('');
        setAttachedFile(null);
        setFilePreviewUrl(null);
        if (askFileInputRef.current) askFileInputRef.current.value = '';
        setActiveTab('my'); // 탭 전환
        router.replace('/q-and-a?tab=my'); // URL 업데이트
        fetchMyQuestions(); // My Questions 목록 새로고침
      });
    } catch (err) {
      console.error('Error submitting question:', err);
      showModal(`Failed to submit question: ${err.message}`);
    } finally {
      setCommonLoading(false);
    }
  };

  // My Questions 필터링된 목록
  const filteredMyQnAs = useMemo(() => {
    if (!qnaList) return [];
    return qnaList.filter(qna => {
      return filterCategory === 'All' || qna.category === filterCategory;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // 최신순 정렬
  }, [qnaList, filterCategory]);

  const handleMyQuestionsFilterChange = (category) => {
    setFilterCategory(category);
  };

  const getMyQuestionsStatusClass = (status) => {
    return status.toLowerCase() === 'pending' ? styles.Pending : styles.Answered;
  };


  if (!isLoggedIn) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.emptyMessage}>
          <p>로그인 후 이용 가능한 페이지입니다.</p>
          <button onClick={() => router.push('/')} className={commonStyles.button} style={{marginTop: '20px'}}>로그인</button>
        </div>
      </div>
    );
  }

  if (commonLoading || myQuestionsLoading) {
    return <div className={styles.pageContainer}><div className={styles.emptyMessage}>데이터를 불러오는 중...</div></div>;
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.iconButton}>
          <BackIcon />
        </button>
        <h1 className={styles.title}>Q&A</h1>
        <div style={{ width: '24px' }}></div>
      </header>

      <div className={styles.qaTabs}>
        <button
          className={`${styles.qaTabButton} ${activeTab === 'ask' ? styles.active : ''}`}
          onClick={() => {
            setActiveTab('ask');
            router.replace('/q-and-a?tab=ask');
          }}
        >
          Ask a Question
        </button>
        <button
          className={`${styles.qaTabButton} ${activeTab === 'my' ? styles.active : ''}`}
          onClick={() => {
            setActiveTab('my');
            router.replace('/q-and-a?tab=my');
          }}
        >
          My Questions
        </button>
      </div>

      <main className={styles.mainContent}>
        {activeTab === 'ask' && (
          <div className={styles.formContainer}>
            <form onSubmit={handleAskSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={styles.formSelect}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Order">Order</option>
                  <option value="Payment">Payment</option>
                  <option value="Delivery">Delivery</option>
                  <option value="ETC">ETC</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter the subject of your message"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="If you have any questions or concerns, please leave us a message here."
                  className={styles.formTextarea}
                  rows="6"
                  required
                />
              </div>

              <div className={styles.imageUploadArea}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  ref={askFileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleAskFileChange}
                />
                {!attachedFile ? (
                  <button
                    type="button"
                    onClick={() => askFileInputRef.current.click()}
                    className={styles.imageUploadButton}
                  >
                    +
                  </button>
                ) : (
                  <div className={styles.imagePreviewContainer}>
                    <img src={filePreviewUrl} alt="Preview" />
                    <button
                      type="button"
                      onClick={handleRemoveAskFile}
                      className={styles.removeImageButton}
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}

        {activeTab === 'my' && (
          <>
            <div className={styles.filterChips}>
              <button
                className={`${styles.filterChip} ${filterCategory === 'All' ? styles.active : ''}`}
                onClick={() => handleMyQuestionsFilterChange('All')}
              >
                All
              </button>
              <button
                className={`${styles.filterChip} ${filterCategory === 'Order' ? styles.active : ''}`}
                onClick={() => handleMyQuestionsFilterChange('Order')}
              >
                Order
              </button>
              <button
                className={`${styles.filterChip} ${filterCategory === 'Payment' ? styles.active : ''}`}
                onClick={() => handleMyQuestionsFilterChange('Payment')}
              >
                Payment
              </button>
              <button
                className={`${styles.filterChip} ${filterCategory === 'Delivery' ? styles.active : ''}`}
                onClick={() => handleMyQuestionsFilterChange('Delivery')}
              >
                Delivery
              </button>
              <button
                className={`${styles.filterChip} ${filterCategory === 'ETC' ? styles.active : ''}`}
                onClick={() => handleMyQuestionsFilterChange('ETC')}
              >
                ETC
              </button>
            </div>

            {myQuestionsError ? (
              <div className={`${styles.emptyMessage} ${commonStyles.errorText}`}>오류: {myQuestionsError}</div>
            ) : filteredMyQnAs.length > 0 ? (
              <div className={styles.qaList}>
                {filteredMyQnAs.map(qna => (
                  <Link href={`/q-and-a/${qna.id}`} key={qna.id} className={styles.qaListItemLink}> {/* Link 추가 */}
                    <div className={styles.qaListItem}>
                      <div className={styles.qaHeader}>
                        <span className={`${styles.qaStatus} ${getMyQuestionsStatusClass(qna.status)}`}>
                          {qna.status}
                        </span>
                        <span className={styles.qaCategory}>{qna.category}</span>
                      </div>
                      <h3 className={styles.qaTitle}>{qna.title}</h3>
                      <p className={styles.qaDate}>{qna.date}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyMessage}>
                <p>No questions found.</p>
              </div>
            )}
          </>
        )}
      </main>

        {activeTab === 'ask' && (
      <div className={styles.submitButtonContainer}>
        <button 
          type="submit" 
          onClick={activeTab === 'ask' ? handleAskSubmit : null} // 'My Questions' 탭에서는 버튼 비활성화 또는 다른 액션
          className={styles.submitButton} 
          disabled={activeTab === 'ask' ? (!isAskFormValid || commonLoading) : true} // 'My Questions' 탭에서는 항상 비활성화
        >
          {commonLoading ? 'Submitting...' : 'Submit'}
        </button>
      </div>
        )}
    </div>
  );
}
