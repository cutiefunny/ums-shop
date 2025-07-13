// app/q-and-a/[id]/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import styles from '../../my-questions/my-questions.module.css'; // my-questions.module.css 재활용
import commonStyles from '../../admin/common.module.css'; // 공통 스타일 재활용
import AuthHeader from '@/components/AuthHeader'; // 뒤로가기 버튼을 위한 공통 헤더 컴포넌트
import { useModal } from '@/contexts/ModalContext'; // 알림 모달 사용

const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;

export default function QnADetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params; // URL에서 Q&A ID 가져오기
  const { showModal } = useModal();

  const [qna, setQna] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Q&A 상세 정보를 불러오는 함수
  const fetchQnADetail = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError('Q&A ID is missing.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // 백엔드 API (admin/q-and-a/[id])를 호출하여 상세 Q&A 데이터를 가져옵니다.
      const response = await fetch(`/api/admin/q-and-a/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setQna(data);
    } catch (err) {
      console.error('Error fetching Q&A detail:', err);
      setError(`Failed to load Q&A details: ${err.message}`);
      showModal(`Failed to load Q&A details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [id, showModal]);

  useEffect(() => {
    fetchQnADetail();
  }, [fetchQnADetail]);

  const getStatusClass = (status) => {
    return status.toLowerCase() === 'pending' ? styles.Pending : styles.Answered;
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.emptyMessage}>Loading Q&A details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={`${styles.emptyMessage} ${commonStyles.errorText}`}>Error: {error}</div>
      </div>
    );
  }

  if (!qna) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.emptyMessage}>Q&A not found.</div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.iconButton}>
          <BackIcon />
        </button>
        <h1 className={styles.title}>Q&A</h1>
        <div style={{ width: '24px' }}></div> {/* Header spacing */}
      </header>

      <main className={styles.mainContent}>
        <div className={styles.qaListItem} style={{ borderBottom: 'none', paddingBottom: '0' }}>
          <div className={styles.qaHeader}>
            <span className={`${styles.qaStatus} ${getStatusClass(qna.status)}`}>
              {qna.status}
            </span>
            <span className={styles.qaCategory}>{qna.category}</span>
          </div>
          <h3 className={styles.qaTitle}>{qna.title}</h3>
          <p className={styles.qaDate}>{qna.submittedDate}</p> {/* submittedDate 사용 */}
        </div>

        <div className={styles.questionDetailSection}>
          <p className={styles.questionText}>{qna.question}</p>
          {qna.imageUrl && (
            <div className={styles.questionImageContainer}>
              <Image src={qna.imageUrl} alt="Attached image" width={300} height={200} style={{ objectFit: 'contain' }} />
            </div>
          )}
        </div>

        {qna.answer && (
          <div className={styles.answerSection}>
            <p className={styles.answerText}>{qna.answer}</p>
          </div>
        )}
      </main>
    </div>
  );
}
