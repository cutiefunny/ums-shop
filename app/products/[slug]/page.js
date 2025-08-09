'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './products.module.css';
import ProductCard from './components/ProductCard';
import CategorySwitchModal from './components/CategorySwitchModal';
import SortModal from './components/SortModal';
import { useModal } from '@/contexts/ModalContext';
import { slugify } from '@/data/mockData';
import AddToCartModal from '../detail/[slug]/components/AddToCartModal';
import { useAuth } from '@/contexts/AuthContext';
import SearchComponent from '@/app/home/components/SearchComponent';

// 아이콘 컴포넌트
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const SearchIcon = ({ isActive }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke={isActive ? '#FBC926' : 'black'}
      style={{width: 24, height: 24}}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);
const CartIcon = () => <img src="/images/cart.png" alt="Cart" style={{width: 24, height: 24}} />;
const ChevronDown = () => <img src="/images/Caret Down.png" alt="down" style={{width: 24, height: 24}} />;

export default function ProductListPage() {
  const router = useRouter();
  const params = useParams();
  const { showModal } = useModal();
  const { slug } = params;
  const { user, isLoggedIn } = useAuth();

  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState('Latest Items');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [pageTitle, setPageTitle] = useState('');
  const [l1Categories, setL1Categories] = useState([]);
  const [l2Categories, setL2Categories] = useState([]);
  const [activeL2Category, setActiveL2Category] = useState('ALL');

  const fetchSub1Categories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories?level=surve1');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error("Error fetching sub1 categories:", err);
      showModal(`카테고리 목록을 불러오는 데 실패했습니다: ${err.message}`);
      setError(err.message);
      return [];
    }
  }, [showModal]);

  const fetchProductsByCategory = useCallback(async (categoryName) => {
    setLoading(true);
    setError(null);
    try {
      const encodedCategoryName = encodeURIComponent(categoryName);
      const response = await fetch(`/api/products/check?subCategory1Id=${encodedCategoryName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      data.forEach(product => {
        product.price = product.calculatedPriceUsd;
        product.image = product.mainImage;
        product.discount = product.discount || 0;
      });
      setAllProducts(data || []);

      if (data && data.length > 0) {
        // 💡 --- 로직 수정 ---
        // 💡 백엔드에서 보내주는 'subCategory2' 필드를 사용하도록 수정
        const subCategories = [...new Set(data.map(p => p.subCategory2).filter(Boolean))];
        setL2Categories(subCategories);
      } else {
        setL2Categories([]);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      showModal(`상품 목록을 불러오는 데 실패했습니다: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showModal]);

  useEffect(() => {
    fetchSub1Categories().then(sub1Cats => {
      setL1Categories(sub1Cats);
      const currentSub1 = sub1Cats.find(cat =>
        cat && cat.name && slugify(cat.name) === slug
      );

      if (currentSub1) {
        setPageTitle(currentSub1.name);
        fetchProductsByCategory(currentSub1.name);
        setActiveL2Category('ALL');
      } else {
        setLoading(false);
        setError('Category not found or no products available.');
        setPageTitle('Category Not Found');
      }
    });
  }, [slug, fetchSub1Categories, fetchProductsByCategory]);

  const displayedProducts = useMemo(() => {
    // 💡 --- 로직 수정 ---
    // 💡 필터링 시에도 백엔드와 동일한 'subCategory2' 필드를 사용
    const filtered = activeL2Category === 'ALL'
      ? allProducts
      : allProducts.filter(p => p.subCategory2 === activeL2Category);
    
    const sorted = [...filtered];
    switch (sortOption) {
      case 'Low to High':
        return sorted.sort((a, b) => (a.price || 0) * (1 - (a.discount || 0) / 100) - (b.price || 0) * (1 - (b.discount || 0) / 100));
      case 'High to Low':
        return sorted.sort((a, b) => (b.price || 0) * (1 - (b.discount || 0) / 100) - (a.price || 0) * (1 - (a.discount || 0) / 100));
      case 'Latest Items':
      default:
        return sorted;
    }
  }, [allProducts, activeL2Category, sortOption]);

  const handleOpenCartModal = (product) => {
    setSelectedProduct(product);
    setIsCartModalOpen(true);
  };
  
  const handleConfirmAddToCart = async (productName, quantity) => {
    // ... (장바구니 로직은 동일)
  };

  if (loading) {
    return <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />;
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={`${styles.emptyMessage} ${styles.errorText}`}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.iconButton}><BackIcon /></button>
        <div className={styles.headerIcons}>
          <button onClick={() => setIsSearchVisible(true)} className={styles.iconButton}>
            <SearchIcon isActive={isSearchVisible} />
          </button>
          <button onClick={() => router.push('/cart')} className={styles.iconButton}><CartIcon /></button>
        </div>
      </header>

      <SearchComponent
        isVisible={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
      />

      <div className={styles.titleContainer} onClick={() => setIsCategoryModalOpen(true)}>
        <h2>{pageTitle}</h2>
        <ChevronDown />
      </div>

      <main className={styles.mainContent}>
        <div className={styles.filterBar}>
          <button
            className={`${styles.filterChip} ${activeL2Category === 'ALL' ? styles.active : ''}`}
            onClick={() => setActiveL2Category('ALL')}
          >
            ALL
          </button>
          {l2Categories.map(subCat => (
            <button
              key={subCat}
              className={`${styles.filterChip} ${activeL2Category === subCat ? styles.active : ''}`}
              onClick={() => setActiveL2Category(subCat)}
            >
              {subCat}
            </button>
          ))}
        </div>

        <div className={styles.sortContainer}>
          <button className={styles.sortButton} onClick={() => setIsSortModalOpen(true)}>
            <span>{sortOption.toUpperCase()}</span>
            <ChevronDown />
          </button>
        </div>

        <div className={styles.productGrid}>
          {displayedProducts.length > 0 ? (
            displayedProducts.map(product => (
              <Link href={`/products/detail/${product.slug || product.id}`} key={product.id} className={styles.productLink}>
                <ProductCard product={product} onAddToCart={handleOpenCartModal} />
              </Link>
            ))
          ) : (
            <div className={styles.emptyMessage}>No products found in this category.</div>
          )}
        </div>
      </main>
      
      <CategorySwitchModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        currentSlug={slug}
        allCategories={l1Categories}
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