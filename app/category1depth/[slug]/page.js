'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './category1depth.module.css';
import ProductCard from '@/components/ProductCard'; // [수정] 공용 ProductCard 경로
import { useModal } from '@/contexts/ModalContext';
import { categoryData, mockProducts, devices, generals, slugify } from '@/data/mockData';

// ... 아이콘 컴포넌트 및 페이지 로직은 기존과 동일 ...
// 아이콘 컴포넌트
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const SearchIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="black"/></svg>;
const CartIcon = () => <img src="/images/cart.png" alt="Cart" style={{width: 24, height: 24}} />;
const MoreIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18L15 12L9 6" stroke="#495057" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;


export default function Category1DepthPage() {
  const router = useRouter();
  const params = useParams();
  const { showModal } = useModal();
  const { slug } = params;

  const currentCategory = categoryData.find(cat => slugify(cat.name) === slug);
  const title = currentCategory ? currentCategory.name.replace(/_/g, ' ') : 'Category';
  const subCategories = currentCategory ? currentCategory.subCategories : [];

  const handleAddToCart = (productName) => {
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

        <div className={styles.titleContainer}>
        <h1 className={styles.title}>{title}</h1>
      </div>
        
        <div className={styles.filterBar}>
            <button className={`${styles.filterChip} ${styles.active}`}>ALL</button>
            <button className={styles.filterChip}>categorie 1</button>
            <button className={styles.filterChip}>2차카테고리 노출</button>
        </div>

        <main className={styles.mainContent}>
            {subCategories.map(subCategory => {
                const products = subCategory === 'Beauty & Health Devices' ? devices : 
                                 subCategory === 'General Health & Supplements' ? generals : 
                                 mockProducts;
                return (
                    <section key={subCategory} className={styles.subCategorySection}>
                        <div className={styles.subCategoryHeader}>
                            <h2>{subCategory.replace(/_/g, ' ')}</h2>
                            <Link href={`/products/${slugify(subCategory)}`} className={styles.moreLink}>
                                more <MoreIcon />
                            </Link>
                        </div>
                        <div className={styles.horizontalProductList}>
                            {products.map(product => (
                                <div key={product.id} className={styles.productCardWrapper}>
                                    <ProductCard product={product} onAddToCart={handleAddToCart} />
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}
        </main>
    </div>
);
}