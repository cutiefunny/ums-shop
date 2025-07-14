'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './category1depth.module.css';
import ProductCard from '@/components/ProductCard';
import { useModal } from '@/contexts/ModalContext';
import { categoryData, slugify } from '@/data/mockData'; // categoryData와 slugify는 유지
import AddToCartModal from '../../products/detail/[slug]/components/AddToCartModal'; // 바텀 시트 모달 import

// 아이콘 컴포넌트
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const SearchIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="black"/></svg>;
const CartIcon = () => <img src="/images/cart.png" alt="Cart" style={{width: 24, height: 24}} />;
const MoreIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18L15 12L9 6" stroke="#495057" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;


export default function Category1DepthPage() {
  const router = useRouter();
  const params = useParams();
  const { showModal } = useModal();
  const { slug } = params; // 현재 URL의 slug (예: herbal-extracts-supplements)

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [mainCategoryOptions, setMainCategoryOptions] = useState([]); // 메인 카테고리 목록 (API에서 가져옴)
  const [subCategories, setSubCategories] = useState([]); // subCategory1 목록 (API에서 가져옴)
  const [productsByCategory, setProductsByCategory] = useState({}); // { subCategory1Id: [products...] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 메인 카테고리 목록을 가져오는 함수
  const fetchMainCategoryOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/categories?level=main');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMainCategoryOptions(data || []);
    } catch (err) {
      console.error("Error fetching main category options:", err);
      // 이 에러는 페이지 로딩을 막지 않으므로, 에러 상태만 기록
    }
  }, []);

  useEffect(() => {
    fetchMainCategoryOptions();
  }, [fetchMainCategoryOptions]);

  // 현재 메인 카테고리 정보 찾기
  const currentMainCategory = useMemo(() => {
    // slug를 통해 mainCategory의 name을 찾고, 그 name에 해당하는 categoryData를 찾습니다.
    // slug가 mainCategory의 slug와 일치하는 경우를 찾아야 합니다.
    return mainCategoryOptions.find(cat => slugify(cat.name) === slug);
  }, [slug, mainCategoryOptions]); // mainCategoryOptions에 의존성을 추가

  const title = currentMainCategory ? currentMainCategory.name.replace(/_/g, ' ') : 'Category';
  const mainCategoryId = currentMainCategory ? currentMainCategory.categoryId : null; // DynamoDB ID

  // subCategory1 목록 및 각 subCategory1에 속하는 상품 목록을 가져오는 함수
  const fetchCategoryData = useCallback(async () => {
    if (!mainCategoryId) {
      setLoading(false);
      // mainCategoryId가 없으면 에러를 설정하고 함수 종료
      setError('Main category not found for this URL or data not loaded.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. subCategory1 목록 가져오기
      const sub1Response = await fetch(`/api/categories?level=surve1&parentId=${mainCategoryId}`);
      if (!sub1Response.ok) {
        throw new Error(`Failed to fetch sub categories: ${sub1Response.status}`);
      }
      const sub1Data = await sub1Response.json();
      setSubCategories(sub1Data);

      // 2. 각 subCategory1에 해당하는 상품 목록 가져오기
      const productsMap = {};
      for (const sub1Cat of sub1Data) {
        // /api/products/check?subCategory1Id=... API 호출
        //name에 &가 포함될 수 있으므로 encodeURIComponent 사용
        const subCategory1Name = encodeURIComponent(sub1Cat.name);
        const productsResponse = await fetch(`/api/products/check?subCategory1Id=${subCategory1Name}`);
        if (!productsResponse.ok) {
          console.warn(`Failed to fetch products for ${sub1Cat.name}: ${productsResponse.status}`);
          productsMap[sub1Cat.categoryId] = []; // 실패해도 빈 배열로 처리
          continue;
        }
        const productsData = await productsResponse.json();
        productsMap[sub1Cat.categoryId] = productsData;
      }
      setProductsByCategory(productsMap);

    } catch (err) {
      console.error("Error fetching category data:", err);
      setError(`데이터를 불러오는 데 실패했습니다: ${err.message}`);
      showModal(`데이터를 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [mainCategoryId, showModal]);

  useEffect(() => {
    // mainCategoryId가 유효할 때만 fetchCategoryData 호출
    if (mainCategoryId) {
        fetchCategoryData();
    } else if (!loading && !error) { // mainCategoryId가 없는데 로딩이 끝나고 에러가 없으면, 초기 로딩 상태로 설정
        setLoading(true); // mainCategoryOptions가 로드될 때까지 기다림
    }
  }, [mainCategoryId, fetchCategoryData]);


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
        <div className={styles.emptyMessage}>Loading category products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={`${styles.emptyMessage} ${styles.errorText}`}>Error: {error}</div>
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

        <div className={styles.titleContainer}>
            <h1 className={styles.title}>{title}</h1>
        </div>
        
        {/* TODO: 2차 카테고리 필터링 로직 구현 필요 */}
        <div className={styles.filterBar}>
            <button className={`${styles.filterChip} ${styles.active}`}>ALL</button>
            <button className={styles.filterChip}>categorie 1</button>
            <button className={styles.filterChip}>2차카테고리 노출</button>
        </div>

        <main className={styles.mainContent}>
            {subCategories.length > 0 ? (
              subCategories.map(subCategory1 => {
                  const products = productsByCategory[subCategory1.categoryId] || []; // 해당 subCategory1의 상품 목록
                  return (
                      <section key={subCategory1.categoryId} className={styles.subCategorySection}>
                          <div className={styles.subCategoryHeader}>
                              <h2>{subCategory1.name.replace(/_/g, ' ')}</h2>
                              {/* TODO: 3차 카테고리 페이지로 이동하는 Link로 변경 필요 */}
                              <Link href={`/products/${slugify(subCategory1.name)}`} className={styles.moreLink}>
                                  more <MoreIcon />
                              </Link>
                          </div>
                          <div className={styles.horizontalProductList}>
                              {products.length > 0 ? (
                                products.map(product => (
                                    <Link href={`/products/detail/${product.slug || product.id}`} key={product.id} className={styles.productLink}>
                                        <div className={styles.productCardWrapper}>
                                            {/* ProductCard에 필요한 product 속성 전달 */}
                                            <ProductCard product={{
                                                id: product.id,
                                                name: product.name, // DynamoDB의 productName 필드 사용
                                                price: product.calculatedPriceUsd, // DynamoDB의 calculatedPriceUsd 필드 사용
                                                discount: product.discount || 0, // 할인율 필드가 있다면 사용
                                                image: product.mainImage, // DynamoDB의 mainImage 필드 사용
                                                slug: product.sku // SKU를 slug로 사용하거나, 별도 slug 필드 사용
                                            }} onAddToCart={handleOpenCartModal} />
                                        </div>
                                    </Link>
                                ))
                              ) : (
                                <p style={{ color: '#6c757d', fontSize: '0.9rem', paddingLeft: '10px' }}>No products found in this category.</p>
                              )}
                          </div>
                      </section>
                  );
              })
            ) : (
              <div className={styles.emptyMessage}>
                <p>No sub-categories found for this main category.</p>
              </div>
            )}
        </main>

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
