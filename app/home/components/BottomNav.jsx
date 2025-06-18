'use client';

import React from 'react';
import { usePathname } from 'next/navigation'; // usePathname 훅 import
import Link from 'next/link';
import styles from '../home.module.css';

// 아이콘 컴포넌트들은 이전과 동일합니다.
const HomeIcon = ({ active }) => <svg xmlns="http://www.w3.org/2000/svg" fill={active ? '#f5a623' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke={active ? '#f5a623' : '#adb5bd'} className={styles.navIcon}><path d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></svg>;
const MenuIcon = ({ active }) => <svg xmlns="http://www.w3.org/2000/svg" fill={active ? '#f5a623' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke={active ? '#f5a623' : '#adb5bd'} className={styles.navIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;
const HeartIcon = ({ active }) => <svg xmlns="http://www.w3.org/2000/svg" fill={active ? '#f5a623' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke={active ? '#f5a623' : '#adb5bd'} className={styles.navIcon}><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>;
const DocumentIcon = ({ active }) => <svg xmlns="http://www.w3.org/2000/svg" fill={active ? '#f5a623' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke={active ? '#f5a623' : '#adb5bd'} className={styles.navIcon}><path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>;
const UserIcon = ({ active }) => <svg xmlns="http://www.w3.org/2000/svg" fill={active ? '#f5a623' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke={active ? '#f5a623' : '#adb5bd'} className={styles.navIcon}><path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>;

// activePath prop 대신 usePathname을 사용하도록 수정합니다.
export default function BottomNav() {
  const pathname = usePathname(); // 컴포넌트 내부에서 현재 경로를 가져옵니다.

  const navItems = [
    { href: '/home', icon: HomeIcon },
    { href: '/categories', icon: MenuIcon },
    { href: '/wishlist', icon: HeartIcon },
    { href: '/orders', icon: DocumentIcon },
    { href: '/profile', icon: UserIcon },
  ];

  return (
    <nav className={styles.bottomNav}>
      {navItems.map(({ href, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link href={href} key={href} className={styles.navItem}>
            <Icon active={isActive} />
          </Link>
        );
      })}
    </nav>
  );
}