'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const fetchProductsByCategory = useCallback(async (categoryName) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`Fetching products for category: ${categoryName}`);
      const encodedCategoryName = encodeURIComponent(categoryName);
      const response = await fetch(`/api/products/check?subCategory1Id=${encodedCategoryName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Fetched products for category ${categoryName}:`, data);
      data.forEach(product => {
        product.price = product.calculatedPriceUsd;
        product.image = product.mainImage;
        product.discount = product.discount || 0;
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

  useEffect(() => {
    fetchSub1Categories().then(sub1Cats => {
      console.log(`sub1Cats :`, sub1Cats);
      console.log(`slug :`, slug);
      const currentSub1 = sub1Cats.find(cat =>
        cat.name && slugify(cat.name) === slug
      );

      if (currentSub1) {
        fetchProductsByCategory(currentSub1.name);
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

    const parentCategory = categories.find(cat =>
      cat.subCategories && cat.subCategories.some(sub => slugify(sub) === slug)
    );

    return {
      title: currentTitle,
      siblingCategories: categories || []
    };
  }, [slug, categories]);


  const sortedProducts = useMemo(() => {
    const sorted = [...products];
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

  const handleConfirmAddToCart = async (productName, quantity) => {
    if (!isLoggedIn || !user?.seq) {
        showModal("장바구니에 상품을 추가하려면 로그인해야 합니다.");
        router.push('/');
        return;
    }

    const itemToAdd = {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        quantity: quantity,
        unitPrice: selectedProduct.price,
        mainImage: selectedProduct.image,
        slug: selectedProduct.slug,
    };

    try {
        const userResponse = await fetch(`/api/users/${user.seq}`);
        if (!userResponse.ok) {
            throw new Error('Failed to fetch user cart data.');
        }
        const userData = await userResponse.json();
        const currentCart = userData.cart || [];

        const existingItemIndex = currentCart.findIndex(item => item.productId === itemToAdd.productId);
        let updatedCart;

        if (existingItemIndex > -1) {
            updatedCart = currentCart.map((item, index) =>
                index === existingItemIndex
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
            );
        } else {
            updatedCart = [...currentCart, itemToAdd];
        }

        const response = await fetch(`/api/users/${user.seq}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart: updatedCart }),
        });

        if (!response.ok) {
            throw new Error('Failed to add item to cart in DB.');
        }

        console.log(`Product added to cart:`, itemToAdd);
        console.log(`User (ID: ${user.seq})'s cart has been updated.`);

        showModal(`${productName} ${quantity} items have been added to your cart!`);
        setIsCartModalOpen(false);
        
          } catch (error) {
        console.error("Failed to add item to cart:", error);
        showModal(`Failed to add item to cart: ${error.message}`);
    }
};

  if (loading) {
    return <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />;
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={`${styles.emptyMessage} ${styles.errorText}`}>error: {error}</div>
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
          <button className={`${styles.filterChip} ${styles.active}`}>ALL</button>
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
            <div className={styles.emptyMessage}>No products found in this category.</div>
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