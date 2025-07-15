// app/products/detail/[slug]/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react'; // useEffect, useCallback 추가
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

import styles from './product-detail.module.css';
import { useWishlist } from '@/contexts/WishlistContext';
import { useModal } from '@/contexts/ModalContext';
import AddToCartModal from './components/AddToCartModal';

// --- Icons ---
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const HeartIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#E57373"/></svg>;
const HeartOutlineIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#495057" strokeWidth="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
const ChevronRightIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#495057" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ShippingIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 8C1 7.44772 1.44772 7 2 7H14.3722C14.735 7 15.0665 7.214 15.2319 7.55279L18.2319 13.5528C18.6656 14.4143 19.8227 14.4143 20.2564 13.5528L23.2564 7.55279C23.4218 7.214 23.7533 7 24.1161 7H26" stroke="#495057" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 19.5C7 20.3284 6.32843 21 5.5 21C4.67157 21 4 20.3284 4 19.5C4 18.6716 4.67157 18 5.5 18C6.32843 18 7 18.6716 7 19.5Z" stroke="#495057" strokeWidth="1.5"/><path d="M21 19.5C21 20.3284 20.3284 21 19.5 21C18.6716 21 18 20.3284 18 19.5C18 18.6716 18.6716 18 19.5 18C20.3284 18 21 18.6716 21 19.5Z" stroke="#495057" strokeWidth="1.5"/><path d="M1 10V18C1 18.5523 1.44772 19 2 19H4" stroke="#495057" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 19H18" stroke="#495057" strokeWidth="1.5" strokeLinecap="round"/><path d="M18 14H15C14.4477 14 14 13.5523 14 13V9" stroke="#495057" strokeWidth="1.5" strokeLinecap="round"/></svg>;


export default function ProductDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { slug } = params; // URL에서 slug (productId 또는 SKU) 가져오기

    const [product, setProduct] = useState(null); // 초기값을 null로 설정
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCartModalOpen, setIsCartModalOpen] = useState(false);

    const { showModal } = useModal();
    const { isProductInWishlist, toggleWishlist } = useWishlist();

    // 텍스트를 URL slug 형식으로 변환하는 헬퍼 함수
    const slugify = (text) => text.toLowerCase().replace(/ & /g, ' ').replace(/_/g, ' ').replace(/\s+/g, '-');


    // API를 통해 상품 데이터를 불러오는 함수
    const fetchProduct = useCallback(async () => {
        if (!slug) {
            setLoading(false);
            setError('Product ID (slug) is missing.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            // productId는 slug 값을 사용 (SKU로 가정)
            const response = await fetch(`/api/products/${slug}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch product data');
            }
            const data = await response.json();
            
            // DynamoDB에서 가져온 데이터를 컴포넌트가 사용하는 형태로 매핑
            const mappedProduct = {
                id: data.productId, // Wishlist에서 사용할 ID
                slug: data.sku, // Link 이동 시 사용할 slug
                categoryName: data.mainCategory, // 메인 카테고리
                categorySlug: slugify(data.mainCategory || ''), // 카테고리 링크에 사용할 slug
                name: data.productName,
                calculatedPriceUsd : data.calculatedPriceUsd, // USD 가격 (DynamoDB에서 가져온 필드)
                codename: data.sku, // SKU를 codename으로 사용
                price: data.priceWon, // 원화 가격을 기본 price로 사용
                discount: data.discount || 0, // 할인율 (없으면 0)
                expiryDate: data.유통기한,
                deliveryTime: data.납기일 ? `${data.납기일} day(s)` : 'N/A', // 납기일
                description: data.description,
                images: [data.mainImage, ...(data.subImages || [])].filter(Boolean), // 메인 이미지와 서브 이미지 배열 (null/undefined 필터링)
                shippingInfo: 'Shipping available to ports and regular addresses' // DynamoDB에 없는 필드, 임시로 유지
            };
            setProduct(mappedProduct);
        } catch (err) {
            console.error("Error fetching product:", err);
            setError(`Failed to load product details: ${err.message}`);
            showModal(`Failed to load product details: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [slug, showModal]);

    // 컴포넌트 마운트 시 또는 slug 변경 시 데이터 불러오기
    useEffect(() => {
        fetchProduct();
    }, [fetchProduct]);

    // 로딩 및 에러 상태 처리
    if (loading) {
        return <div className={styles.pageContainer}>Loading product details...</div>;
    }

    if (error) {
        return <div className={`${styles.pageContainer} ${styles.errorText}`}>Error: {error}</div>;
    }

    if (!product) {
        return <div className={styles.pageContainer}>Product not found.</div>;
    }

    // 할인 가격 계산
    const discountedPrice = product.price * (1 - product.discount / 100);
    const discountedUsd = product.calculatedPriceUsd * (1 - product.discount / 100);
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
                        {product.images.length > 0 ? (
                            product.images.map((img, index) => (
                                <SwiperSlide key={index} className={styles.swiperSlide}>
                                    <Image src={img} alt={`${product.name} image ${index + 1}`} layout="fill" objectFit="cover" />
                                </SwiperSlide>
                            ))
                        ) : (
                            <SwiperSlide className={styles.swiperSlide}>
                                {/* 이미지가 없을 경우 대체 이미지 또는 메시지 */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0' }}>
                                    No Image
                                </div>
                            </SwiperSlide>
                        )}
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
                        { product.discount > 0 && (
                        <>
                            <span className={styles.originalPrice}>${product.calculatedPriceUsd.toFixed(2)}</span>
                            <span className={styles.discount}>{product.discount}%</span>
                        </>
                        )}
                        <span className={styles.finalPrice}>${discountedUsd.toFixed(2)}</span> {/* calculatedPriceUsd가 있으면 사용, 없으면 기존 할인 로직 */}
                    </div>

                    <div className={styles.extraInfo}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Expiry date</span>
                            <span className={styles.infoValue}>{product.expiryDate || 'N/A'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Delivery date</span>
                            <span className={styles.infoValue}>{product.deliveryTime || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div className={styles.shippingBox}>
                        <ShippingIcon />
                        <p>{product.shippingInfo}</p>
                    </div>
                </div>

                <div className={styles.descriptionSection}>
                    <h2 className={styles.descriptionTitle}>Product Description</h2>
                    <p className={styles.descriptionText}>{product.description || 'No description available.'}</p>
                </div>
            </main>

            <footer className={styles.fixedFooter}>
                <button className={styles.wishlistButton} onClick={() => toggleWishlist(product.id)}>
                    Add to Wishlist
                </button>
                <button className={styles.cartButton} onClick={() => setIsCartModalOpen(true)}>
                    Add to Cart
                </button>
            </footer>
            
            <AddToCartModal
                isOpen={isCartModalOpen}
                onClose={() => setIsCartModalOpen(false)}
                onConfirm={handleConfirmAddToCart}
                product={{
                    ...product,
                    price: product.calculatedPriceUsd || discountedPrice // 모달에 최종 가격 전달
                }}
            />
        </div>
    );
}