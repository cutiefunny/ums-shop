// /admin/q-and-a/[id]/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from '../q-and-a.module.css'; // Q&A 목록 페이지의 CSS Modules 재사용
import { useAdminModal } from '@/contexts/AdminModalContext'; // AdminModalContext 사용
import { useNotification } from '@/hooks/useNotification'; // useNotification 훅 임포트

export default function QnADetailPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params; // URL에서 Q&A ID 가져오기

    const [qna, setQna] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [answerText, setAnswerText] = useState(''); // 답변 텍스트 상태
    const [status, setStatus] = useState(''); // Q&A 상태 (Pending, Answered)

    const { showAdminNotificationModal } = useAdminModal();
    const addNotification = useNotification(); // useNotification 훅 사용

    // Q&A 상세 정보를 불러오는 함수
    const fetchQnADetail = useCallback(async () => {
        if (!id) return;

        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/admin/q-and-a/${id}`); // 상세 API 엔드포인트 호출
            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }
            const data = await res.json();
            setQna(data);
            setAnswerText(data.answer || ''); // 기존 답변이 있으면 불러옴
            setStatus(data.status || 'Pending'); // 기존 상태가 있으면 불러옴
        } catch (err) {
            console.error('Failed to fetch Q&A detail:', err);
            setError(`Q&A 상세 정보를 불러오는 데 실패했습니다: ${err.message}`);
            showAdminNotificationModal(`Q&A 상세 정보를 불러오는 데 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [id, showAdminNotificationModal]);

    useEffect(() => {
        fetchQnADetail();
    }, [fetchQnADetail]);

    // 답변 저장 또는 업데이트 처리
    const handleSaveReply = async () => {
        if (!qna) return;

        try {
            setLoading(true);
            const newStatus = answerText.trim() ? 'Answered' : 'Pending';
            const updatedData = {
                answer: answerText,
                status: newStatus, // 답변이 있으면 'Answered'로, 없으면 'Pending'
            };

            const res = await fetch(`/api/admin/q-and-a/${id}`, {
                method: 'PUT', // PUT 요청으로 업데이트
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Error: ${res.status}`);
            }

            // 답변이 'Answered' 상태로 변경된 경우에만 사용자에게 알림
            if (newStatus === 'Answered' && qna.userEmail) { // userEmail이 있는지 확인
                await addNotification({
                    code: 'QnA(Answered)',
                    category: 'QnA',
                    title: 'Your Q&A has been Answered',
                    en: 'Your inquiry has been answered. Please check the details.',
                    kr: '문의하신 내용에 답변이 등록되었습니다. 상세 내용을 확인해 주세요.',
                    id: qna.id, // 사용자가 알림 클릭 시 해당 Q&A로 이동할 수 있도록 ID 전달
                    userEmail: qna.userEmail // 어떤 사용자에게 알림을 보낼지 userEmail을 useNotification 훅에 전달
                });
            }

            showAdminNotificationModal('답변이 성공적으로 저장되었습니다.');
            // 저장 후 목록 페이지로 돌아가거나, 최신 데이터로 업데이트 (여기서는 재로딩)
            fetchQnADetail(); 

        } catch (err) {
            console.error('Failed to save reply:', err);
            showAdminNotificationModal(`답변 저장에 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className={styles.container}><div className={styles.mainContent}>Loading Q&A details...</div></div>;
    }

    if (error) {
        return <div className={styles.container}><div className={`${styles.mainContent} ${styles.errorText}`}>Error: {error}</div></div>;
    }

    if (!qna) {
        return <div className={styles.container}><div className={styles.mainContent}>Q&A not found.</div></div>;
    }

    return (
        <div className={styles.container}>
            {/* Sidebar는 AdminLayout에서 처리되므로 여기서는 제거합니다. */}

            <main className={styles.mainContent}>
                <header className={styles.header}>
                    <h1 className={styles.pageTitle}>Q&A Detail</h1>
                    <button onClick={() => router.back()} className={styles.closeButton}>
                        &times;
                    </button>
                </header>

                <section className={styles.tableContainer} style={{ marginBottom: '20px' }}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Title</label>
                        <input type="text" value={qna.title} className={styles.input} readOnly disabled />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Category</label>
                        <input type="text" value={qna.category} className={styles.input} readOnly disabled />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Name</label>
                        <input type="text" value={qna.name} className={styles.input} readOnly disabled />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Submitted Date</label>
                        <input type="text" value={qna.submittedDate} className={styles.input} readOnly disabled />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className={styles.selectFilter}
                        >
                            <option value="Pending">Pending</option>
                            <option value="Answered">Answered</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Question</label>
                        <textarea value={qna.question} className={styles.textarea} rows="5" readOnly disabled />
                    </div>
                </section>

                <section className={styles.tableContainer}>
                    <h2 className={styles.sectionTitle}>Reply</h2>
                    <div className={styles.formGroup}>
                        <label htmlFor="answerText" className={styles.label}>Answer</label>
                        <textarea
                            id="answerText"
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            className={styles.textarea}
                            rows="10"
                            placeholder="답변을 작성해주세요."
                        />
                    </div>
                    <button onClick={handleSaveReply} className={styles.saveButton}>
                        Save Reply
                    </button>
                </section>
            </main>
        </div>
    );
}