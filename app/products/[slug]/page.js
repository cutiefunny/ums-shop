'use client';

import React, { useState, useMemo } from 'react'; // useMemo import
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link'; // Link import
import styles from './products.module.css';
import ProductCard from './components/ProductCard';
import CategorySwitchModal from './components/CategorySwitchModal'; // 모달 컴포넌트 import
import SortModal from './components/SortModal';
import { useModal } from '@/contexts/ModalContext';
import { categoryData, mockProducts, slugify } from '@/data/mockData'; // 데이터 import


// 아이콘 컴포넌트 (헤더용)
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const SearchIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="black"/></svg>;
const CartIcon = () => <img src="/images/cart.png" alt="Cart" style={{width: 24, height: 24}} />;
const ChevronDown = () => <img src="/images/Caret Down.png" alt="down" style={{width: 24, height: 24}} />;

export default function ProductListPage() {
  const router = useRouter();
  const params = useParams();
  const { showModal } = useModal();
  const { slug } = params;

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false); // 모달 상태 추가
  const [isSortModalOpen, setIsSortModalOpen] = useState(false); // [신규] 정렬 모달 상태
  const [sortOption, setSortOption] = useState('Latest Items'); // [신규] 현재 정렬 기준 상태


  const { title, siblingCategories } = useMemo(() => {
    const unslugify = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const currentTitle = unslugify(slug);
    
    // 현재 속한 부모 카테고리의 다른 서브 카테고리 찾기
    const parentCategory = categoryData.find(cat => 
      cat.subCategories.some(sub => slugify(sub) === slug)
    );

    return {
      title: currentTitle,
      siblingCategories: parentCategory ? parentCategory.subCategories : []
    };
  }, [slug]);

  // [신규] 정렬 기준(sortOption)이 바뀔 때마다 상품 목록을 다시 정렬
  const sortedProducts = useMemo(() => {
    const sorted = [...mockProducts]; // 원본 배열 수정을 피하기 위해 복사
    switch (sortOption) {
      case 'Low to High':
        return sorted.sort((a, b) => (a.price * (1 - a.discount / 100)) - (b.price * (1 - b.discount / 100)));
      case 'High to Low':
        return sorted.sort((a, b) => (b.price * (1 - b.discount / 100)) - (a.price * (1 - a.discount / 100)));
      case 'Latest Items':
      default:
        return sorted; // 'Latest Items'는 현재 mock 데이터에서 구별 불가하므로 기본 정렬 유지
    }
  }, [sortOption]);

  const [filter, setFilter] = useState('Latest Items');

  const handleAddToCart = (e, productName) => {
    e.preventDefault(); // Link 이동을 막고 장바구니에만 담기도록
    e.stopPropagation();
    showModal(`${productName}\nhas been added to your cart.`);
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.iconButton}><BackIcon /></button>
        <div className={styles.headerIcons}>
          <button className={styles.iconButton}><SearchIcon /></button>
          <button onClick={() => router.push('/cart')} className={styles.iconButton}><CartIcon /></button>
        </div>
      </header>

      <div className={styles.titleContainer} onClick={() => setIsCategoryModalOpen(true)}>
        <h2>{title}</h2>
        <ChevronDown />
      </div>

      <main className={styles.mainContent}>
        <div className={styles.filterBar}>
          <button className={`${styles.filterChip} ${styles.active}`}>ALL</button>
          <button className={styles.filterChip}>categorie 1</button>
          <button className={styles.filterChip}>3차 카테고리 노출</button>
        </div>

        <div className={styles.sortContainer}>
           {/* [수정] 정렬 버튼 클릭 시 모달 열기 */}
          <button className={styles.sortButton} onClick={() => setIsSortModalOpen(true)}>
            <span>{sortOption.toUpperCase()}</span>
            <ChevronDown />
          </button>
        </div>

        <div className={styles.productGrid}>
          {/* [수정] 정렬된 상품 목록을 Link로 감싸서 렌더링 */}
          {sortedProducts.map(product => (
            <Link href={`/products/detail/${product.slug}`} key={product.id} className={styles.productLink}>
              <ProductCard product={product} onAddToCart={(productName) => handleAddToCart(event, productName)} />
            </Link>
          ))}
        </div>
      </main>

      <CategorySwitchModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        currentSlug={slug}
        siblingCategories={siblingCategories}
      />

      <SortModal
        isOpen={isSortModalOpen}
        onClose={() => setIsSortModalOpen(false)}
        currentOption={sortOption}
        onApply={setSortOption}
      />
    </div>
  );
}