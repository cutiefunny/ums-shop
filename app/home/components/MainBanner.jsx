'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from '../home.module.css';

export default function MainBanner({ items }) {
  const [displayItems, setDisplayItems] = useState([]);
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isJumpingRef = useRef(false);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const viewportCenter = container.offsetWidth / 2;

    for (const item of container.children) {
      const itemRect = item.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const itemCenter = itemRect.left - containerRect.left + itemRect.width / 2;
      const distance = Math.abs(viewportCenter - itemCenter);
      const maxDistance = container.offsetWidth / 2;
      const scale = 1 + 0.1 * (1 - Math.min(distance / maxDistance, 1));
      item.style.transform = `scale(${scale})`;
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
      const initialItemIndex = 2;
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

  // [수정] 스크롤 점프 로직
  const handleJump = useCallback(() => {
    if (!containerRef.current || !items || items.length === 0) return;

    const container = containerRef.current;
    const itemWidthWithGap = container.children[1].offsetLeft - container.children[0].offsetLeft;
    const currentIndex = Math.round(container.scrollLeft / itemWidthWithGap);
    
    const atEndClone = currentIndex >= displayItems.length - 1;
    const atStartClone = currentIndex <= 0;

    if (atEndClone || atStartClone) {
        isJumpingRef.current = true;
        const targetIndex = atEndClone ? 1 : items.length;
        const targetItem = container.children[targetIndex];
        if(targetItem) {
            const scrollLeft = targetItem.offsetLeft - (container.offsetWidth / 2) + (targetItem.offsetWidth / 2);
            container.scrollTo({ left: scrollLeft, behavior: 'auto' });
            
            // [FIX] 점프 직후 스케일을 즉시 업데이트하여 시각적 불일치 해결
            requestAnimationFrame(updateScale);
        }
        setTimeout(() => { isJumpingRef.current = false; }, 50);
    }
  }, [items, displayItems, updateScale]); // useCallback 의존성 배열에 updateScale 추가

  const handleScroll = () => {
    if (isJumpingRef.current) return;
    window.requestAnimationFrame(updateScale);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(handleJump, 150);
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
        >
          {/* 배너 콘텐츠 */}
        </div>
      ))}
    </div>
  );
}