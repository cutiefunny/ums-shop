'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

import styles from './product-detail.module.css';
import { useWishlist } from '@/contexts/WishlistContext';
import { useModal } from '@/contexts/ModalContext';
import AddToCartModal from './components/AddToCartModal'; // [신규] 바텀 시트 모달 import

// --- Icons ---
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const HeartIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#E57373"/></svg>;
const HeartOutlineIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#495057" strokeWidth="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
const ChevronRightIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#495057" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ShippingIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 8C1 7.44772 1.44772 7 2 7H14.3722C14.735 7 15.0665 7.214 15.2319 7.55279L18.2319 13.5528C18.6656 14.4143 19.8227 14.4143 20.2564 13.5528L23.2564 7.55279C23.4218 7.214 23.7533 7 24.1161 7H26" stroke="#495057" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 19.5C7 20.3284 6.32843 21 5.5 21C4.67157 21 4 20.3284 4 19.5C4 18.6716 4.67157 18 5.5 18C6.32843 18 7 18.6716 7 19.5Z" stroke="#495057" strokeWidth="1.5"/><path d="M21 19.5C21 20.3284 20.3284 21 19.5 21C18.6716 21 18 20.3284 18 19.5C18 18.6716 18.6716 18 19.5 18C20.3284 18 21 18.6716 21 19.5Z" stroke="#495057" strokeWidth="1.5"/><path d="M1 10V18C1 18.5523 1.44772 19 2 19H4" stroke="#495057" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 19H18" stroke="#495057" strokeWidth="1.5" strokeLinecap="round"/><path d="M18 14H15C14.4477 14 14 13.5523 14 13V9" stroke="#495057" strokeWidth="1.5" strokeLinecap="round"/></svg>;

// Mock Data
const productData = {
    id: 1,
    slug: 'herbal-extract-set',
    categoryName: 'Herbal Extracts & Supplements',
    categorySlug: 'herbal-extracts-supplements',
    name: 'Herbal Vitality Set',
    codename: 'HVS-001',
    price: 120.22,
    discount: 40,
    expiryDate: '2025-05-12',
    deliveryTime: '1 day',
    description: 'A complete set of herbal extracts to boost your vitality and wellness. This set includes a curated selection of our finest supplements, designed to support your immune system and enhance your overall health. Perfect for daily use.',
    images: [
        '/images/placeholder1.jpeg',
        '/images/placeholder2.jpeg',
        '/images/placeholder3.jpeg',
        '/images/placeholder4.jpeg',
    ],
    shippingInfo: 'Shipping available to ports and regular addresses'
};


export default function ProductDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [product, setProduct] = useState(productData);
    const [isCartModalOpen, setIsCartModalOpen] = useState(false); // [신규] 바텀 시트 모달 상태

    const { showModal } = useModal();
    const { isProductInWishlist, toggleWishlist } = useWishlist();

    const discountedPrice = product.price * (1 - product.discount / 100);
    const isWishlisted = isProductInWishlist(product.id);

    const handleConfirmAddToCart = (productName, quantity) => {
        // TODO: 실제 장바구니에 상품을 담는 로직 (e.g. API 호출)
        console.log(`${productName} ${quantity}개 장바구니에 추가`);
        showModal(`${productName} has been added to your cart.`);
    };

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.iconButton}>
                    <BackIcon />
                </button>
            </header>

            <main className={styles.mainContent}>
                <div className={styles.imageGallery}>
                    <Swiper
                        modules={[Pagination]}
                        pagination={{ clickable: true }}
                        className={styles.swiper}
                    >
                        {product.images.map((img, index) => (
                            <SwiperSlide key={index} className={styles.swiperSlide}>
                                <Image src={img} alt={`${product.name} image ${index + 1}`} layout="fill" objectFit="cover" />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>

                <div className={styles.infoSection}>
                    <div className={styles.categoryHeader}>
                        <button onClick={() => router.push(`/products/${product.categorySlug}`)} className={styles.categoryLink}>
                           <span>{product.categoryName}</span>
                           <ChevronRightIcon />
                        </button>
                        <button onClick={() => toggleWishlist(product.id)} className={styles.iconButton}>
                           {isWishlisted ? <HeartIcon /> : <HeartOutlineIcon />}
                        </button>
                    </div>

                    <h1 className={styles.productName}>{product.name}</h1>
                    <p className={styles.codename}>{product.codename}</p>

                    <div className={styles.priceSection}>
                        <span className={styles.originalPrice}>${product.price.toFixed(2)}</span>
                        <span className={styles.discount}>{product.discount}%</span>
                        <span className={styles.finalPrice}>${discountedPrice.toFixed(2)}</span>
                    </div>

                    <div className={styles.extraInfo}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Expiry date</span>
                            <span className={styles.infoValue}>{product.expiryDate}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Delivery date</span>
                            <span className={styles.infoValue}>{product.deliveryTime}</span>
                        </div>
                    </div>
                    
                    <div className={styles.shippingBox}>
                        <ShippingIcon />
                        <p>{product.shippingInfo}</p>
                    </div>
                </div>

                <div className={styles.descriptionSection}>
                    <h2 className={styles.descriptionTitle}>Product Description</h2>
                    <p className={styles.descriptionText}>{product.description}</p>
                </div>

            </main>

            <footer className={styles.fixedFooter}>
                <button className={styles.wishlistButton} onClick={() => toggleWishlist(product.id)}>
                    Add to Wishlist
                </button>
                {/* [수정] 클릭 시 바텀 시트 모달을 열도록 변경 */}
                <button className={styles.cartButton} onClick={() => setIsCartModalOpen(true)}>
                    Add to Cart
                </button>
            </footer>
            
            {/* [신규] 바텀 시트 모달 렌더링 */}
            <AddToCartModal
                isOpen={isCartModalOpen}
                onClose={() => setIsCartModalOpen(false)}
                onConfirm={handleConfirmAddToCart}
                product={product}
            />
        </div>
    );
}