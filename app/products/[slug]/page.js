'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './products.module.css';
import ProductCard from './components/ProductCard';
import CategorySwitchModal from './components/CategorySwitchModal';
import SortModal from './components/SortModal';
import { useModal } from '@/contexts/ModalContext';
// categoryData, mockProducts는 더 이상 mockData에서 가져오지 않습니다.
import { slugify } from '@/data/mockData'; // slugify 함수만 유지합니다.
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
  const { slug } = params; // 현재 URL의 slug (예: herbal-extracts-supplements)

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState('Latest Items');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [products, setProducts] = useState([]); // 상품 데이터를 저장할 상태
  const [categories, setCategories] = useState([]); // 카테고리 데이터를 저장할 상태 (형제 카테고리 포함)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API를 통해 sub1 카테고리 데이터를 가져오는 함수
  const fetchSub1Categories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories?level=surve1');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching sub1 categories:", err);
      showModal(`카테고리 목록을 불러오는 데 실패했습니다: ${err.message}`);
      setError(err.message);
      return [];
    }
  }, [showModal]);

  // API를 통해 특정 카테고리의 상품 데이터를 가져오는 함수
  const fetchProductsByCategory = useCallback(async (categoryName) => {
    setLoading(true);
    setError(null);
    try {
      // slug를 역변환하여 실제 카테고리 이름을 API에 전달합니다.
      console.log(`Fetching products for category: ${categoryName}`);
      const encodedCategoryName = encodeURIComponent(categoryName);
      // API 엔드포인트 수정: /api/products/check는 mainCategory, subCategory1, subCategory2 이름으로 검색 가능
      // 현재 slug는 subCategory1에 해당한다고 가정합니다.
      const response = await fetch(`/api/products/check?subCategory1Id=${encodedCategoryName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Fetched products for category ${categoryName}:`, data);
      //data의 calculatedPriceUsd를 price로 사용하고, discount가 있는 경우 할인 적용
      data.forEach(product => {
        product.price = product.calculatedPriceUsd;
        product.image = product.mainImage;
      });
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      showModal(`상품 목록을 불러오는 데 실패했습니다: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showModal]);

  // 컴포넌트 마운트 시 또는 slug 변경 시 데이터 불러오기
  useEffect(() => {
    // sub1 카테고리 목록을 먼저 가져옵니다.
    fetchSub1Categories().then(sub1Cats => {
      // 현재 slug에 해당하는 sub1 카테고리를 찾습니다.
      console.log(`sub1Cats :`, sub1Cats);
      console.log(`slug :`, slug);
      const currentSub1 = sub1Cats.find(cat =>
        cat.name && slugify(cat.name) === slug
      );

      if (currentSub1) {
        // 현재 slug에 해당하는 상품 목록을 가져옵니다.
        fetchProductsByCategory(currentSub1.name);
        // 형제 카테고리 목록을 설정합니다.
        setCategories(currentSub1.subCategories || []);
      } else {
        setLoading(false);
        setError('Category not found or no products available.');
      }
    });
  }, [slug, fetchSub1Categories, fetchProductsByCategory]);


  const { title: pageTitle, siblingCategories } = useMemo(() => {
    const unslugify = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const currentTitle = unslugify(slug);

    // categories 상태를 기반으로 형제 카테고리를 찾습니다.
    // 이 로직은 categories가 이미 적절히 설정되었다고 가정합니다.
    const parentCategory = categories.find(cat =>
      cat.subCategories && cat.subCategories.some(sub => slugify(sub) === slug)
    );

    return {
      title: currentTitle,
      siblingCategories: categories || [] // 이미 categories 상태에 형제 카테고리가 있다고 가정
    };
  }, [slug, categories]);


  const sortedProducts = useMemo(() => {
    const sorted = [...products]; // API에서 가져온 products 사용
    console.log(`Sorted products for category ${pageTitle}:`, sorted);
    switch (sortOption) {
      case 'Low to High':
        return sorted.sort((a, b) => (a.price || 0) * (1 - (a.discount || 0) / 100) - (b.price || 0) * (1 - (b.discount || 0) / 100));
      case 'High to Low':
        return sorted.sort((a, b) => (b.price || 0) * (1 - (b.discount || 0) / 100) - (a.price || 0) * (1 - (a.discount || 0) / 100));
      case 'Latest Items':
      default:
        return sorted;
    }
  }, [products, sortOption]);

  const handleOpenCartModal = (product) => {
    setSelectedProduct(product);
    setIsCartModalOpen(true);
  };

  const handleConfirmAddToCart = (productName, quantity) => {
    // TODO: 실제 장바구니에 상품을 담는 로직 (e.g. API 호출)
    console.log(`${productName} ${quantity}개 장바구니에 추가`);
    showModal(`${productName} has been added to your cart.`);
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.emptyMessage}>상품을 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={`${styles.emptyMessage} ${styles.errorText}`}>오류: {error}</div>
      </div>
    );
  }

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
        <h2>{pageTitle}</h2>
        <ChevronDown />
      </div>

      <main className={styles.mainContent}>
        <div className={styles.filterBar}>
          <button className={`${styles.filterChip} ${styles.active}`}>ALL</button>
          {/* 동적으로 필터 칩을 렌더링하려면 categories 상태를 활용해야 합니다. */}
          {/* <button className={styles.filterChip}>categorie 1</button> */}
          {/* <button className={styles.filterChip}>3차 카테고리 노출</button> */}
        </div>

        <div className={styles.sortContainer}>
          <button className={styles.sortButton} onClick={() => setIsSortModalOpen(true)}>
            <span>{sortOption.toUpperCase()}</span>
            <ChevronDown />
          </button>
        </div>

        <div className={styles.productGrid}>
          {sortedProducts.length > 0 ? (
            sortedProducts.map(product => (
              <Link href={`/products/detail/${product.slug || product.id}`} key={product.id} className={styles.productLink}>
                <ProductCard product={product} onAddToCart={handleOpenCartModal} />
              </Link>
            ))
          ) : (
            <div className={styles.emptyMessage}>해당 카테고리에 상품이 없습니다.</div>
          )}
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