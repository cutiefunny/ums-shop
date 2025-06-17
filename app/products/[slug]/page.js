'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './products.module.css';
import ProductCard from './components/ProductCard';
import CategorySwitchModal from './components/CategorySwitchModal';
import SortModal from './components/SortModal';
import { useModal } from '@/contexts/ModalContext';
import { categoryData, mockProducts, slugify } from '@/data/mockData';
import AddToCartModal from '../detail/[slug]/components/AddToCartModal'; // 바텀 시트 모달 import

// 아이콘 컴포넌트
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const SearchIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="black"/></svg>;
const CartIcon = () => <img src="/images/cart.png" alt="Cart" style={{width: 24, height: 24}} />;
const ChevronDown = () => <img src="/images/Caret Down.png" alt="down" style={{width: 24, height: 24}} />;

export default function ProductListPage() {
  const router = useRouter();
  const params = useParams();
  const { showModal } = useModal();
  const { slug } = params;

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState('Latest Items');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false); // [추가] 장바구니 모달 상태
  const [selectedProduct, setSelectedProduct] = useState(null); // [추가] 선택된 상품 상태

  const { title, siblingCategories } = useMemo(() => {
    const unslugify = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const currentTitle = unslugify(slug);

    const parentCategory = categoryData.find(cat =>
      cat.subCategories.some(sub => slugify(sub) === slug)
    );

    return {
      title: currentTitle,
      siblingCategories: parentCategory ? parentCategory.subCategories : []
    };
  }, [slug]);

  const sortedProducts = useMemo(() => {
    const sorted = [...mockProducts];
    switch (sortOption) {
      case 'Low to High':
        return sorted.sort((a, b) => (a.price * (1 - a.discount / 100)) - (b.price * (1 - b.discount / 100)));
      case 'High to Low':
        return sorted.sort((a, b) => (b.price * (1 - b.discount / 100)) - (a.price * (1 - a.discount / 100)));
      case 'Latest Items':
      default:
        return sorted;
    }
  }, [sortOption]);

  const handleOpenCartModal = (product) => {
    setSelectedProduct(product);
    setIsCartModalOpen(true);
  };

  const handleConfirmAddToCart = (productName, quantity) => {
    // TODO: 실제 장바구니에 상품을 담는 로직 (e.g. API 호출)
    console.log(`${productName} ${quantity}개 장바구니에 추가`);
    showModal(`${productName} has been added to your cart.`);
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
          <button className={styles.sortButton} onClick={() => setIsSortModalOpen(true)}>
            <span>{sortOption.toUpperCase()}</span>
            <ChevronDown />
          </button>
        </div>

        <div className={styles.productGrid}>
          {sortedProducts.map(product => (
            <Link href={`/products/detail/${product.slug}`} key={product.id} className={styles.productLink}>
              <ProductCard product={product} onAddToCart={handleOpenCartModal} />
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

      {selectedProduct && (
        <AddToCartModal
          isOpen={isCartModalOpen}
          onClose={() => setIsCartModalOpen(false)}
          onConfirm={handleConfirmAddToCart}
          product={selectedProduct}
        />
      )}
    </div>
  );
}