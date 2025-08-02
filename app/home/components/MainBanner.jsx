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
  const router = useRouter();

  // --- 드래그-스크롤 기능을 위한 Ref ---
  const isDraggingRef = useRef(false); // 마우스 버튼이 눌렸는지 여부
  const wasDraggedRef = useRef(false);  // 클릭과 드래그를 구분하기 위한 플래그
  const startXRef = useRef(0);          // 드래그 시작 시점의 마우스 X 좌표
  const startScrollLeftRef = useRef(0); // 드래그 시작 시점의 스크롤 위치
  // ------------------------------------

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
    const currentIndex = Math.round(container.scrollLeft / itemWidthWithGap);
    const atEndClone = currentIndex >= displayItems.length - 1;
    const atStartClone = currentIndex <= 0;

    if (atEndClone || atStartClone) {
      isJumpingRef.current = true;
      const targetIndex = atEndClone ? 1 : items.length;
      const targetItem = container.children[targetIndex];
      if (targetItem) {
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

  const handleBannerClick = (item) => {
    // 마우스를 드래그했다면, 클릭 이벤트를 무시
    if (wasDraggedRef.current) {
      return;
    }
    if (item.id.startsWith('clone-')) {
      return;
    }
    router.push(`/products/detail/${item.id}`);
  };

  // --- 드래그-스크롤 이벤트 핸들러 함수들 ---
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    wasDraggedRef.current = false; // 새로운 클릭이 시작될 때 드래그 상태 초기화
    startXRef.current = e.pageX - containerRef.current.offsetLeft;
    startScrollLeftRef.current = containerRef.current.scrollLeft;
    containerRef.current.style.cursor = 'grabbing'; // 커서를 '잡는 중' 모양으로 변경
    containerRef.current.style.userSelect = 'none'; // 드래그 중 텍스트 선택 방지
  };

  const handleMouseLeaveOrUp = () => {
    isDraggingRef.current = false;
    containerRef.current.style.cursor = 'grab'; // 커서를 '잡을 수 있는' 모양으로 복원
    containerRef.current.style.userSelect = 'auto';
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    wasDraggedRef.current = true; // 마우스를 누른 채 움직이면 드래그로 간주
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 2; // 드래그 속도를 빠르게 하기 위한 배수 (2배)
    containerRef.current.scrollLeft = startScrollLeftRef.current - walk;
  };
  // ---------------------------------------------

  return (
    <div
      ref={containerRef}
      className={styles.bannerContainer}
      onScroll={handleScroll}
      // 마우스 이벤트 핸들러 추가
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeaveOrUp}
      onMouseUp={handleMouseLeaveOrUp}
      onMouseMove={handleMouseMove}
      style={{ cursor: 'grab' }} // 초기 커서 모양 설정
    >
      {displayItems.map(item => (
        <div
          key={item.id}
          className={styles.bannerItem}
          style={{ backgroundColor: item.color }}
          onClick={() => handleBannerClick(item)} // 클릭 핸들러가 드래그 여부를 확인
        >
          {/* 이미지 자체의 드래그 관련 기본 동작 방지 */}
          <div style={{ pointerEvents: 'none' }}>
            {item.imageUrl && (
              <Image
                src={item.imageUrl}
                alt={item.id.startsWith('clone-') ? `Banner item ${item.id.replace('clone-', '')}` : `Product banner for ${item.id}`}
                fill={true}
                style={{ objectFit: 'cover' }}
                priority={item.id === 2}
                draggable="false" // 이미지 드래그 시 고스트 이미지 생성 방지
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}