// app/q-and-a/QnAClientPage.jsx
'use client'; // 이 컴포넌트가 클라이언트에서만 실행됨을 명시

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../my-questions/my-questions.module.css'; // 기존 CSS 모듈 경로 유지
import commonStyles from '../admin/common.module.css'; // 공통 스타일 재활용
import { useAuth } from '@/contexts/AuthContext'; // 사용자 정보 (이메일, 이름, 선박명) 가져오기
import { useModal } from '@/contexts/ModalContext'; // 알림 모달 사용
import { useNotification } from '@/hooks/useNotification'; // useNotification 훅 임포트
import { v4 as uuidv4 } from 'uuid'; // uuidv4 추가
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

export default function QnAClientPage() { // 컴포넌트 이름을 QnAClientPage로 변경
  const router = useRouter();
  const searchParams = useSearchParams(); // 이 컴포넌트 안에서 useSearchParams를 안전하게 사용합니다.
  const { user, isLoggedIn } = useAuth();
  const { showModal } = useModal();
  const addNotification = useNotification(); // useNotification 훅 사용

  // 탭 상태 관리: 'ask' (질문하기) 또는 'my' (내 질문)
  const [activeTab, setActiveTab] = useState('ask'); // 초기값은 'ask'로 설정하고, useEffect에서 URL 파라미터를 읽습니다.

  // Ask Question 폼 상태
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const askFileInputRef = useRef(null);

  // My Questions 리스트 상태
  const [qnaList, setQnaList] = useState([]);
  const [myQuestionsLoading, setMyQuestionsLoading] = useState(true);
  const [myQuestionsError, setMyQuestionsError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');

  // 공통 로딩 상태
  const [commonLoading, setCommonLoading] = useState(false);

  // URL 검색 매개변수에 따라 탭 활성화 (클라이언트에서만 실행)
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
      const response = await fetch('/api/q-and-a'+ `?userEmail=${encodeURIComponent(user.email)}`); // 사용자 이메일을 쿼리 파라미터로 전달
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      const userQuestions = data.items.filter(q => q.userEmail === user.email);
      setQnaList(userQuestions || []);

    } catch (err) {
      console.error("Error fetching Q&A:", err);
      setMyQuestionsError(`Failed to load question history: ${err.message}`);
      showModal(`Failed to load question history: ${err.message}`);
    } finally {
      setMyQuestionsLoading(false);
    }
  }, [isLoggedIn, user, showModal]);

  useEffect(() => {
    // if (activeTab === 'my') {
      fetchMyQuestions();
    // }
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
        const S3_BUCKET_NAME_PUBLIC = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'ums-shop-storage';
        const AWS_REGION_PUBLIC = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-southeast-2';
        const objectKey = fields.key;
        imageUrl = `https://${S3_BUCKET_NAME_PUBLIC}.s3.${AWS_REGION_PUBLIC}.amazonaws.com/${objectKey}`;
      }

      const id = `qna-${uuidv4()}`; // 고유 ID 생성

      showModal('Submitting your question...');
      const qnaData = {
        id: id,
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

      // Q&A 등록 성공 시 알림 추가
      await addNotification({
        code: 'QnA(Requested)',
        category: 'QnA', // 알림 설정 확인을 위해 QnA 카테고리 사용
        title: 'New Q&A Registered',
        en: 'Your inquiry has been successfully registered. We will respond shortly.',
        kr: '문의가 성공적으로 등록되었습니다. 곧 답변 드리겠습니다.',
        id: id,
      });

      showModal('Your question has been successfully submitted.', () => {
        setCategory('');
        setTitle('');
        setMessage('');
        setAttachedFile(null);
        setFilePreviewUrl(null);
        if (askFileInputRef.current) askFileInputRef.current.value = '';
        setActiveTab('my');
        router.replace('/q-and-a?tab=my');
        fetchMyQuestions();
      });
    } catch (err) {
      console.error('Error submitting question:', err);
      showModal(`Failed to submit question: ${err.message}`);
    } finally {
      setCommonLoading(false);
    }
  };

  const filteredMyQnAs = useMemo(() => {
    if (!qnaList) return [];
    return qnaList.filter(qna => {
      return filterCategory === 'All' || qna.category === filterCategory;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
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
        <p>This page is available after logging in.</p>
        <button onClick={() => router.push('/')} className={commonStyles.button} style={{marginTop: '20px'}}>Sign in</button>
      </div>
      </div>
    );
  }

  if (commonLoading || myQuestionsLoading) {
    return <div className={styles.pageContainer}><div className={styles.emptyMessage}>
      <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
    </div></div>;
  }

  return (
    <> {/* Fragment 사용 (Header는 부모 컴포넌트에서 렌더링) */}
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
              <div className={`${styles.emptyMessage} ${commonStyles.errorText}`}>error: {myQuestionsError}</div>
            ) : filteredMyQnAs.length > 0 ? (
              <div className={styles.qaList}>
                {filteredMyQnAs.map(qna => (
                  <Link href={`/q-and-a/${qna.id}`} key={qna.id} className={styles.qaListItemLink}>
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
          <div className={styles.submitButtonWrapper}>
            <button 
              type="submit" 
              onClick={activeTab === 'ask' ? handleAskSubmit : null}
              className={styles.submitButton} 
              disabled={activeTab === 'ask' ? (!isAskFormValid || commonLoading) : true}
            >
              {commonLoading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}