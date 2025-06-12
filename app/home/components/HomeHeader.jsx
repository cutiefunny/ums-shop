import React from 'react';
import Link from 'next/link';
import styles from '../home.module.css';
// 아이콘 SVG (Heroicons 등 라이브러리 사용을 추천합니다)
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.icon}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.icon}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>;
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.icon}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.823-6.84a1.06 1.06 0 0 0-.542-1.258l-10.5-5.25a1.06 1.06 0 0 0-1.258.541l-1.823 6.841A1.06 1.06 0 0 0 4.884 9.75h1.246M12 15a2.25 2.25 0 0 1-2.25-2.25V9" /></svg>;

export default function HomeHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>UMS SHOP</div>
      <div className={styles.headerIcons}>
        <Link href="/search" passHref><SearchIcon /></Link>
        <Link href="/notifications" passHref><BellIcon /></Link>
        <Link href="/cart" passHref><CartIcon /></Link>
      </div>
    </header>
  );
}