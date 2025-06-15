import React from 'react';
import Link from 'next/link';
import styles from '../home.module.css';

// [수정] isSearchVisible(isActive) 값에 따라 stroke 색상을 변경
const SearchIcon = ({ isActive }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke={isActive ? '#f5a623' : 'currentColor'} 
    className={styles.icon}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

// [수정] 요청하신 대로 img 태그로 아이콘 변경
const BellIcon = () => <img src="/images/bell.png" alt="Notifications" className={styles.icon} />;
const CartIcon = () => <img src="/images/cart.png" alt="Cart" className={styles.icon} />;

// [수정] isSearchVisible prop을 받도록 수정
export default function HomeHeader({ onSearchClick, isSearchVisible }) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>UMS SHOP</div>
      <div className={styles.headerIcons}>
        <button onClick={onSearchClick} className={styles.iconButton}>
          {/* [수정] isSearchVisible 값을 SearchIcon에 전달 */}
          <SearchIcon isActive={isSearchVisible} />
        </button>
        <Link href="/notifications" passHref><BellIcon /></Link>
        <Link href="/cart" passHref><CartIcon /></Link>
      </div>
    </header>
  );
}