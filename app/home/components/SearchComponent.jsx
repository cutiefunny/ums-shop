'use client';

import React, { useEffect, useRef } from 'react';
import styles from '../home.module.css';

// 아이콘 SVG (Heroicons 사용을 추천하지만, 일단 기존 아이콘을 활용합니다)
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.searchIconInBar}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.searchCloseIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

export default function SearchComponent({ isVisible, onClose }) {
  const inputRef = useRef(null);

  // 검색창이 나타날 때 자동으로 input에 포커스를 줍니다.
  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus();
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchBarWrapper}>
        <SearchIcon />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search for your favorite items"
          className={styles.searchInput}
        />
        <button onClick={onClose} className={styles.searchCloseButton}>
            <CloseIcon />
        </button>
      </div>
    </div>
  );
}