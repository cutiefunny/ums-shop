'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from '../home.module.css';
import { useRouter } from 'next/navigation';

export default function MainBanner({ items }) {
  const [displayItems, setDisplayItems] = useState([]);
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isJumpingRef = useRef(false);
  const intervalRef = useRef(null); // [신규] 자동 스크롤 인터벌을 위한 ref
  const router = useRouter();

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const viewportCenter = container.offsetWidth / 2;

    let minDistance = Infinity;
    let activeItem = null;

    for (const item of container.children) {
      const itemRect = item.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const itemCenter = itemRect.left - containerRect.left + itemRect.width / 2;
      const distance = Math.abs(viewportCenter - itemCenter);
      const maxDistance = container.offsetWidth / 2;
      
      const scale = 1 + 0.1 * (1 - Math.min(distance / maxDistance, 1));
      
      item.style.transform = `scale(${scale})`;
      
      if (distance < minDistance) {
        minDistance = distance;
        activeItem = item;
      }
    }

    for (const item of container.children) {
      if (item === activeItem) {
        item.classList.add(styles.activeBanner);
      } else {
        item.classList.remove(styles.activeBanner);
      }
    }
  }, []);

  useEffect(() => {
    if (items && items.length > 0) {
      const startClone = { ...items[items.length - 1], id: `clone-start-${items[items.length - 1].id}` };
      const endClone = { ...items[0], id: `clone-end-${items[0].id}` };
      setDisplayItems([startClone, ...items, endClone]);
    }
  }, [items]);

  useEffect(() => {
    if (displayItems.length > 0 && containerRef.current) {
      const container = containerRef.current;
      const initialItemIndex = 1;
      const item = container.children[initialItemIndex];
      
      if (item) {
        const containerWidth = container.offsetWidth;
        const itemWidth = item.offsetWidth;
        const itemOffsetLeft = item.offsetLeft;
        const scrollLeft = itemOffsetLeft - (containerWidth / 2) + (itemWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'auto' });
        updateScale();
      }
    }
  }, [displayItems, updateScale]);

  const handleJump = useCallback(() => {
    if (!containerRef.current || !items || items.length === 0) return;

    const container = containerRef.current;
    const firstItem = container.children[0];
    const secondItem = container.children[1];
    const itemWidthWithGap = secondItem ? (secondItem.offsetLeft - firstItem.offsetLeft) : firstItem.offsetWidth;

    // A more reliable way to calculate currentIndex
    const currentIndex = Math.round((container.scrollLeft + container.offsetWidth / 2 - firstItem.offsetWidth / 2) / itemWidthWithGap);
    
    const atEndClone = currentIndex >= displayItems.length - 1;
    const atStartClone = currentIndex <= 0;

    if (atEndClone || atStartClone) {
      isJumpingRef.current = true;
      const targetIndex = atEndClone ? 1 : items.length;
      const targetItem = container.children[targetIndex];
      if(targetItem) {
        const scrollLeft = targetItem.offsetLeft - (container.offsetWidth / 2) + (targetItem.offsetWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'auto' });
        
        requestAnimationFrame(updateScale);
      }
      setTimeout(() => { isJumpingRef.current = false; }, 50);
    }
  }, [items, displayItems, updateScale]);

  // [신규] 다음 배너로 스크롤하는 함수
  const autoScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const firstItem = container.children[1];
    if (!firstItem) return;

    const itemWidthWithGap = container.children[2] ? (container.children[2].offsetLeft - container.children[1].offsetLeft) : firstItem.offsetWidth;

    const newScrollLeft = container.scrollLeft + itemWidthWithGap;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  }, []);
  
  // [수정] 스크롤 핸들러: 자동 스크롤 제어 로직 추가
  const handleScroll = useCallback(() => {
    // 사용자가 스크롤하면 자동 스크롤 중지
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  
    if (isJumpingRef.current) return;
    window.requestAnimationFrame(updateScale);
  
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  
    // 스크롤이 멈춘 후 handleJump 실행 및 자동 스크롤 재시작
    scrollTimeoutRef.current = setTimeout(() => {
      handleJump();
      if (!intervalRef.current) { // 다른 곳에서 인터벌이 재시작되지 않았다면
        intervalRef.current = setInterval(autoScroll, 3000);
      }
    }, 150); // 150ms 동안 스크롤 없으면 멈춘 것으로 간주
  }, [updateScale, handleJump, autoScroll]);

  // [신규] 자동 스크롤 시작 및 정리를 위한 useEffect
  useEffect(() => {
    // 컴포넌트가 마운트되고 아이템이 준비되면 자동 스크롤 시작
    if (displayItems.length > 2) { // 아이템과 클론이 모두 준비되었는지 확인
        intervalRef.current = setInterval(autoScroll, 3000);
    }

    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [displayItems, autoScroll]);


  const handleBannerClick = (item) => {
    if (item.id.startsWith('clone-')) {
      return;
    }
    router.push(`/products/detail/${item.id}`);
  };

  return (
    <div 
      ref={containerRef} 
      className={styles.bannerContainer}
      onScroll={handleScroll}
    >
      {displayItems.map(item => (
        <div 
          key={item.id} 
          className={styles.bannerItem}
          style={{ backgroundColor: item.color }}
          onClick={() => handleBannerClick(item)}
        >
          {item.imageUrl && (
            <Image
              src={item.imageUrl}
              alt={item.id.startsWith('clone-') ? `Banner item ${item.id.replace('clone-', '')}` : `Product banner for ${item.id}`}
              fill={true}
              style={{ objectFit: 'cover' }}
              priority={item.id === 2}
            />
          )}
        </div>
      ))}
    </div>
  );
}