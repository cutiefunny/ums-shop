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
  const intervalRef = useRef(null);
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
      // ✨ [수정됨] id가 고유하도록 clone 생성 방식 변경
      const startClone = { ...items[items.length - 1], id: `clone-start-${items[items.length - 1].id}` };
      const endClone = { ...items[0], id: `clone-end-${items[0].id}` };
      setDisplayItems([startClone, ...items, endClone]);
    } else {
        setDisplayItems([]); // 아이템이 없으면 비워줌
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

  const autoScroll = useCallback(() => {
    if (!containerRef.current || !containerRef.current.children[1] || !containerRef.current.children[2]) return;
    const container = containerRef.current;
    
    const itemWidthWithGap = container.children[2].offsetLeft - container.children[1].offsetLeft;
    const newScrollLeft = container.scrollLeft + itemWidthWithGap;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  }, []);
  
  const handleScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  
    if (isJumpingRef.current) return;
    window.requestAnimationFrame(updateScale);
  
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  
    scrollTimeoutRef.current = setTimeout(() => {
      handleJump();
      if (!intervalRef.current && items.length > 1) { // 아이템이 2개 이상일 때만 자동 스크롤 재시작
        intervalRef.current = setInterval(autoScroll, 3000);
      }
    }, 150);
  }, [updateScale, handleJump, autoScroll, items]);

  useEffect(() => {
    if (displayItems.length > 2 && items.length > 1) { // 원본 아이템이 2개 이상일 때만 자동 스크롤 시작
        intervalRef.current = setInterval(autoScroll, 3000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [displayItems, autoScroll, items]);

  // ✨ [수정됨] exposureType에 따라 링크를 다르게 처리하는 함수
  const handleBannerClick = (item) => {
    if (item.id.startsWith('clone-')) {
      return; // 복제된 아이템은 클릭 무시
    }

    if (!item.linkUrl || item.exposureType === '없음') {
      return; // 링크가 없거나, 노출 방식이 '없음'이면 무시
    }
    
    if (item.exposureType === '외부 링크') {
      window.open(item.linkUrl, '_blank', 'noopener,noreferrer');
    } else if (item.exposureType === '내부 페이지') {
      router.push(item.linkUrl);
    }
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
          style={{ 
              backgroundColor: item.color || '#f0f0f0',
              cursor: item.linkUrl && !item.id.startsWith('clone-') ? 'pointer' : 'default' // 링크가 있을 때만 포인터
            }}
          onClick={() => handleBannerClick(item)}
        >
          {item.imageUrl && (
            <Image
              src={item.imageUrl}
              alt={item.id.startsWith('clone-') ? `Banner item ${item.id.replace('clone-start-', '').replace('clone-end-', '')}` : `Product banner for ${item.id}`}
              fill={true}
              style={{ objectFit: 'cover' }}
              priority={!item.id.startsWith('clone-')} // 원본 이미지만 우선순위 로딩
            />
          )}
        </div>
      ))}
    </div>
  );
}