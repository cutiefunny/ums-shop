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
import { useAuth } from '@/contexts/AuthContext';
import SearchComponent from '@/app/home/components/SearchComponent'; // SearchComponent 임포트

// --- Icons ---
const BackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>;
const SearchIcon = ({ isActive }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke={isActive ? '#FBC926' : 'currentColor'}
      style={{width: 24, height: 24}}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);
const CartIcon = () => <img src="/images/cart.png" alt="Cart" style={{width: 24, height: 24}} />;
const HeartIcon = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#E57373"/></svg>;
const HeartOutlineIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#495057" strokeWidth="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
const ChevronRightIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#495057" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ShippingIcon = () => <img src="/images/Delivery.png" alt="Shipping" style={{ width: '24px', height: '24px' }} />;


export default function ProductDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { slug } = params;

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCartModalOpen, setIsCartModalOpen] = useState(false);
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    const { showModal, showConfirmationModal } = useModal();
    const { isProductInWishlist, toggleWishlist } = useWishlist();
    const { user, isLoggedIn } = useAuth();

    const slugify = (text) => text.toLowerCase().replace(/ & /g, ' ').replace(/_/g, ' ').replace(/\s+/g, '-');

    const fetchProduct = useCallback(async () => {
        if (!slug) {
            setLoading(false);
            setError('Product ID (slug) is missing.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/products/${slug}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch product data');
            }
            const data = await response.json();

            const mappedProduct = {
                id: data.productId,
                slug: data.sku,
                categoryName: data.mainCategory,
                categorySlug: slugify(data.mainCategory || ''),
                name: data.productName,
                calculatedPriceUsd : data.calculatedPriceUsd,
                codename: data.sku,
                price: data.priceWon,
                discount: data.discount || 0,
                expiryDate: data.유통기한,
                deliveryTime: data.납기일 ? `${data.납기일} day(s)` : 'N/A',
                description: data.description,
                images: [data.mainImage, ...(data.subImages || [])].filter(Boolean),
                shippingInfo: 'Shipping available to ports and regular addresses'
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

    useEffect(() => {
        fetchProduct();
    }, [fetchProduct]);

    if (loading) {
        return <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />;
    }

    if (error) {
        return <div className={`${styles.pageContainer} ${styles.errorText}`}>Error: {error}</div>;
    }

    if (!product) {
        return <div className={styles.pageContainer}>Product not found.</div>;
    }

    const discountedPrice = product.price * (1 - product.discount / 100);
    const discountedUsd = product.calculatedPriceUsd * (1 - product.discount / 100);
    const isWishlisted = isProductInWishlist(product.id);

    const handleConfirmAddToCart = async (productName, quantity) => {
        if (!isLoggedIn || !user?.seq) {
            showModal("You must be logged in to add items to the cart.");
            router.push('/');
            return;
        }

        const itemToAdd = {
            productId: product.id,
            name: product.name,
            quantity: quantity,
            unitPrice: product.calculatedPriceUsd,
            mainImage: product.images[0],
            slug: product.slug,
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

            showConfirmationModal(
                "Added to Cart",
                `${productName} has been added to your cart. Would you like to go to the cart?`,
                () => {
                    router.push('/cart');
                },
                () => {}
            );

        } catch (error) {
            console.error("Failed to add product to cart:", error);
            showModal(`Failed to add product to cart: ${error.message}`);
        }
    };

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

            {/* [위치 이동] SearchComponent를 header 아래로 이동 */}
            <SearchComponent
                isVisible={isSearchVisible}
                onClose={() => setIsSearchVisible(false)}
            />
            
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
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0' }}>
                                    No Image
                                </div>
                            </SwiperSlide>
                        )}
                    </Swiper>
                </div>

                <div className={styles.infoSection}>
                    <div className={styles.categoryHeader}>
                        <button onClick={() => router.push(`/category1depth/${product.categorySlug}`)} className={styles.categoryLink}>
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
                        <span className={styles.finalPrice}>${discountedUsd.toFixed(2)}</span>
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
                    price: product.calculatedPriceUsd || discountedPrice
                }}
            />
        </div>
    );
}