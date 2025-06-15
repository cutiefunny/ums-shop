'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation'; // useRouter import
import styles from '../home.module.css';
import { useModal } from '@/contexts/ModalContext'; 

const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.searchIconInBar}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.searchCloseIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

export default function SearchComponent({ isVisible, onClose }) {
  const inputRef = useRef(null);
  const router = useRouter(); // Next.js 라우터 훅 사용
  const [query, setQuery] = useState(''); // 검색어 상태 관리
  const { showModal } = useModal();

  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus();
    }
  }, [isVisible]);

  // Form 제출(Enter) 시 실행될 핸들러
  const handleSearchSubmit = (e) => {
    e.preventDefault(); // 페이지 새로고침 방지
    if (query.trim() === '') {
      showModal('Please enter a keyword.'); // 예외 처리 1: 입력값 없는 경우
      return;
    }
    // 검색 결과 페이지로 이동 (예: /search?q=mykeyword)
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.searchContainer}>
      {/* form으로 감싸서 onSubmit으로 Enter키 처리 */}
      <form className={styles.searchBarWrapper} onSubmit={handleSearchSubmit}>
        <SearchIcon />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search for your favorite items"
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)} // 입력값을 상태에 반영
        />
        {/* Close 버튼은 form 제출에 영향을 주지 않도록 type="button" 명시 */}
        <button type="button" onClick={onClose} className={styles.searchCloseButton}>
            <CloseIcon />
        </button>
      </form>
    </div>
  );
}