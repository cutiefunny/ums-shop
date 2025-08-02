// app/products/detail/[slug]/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '@/contexts/AuthContext'; // useAuth 임포트

// --- Icons ---
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const SearchIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="black"/></svg>;
const CartIcon = () => <img src="/images/cart.png" alt="Cart" style={{width: 24, height: 24}} />;
const HeartIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#E57373"/></svg>;
const HeartOutlineIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#495057" strokeWidth="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
const ChevronRightIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#495057" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ShippingIcon = () => <img src="/images/Delivery.png" alt="Shipping" style={{ width: '24px', height: '24px' }} />;


export default function ProductDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { slug } = params; // URL에서 slug (productId 또는 SKU) 가져오기

    const [product, setProduct] = useState(null); // 초기값을 null로 설정
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCartModalOpen, setIsCartModalOpen] = useState(false);

    const { showModal, showConfirmationModal } = useModal();
    const { isProductInWishlist, toggleWishlist } = useWishlist();
    const { user, isLoggedIn } = useAuth(); // 로그인 사용자 정보 가져오기

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
        return <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />;
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

    const handleConfirmAddToCart = async (productName, quantity) => {
        if (!isLoggedIn || !user?.seq) {
            showModal("장바구니에 상품을 추가하려면 로그인해야 합니다.");
            router.push('/'); // 로그인 페이지 또는 홈으로 리다이렉트
            return;
        }

        // 선택된 상품의 모든 상세 정보 (product)와 수량(quantity)을 활용
        const itemToAdd = {
            productId: product.id, // Product ID
            name: product.name,
            quantity: quantity,
            unitPrice: product.calculatedPriceUsd, // USD 가격을 단위 가격으로 사용
            mainImage: product.images[0], // 메인 이미지
            slug: product.slug, // 상세 페이지 이동을 위한 slug (SKU)
            // 필요한 다른 상품 정보 (예: SKU, 옵션 등) 추가
        };

        try {
            // 1. 현재 사용자 데이터를 다시 불러와서 기존 cart 정보를 가져옵니다.
            const userResponse = await fetch(`/api/users/${user.seq}`);
            if (!userResponse.ok) {
                throw new Error('Failed to fetch user cart data.');
            }
            const userData = await userResponse.json();
            const currentCart = userData.cart || []; // 사용자의 기존 cart 배열, 없으면 빈 배열

            // 2. 새로운 항목을 cart 배열에 추가하거나 기존 항목의 수량을 업데이트합니다.
            const existingItemIndex = currentCart.findIndex(item => item.productId === itemToAdd.productId);
            let updatedCart;

            if (existingItemIndex > -1) {
                // 이미 장바구니에 있는 상품이면 수량만 업데이트
                updatedCart = currentCart.map((item, index) =>
                    index === existingItemIndex
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                // 장바구니에 없는 상품이면 새로 추가
                updatedCart = [...currentCart, itemToAdd];
            }

            // 3. 업데이트된 cart 배열을 /api/users/[seq] 엔드포인트로 PUT 요청을 보내어 저장합니다.
            const response = await fetch(`/api/users/${user.seq}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart: updatedCart }), // 'cart' 필드만 업데이트
            });

            if (!response.ok) {
                throw new Error('Failed to add item to cart in DB.');
            }

            console.log(`장바구니에 추가된 상품 정보:`, itemToAdd);
            console.log(`사용자 (ID: ${user.seq})의 장바구니가 업데이트되었습니다.`);

            // 성공 모달을 ConfirmationModal로 변경
            showConfirmationModal(
                "장바구니 추가 완료", // 모달 제목
                `${productName} 제품이 장바구니에 추가되었습니다. 장바구니로 가시겠습니까?`, // 모달 메시지
                () => { // 확인 버튼 클릭 시 (onConfirm)
                    router.push('/cart'); // 장바구니 페이지로 이동
                },
                () => { // 취소 버튼 클릭 시 (onCancel)
                    // 모달만 닫고 아무것도 하지 않음
                }
            );

        } catch (error) {
            console.error("장바구니에 상품 추가 실패:", error);
            showModal(`장바구니에 상품을 추가하지 못했습니다: ${error.message}`);
        }
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