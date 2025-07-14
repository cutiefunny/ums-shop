'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image'; // [신규] Image 컴포넌트 import
import styles from '../home.module.css';
import { useRouter } from 'next/navigation'; // useRouter 훅 임포트

export default function MainBanner({ items }) {
  const [displayItems, setDisplayItems] = useState([]);
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isJumpingRef = useRef(false);
  const router = useRouter(); // useRouter 훅 사용

  // ... updateScale, useEffect, handleJump, handleScroll 함수는 기존과 동일 ...
  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const viewportCenter = container.offsetWidth / 2;

    let minDistance = Infinity;
    let activeItem = null;

    // 모든 자식 요소를 순회하며 스케일 계산 및 활성 아이템 찾기
    for (const item of container.children) {
      const itemRect = item.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const itemCenter = itemRect.left - containerRect.left + itemRect.width / 2;
      const distance = Math.abs(viewportCenter - itemCenter);
      const maxDistance = container.offsetWidth / 2;
      
      const scale = 1 + 0.1 * (1 - Math.min(distance / maxDistance, 1));
      
      item.style.transform = `scale(${scale})`;
      // // 중앙에 가까운 아이템이 위로 올라오도록 z-index 동적 조절
      // item.style.zIndex = `${Math.floor(100 - distance)}`;

      // 가장 중앙에 가까운 아이템을 activeItem으로 설정
      if (distance < minDistance) {
        minDistance = distance;
        activeItem = item;
      }
    }

    // 활성 아이템에 activeBanner 클래스 추가, 나머지는 제거
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
      // 첫 번째 실제 아이템 (클론 제외)의 인덱스
      const initialItemIndex = 1; // Assuming the first item is a clone
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
    // Adjusted to correctly calculate item width with gap.
    // Assuming all items have the same width and gap.
    const firstItem = container.children[0];
    const secondItem = container.children[1];
    const itemWidthWithGap = secondItem ? (secondItem.offsetLeft - firstItem.offsetLeft) : firstItem.offsetWidth;

    const currentIndex = Math.round(container.scrollLeft / itemWidthWithGap);
    
    const atEndClone = currentIndex >= displayItems.length - 1;
    const atStartClone = currentIndex <= 0;

    if (atEndClone || atStartClone) {
        isJumpingRef.current = true;
        // Target index is 1 for the first original item (after the start clone)
        // or items.length for the last original item (before the end clone).
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

  const handleScroll = () => {
    if (isJumpingRef.current) return;
    window.requestAnimationFrame(updateScale);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(handleJump, 150);
  };

  // 배너 클릭 핸들러
  const handleBannerClick = (item) => {
    // 클론 아이템은 클릭해도 이동하지 않음
    if (item.id.startsWith('clone-')) {
      return;
    }
    router.push(`/products/detail/${item.id}`); // 상품 상세 페이지로 이동 (item.id를 slug로 사용)
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
          onClick={() => handleBannerClick(item)} // 클릭 이벤트 추가
        >
          {/* [수정] Image 컴포넌트를 사용하여 배너 이미지 표시 */}
          {item.imageUrl && (
            <Image
              src={item.imageUrl}
              alt={item.id.startsWith('clone-') ? `Banner item ${item.id.replace('clone-', '')}` : `Product banner for ${item.id}`} // alt 텍스트 개선
              fill={true} // 부모 요소(div)를 꽉 채우도록 설정
              style={{ objectFit: 'cover' }} // 이미지가 잘리지 않고 채워지도록 설정
              priority={item.id === 2} // 중앙에 처음 보이는 이미지는 우선적으로 로드 (원본 id 기준)
            />
          )}
        </div>
      ))}
    </div>
  );
}