// app/admin/product-management/new/page.js
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './product-add-edit.module.css';

import { useAdminModal } from '@/contexts/AdminModalContext';

// SKU 자동 생성 헬퍼 함수
async function generateSku(productName, mainCatName) {
    if (!productName || !mainCatName) return '';
    const productNameCode = productName.match(/[A-Z]/g)?.join('') || 'SKU';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${productNameCode}-${randomSuffix}`;
}

export default function NewProductPage() {
    const router = useRouter();
    const { showAdminNotificationModal } = useAdminModal();

    const [loading, setLoading] = useState(false);
    
    const [product, setProduct] = useState({
        productName: '',
        mainCategory: '',
        subCategory1: '',
        subCategory2: '',
        sku: '',
        description: '',
        mainImage: null,
        subImages: [],
        stockQuantity: '',
        유통기한: '',
        납기일: '',
        purchas: '',
        autoExchangeRate: 'Yes',
        priceWon: '',
        exchangeRate: '',
        exchangeRateOffset: '',
        usdPriceOverride: '',
        calculatedPriceUsd: 0,
        status: 'Public',
    });

    const [formErrors, setFormErrors] = useState({});
    const mainImageInputRef = useRef(null);
    const subImageInputRef = useRef(null);

    const [mainCategoryOptions, setMainCategoryOptions] = useState([]);
    const [subCategory1Options, setSubCategory1Options] = useState([]);
    const [subCategory2Options, setSubCategory2Options] = useState([]);

    const fetchMainCategories = useCallback(async () => {
        try {
            const response = await fetch('/api/categories?level=main');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setMainCategoryOptions([{ id: 'All', name: 'All', code: '' }, ...data.map(cat => ({ id: cat.categoryId, name: cat.name, code: cat.code }))]);
        } catch (err) {
            console.error("Error fetching main categories:", err);
            showAdminNotificationModal(`메인 카테고리 로딩 실패: ${err.message}`);
        }
    }, [showAdminNotificationModal]);

    const fetchSubCategory1s = useCallback(async (mainCatId) => {
        if (mainCatId === 'All' || !mainCatId) {
            setSubCategory1Options([{ id: 'All', name: 'All', code: '' }]);
            return;
        }
        try {
            const response = await fetch(`/api/categories?level=surve1&parentId=${mainCatId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setSubCategory1Options([{ id: 'All', name: 'All', code: '' }, ...data.map(cat => ({ id: cat.categoryId, name: cat.name, code: cat.code }))]);
        } catch (err) {
            console.error("Error fetching sub category 1s:", err);
            showAdminNotificationModal(`서브 카테고리1 로딩 실패: ${err.message}`);
        }
    }, [showAdminNotificationModal]);

    const fetchSubCategory2s = useCallback(async (sub1CatId) => {
        if (sub1CatId === 'All' || !sub1CatId) {
            setSubCategory2Options([{ id: 'All', name: 'All', code: '' }]);
            return;
        }
        try {
            const response = await fetch(`/api/categories?level=surve2&parentId=${sub1CatId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setSubCategory2Options([{ id: 'All', name: 'All', code: '' }, ...data.map(cat => ({ id: cat.categoryId, name: cat.name, code: cat.code }))]);
        } catch (err) {
            console.error("Error fetching sub category 2s:", err);
            showAdminNotificationModal(`서브 카테고리2 로딩 실패: ${err.message}`);
        }
    }, [showAdminNotificationModal]);

    useEffect(() => {
        fetchMainCategories();
    }, [fetchMainCategories]);

    useEffect(() => {
        const updateSku = async () => {
            if (product.productName && product.mainCategory) {
                const newSku = await generateSku(product.productName, product.mainCategory);
                if (newSku !== product.sku) setProduct(prev => ({ ...prev, sku: newSku }));
            } else {
                if (product.sku !== '') setProduct(prev => ({ ...prev, sku: '' }));
            }
        };
        updateSku();
    }, [product.productName, product.mainCategory]);
    
    useEffect(() => {
        let calculatedPrice = 0;
        const priceWon = parseFloat(product.priceWon);
        const exchangeRate = parseFloat(product.exchangeRate);
        const exchangeRateOffset = parseFloat(product.exchangeRateOffset);
        const usdPriceOverride = parseFloat(product.usdPriceOverride);

        if (isNaN(priceWon) || priceWon <= 0) {
            calculatedPrice = 0;
        } else if (product.autoExchangeRate === 'No' && !isNaN(usdPriceOverride) && usdPriceOverride > 0) {
            calculatedPrice = usdPriceOverride;
        } else if (product.autoExchangeRate === 'Yes') {
            const baseExchangeRate = 1300;
            if (!isNaN(baseExchangeRate) && baseExchangeRate > 0) {
                calculatedPrice = priceWon / (baseExchangeRate * (1 + (isNaN(exchangeRateOffset) ? 0 : exchangeRateOffset)));
            }
        } else if (product.autoExchangeRate === 'No' && !isNaN(exchangeRate) && exchangeRate > 0) {
            calculatedPrice = priceWon / exchangeRate;
        }
        const finalCalculatedPrice = Number.isNaN(calculatedPrice) ? 0 : calculatedPrice;
        setProduct(prev => ({ ...prev, calculatedPriceUsd: finalCalculatedPrice }));
    }, [product.priceWon, product.autoExchangeRate, product.exchangeRate, product.exchangeRateOffset, product.usdPriceOverride]);

    const isFormValid = useMemo(() => {
        const requiredFields = [
            'productName', 'mainCategory', 'subCategory1', 'subCategory2', 'description',
            'stockQuantity', '유통기한', '납기일', 'priceWon', 'status'
        ];
        
        const allRequiredFilled = requiredFields.every(field => {
            const value = product[field];
            if (value === null || value === undefined) return false;
            if (typeof value === 'string') return value.trim() !== '';
            if (typeof value === 'number') return value >= 0;
            return true;
        });

        if (!allRequiredFilled) return false;

        if (product.autoExchangeRate === 'No') {
            if (!product.exchangeRate || parseFloat(product.exchangeRate) <= 0) return false;
        } else {
            if (product.exchangeRateOffset !== '' && parseFloat(product.exchangeRateOffset) < 0) return false;
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (product.유통기한 && !dateRegex.test(product.유통기한)) return false;

        return true;
    }, [product]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setProduct(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleCategoryChange = async (e, level) => {
        const selectedId = e.target.value;
        let selectedName = '';
        setProduct(prev => {
            const newState = { ...prev };
            if (level === 'main') {
                selectedName = mainCategoryOptions.find(cat => cat.id === selectedId)?.name || '';
                newState.mainCategory = selectedName;
                newState.subCategory1 = '';
                newState.subCategory2 = '';
                setSubCategory1Options([{ id: 'All', name: 'All', code: '' }]);
                setSubCategory2Options([{ id: 'All', name: 'All', code: '' }]);
                if (selectedId !== 'All') fetchSubCategory1s(selectedId);
            } else if (level === 'sub1') {
                selectedName = subCategory1Options.find(cat => cat.id === selectedId)?.name || '';
                newState.subCategory1 = selectedName;
                newState.subCategory2 = '';
                setSubCategory2Options([{ id: 'All', name: 'All', code: '' }]);
                if (selectedId !== 'All') fetchSubCategory2s(selectedId);
            } else if (level === 'sub2') {
                selectedName = subCategory2Options.find(cat => cat.id === selectedId)?.name || '';
                newState.subCategory2 = selectedName;
            }
            return newState;
        });
        setFormErrors(prev => ({ ...prev, [`${level}Category`]: undefined }));
    };

    const handleImageUpload = (e, isMain = false) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                if (isMain) {
                    setProduct(prev => ({ ...prev, mainImage: reader.result }));
                } else {
                    if (product.subImages.length < 10) {
                        setProduct(prev => ({ ...prev, subImages: [...prev.subImages, reader.result] }));
                    } else {
                        showAdminNotificationModal('Sub images can be uploaded up to 10.');
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteImage = (indexToDelete, isMain = false) => {
        if (isMain) {
            setProduct(prev => ({ ...prev, mainImage: null }));
        } else {
            setProduct(prev => ({ ...prev, subImages: prev.subImages.filter((_, index) => index !== indexToDelete) }));
        }
    };

    // [수정됨] S3 업로드 로직이 포함된 저장 함수
    const handleSave = async () => {
        if (!isFormValid) {
            showAdminNotificationModal('Please fill in all required fields correctly.');
            return;
        }

        setLoading(true);
        let finalProductData = { ...product };

        // S3 업로드 함수
        const uploadImageToS3 = async (base64Image, imageNamePrefix) => {
            try {
                const blob = await fetch(base64Image).then(res => res.blob());
                const file = new File([blob], `${imageNamePrefix}_${Date.now()}.png`, { type: blob.type });

                const s3UploadUrlResponse = await fetch(`/api/s3-upload-url?filename=${file.name}`);
                if (!s3UploadUrlResponse.ok) {
                    throw new Error(await s3UploadUrlResponse.text());
                }
                const { url, fields } = await s3UploadUrlResponse.json();

                const formData = new FormData();
                Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
                formData.append('file', file);

                const s3Response = await fetch(url, { method: 'POST', body: formData });
                if (!s3Response.ok) throw new Error('Failed to upload to S3');

                return `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${fields.key}`;
            } catch (imgError) {
                console.error(`${imageNamePrefix} image upload error:`, imgError);
                throw imgError;
            }
        };

        try {
            // 메인 이미지 업로드
            if (product.mainImage && product.mainImage.startsWith('data:')) {
                showAdminNotificationModal('Uploading main image...');
                finalProductData.mainImage = await uploadImageToS3(product.mainImage, 'main');
            }

            // 서브 이미지 업로드
            const uploadedSubImages = [];
            for (const img of product.subImages) {
                if (img && img.startsWith('data:')) {
                    showAdminNotificationModal('Uploading sub images...');
                    const newUrl = await uploadImageToS3(img, 'sub');
                    uploadedSubImages.push(newUrl);
                } else {
                    uploadedSubImages.push(img); // 이미 URL인 경우 그대로 유지
                }
            }
            finalProductData.subImages = uploadedSubImages;

            // API 서버로 데이터 전송
            const dataToSend = {
                id: finalProductData.sku,
                name: finalProductData.productName,
                price: parseFloat(finalProductData.priceWon),
                ...finalProductData,
            };

            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add product');
            }

            showAdminNotificationModal('Product added successfully.');
            router.push('/admin/product-management');

        } catch (err) {
            console.error("Error saving product:", err);
            showAdminNotificationModal(`Error saving product: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.headerTitle}>Add New Product</h1>
                <button onClick={() => router.back()} className={styles.closeButton}>&times;</button>
            </header>
            
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Product Information</h2>
                <div className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="productName" className={`${styles.label} ${styles.requiredLabel}`}>Product Name</label>
                        <input type="text" id="productName" name="productName" value={product.productName} onChange={handleChange} className={styles.input} maxLength={100} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="mainCategory" className={`${styles.label} ${styles.requiredLabel}`}>Category (Main / Sub1 / Sub2)</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <select id="mainCategory" name="mainCategory" value={mainCategoryOptions.find(c => c.name === product.mainCategory)?.id || 'All'} onChange={e => handleCategoryChange(e, 'main')} className={styles.select}>
                                {mainCategoryOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select id="subCategory1" name="subCategory1" value={subCategory1Options.find(c => c.name === product.subCategory1)?.id || 'All'} onChange={e => handleCategoryChange(e, 'sub1')} className={styles.select} disabled={!product.mainCategory || product.mainCategory === 'All'}>
                                {subCategory1Options.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select id="subCategory2" name="subCategory2" value={subCategory2Options.find(c => c.name === product.subCategory2)?.id || 'All'} onChange={e => handleCategoryChange(e, 'sub2')} className={styles.select} disabled={!product.subCategory1 || product.subCategory1 === 'All'}>
                                {subCategory2Options.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>SKU</label>
                        <input type="text" name="sku" value={product.sku} className={styles.input} readOnly disabled placeholder="Auto-generated" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="description" className={`${styles.label} ${styles.requiredLabel}`}>Description</label>
                        <textarea id="description" name="description" value={product.description} onChange={handleChange} className={styles.textarea} rows="5" placeholder="Enter product description" />
                    </div>
                </div>
            </section>
            
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Image Upload</h2>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Main Image</label>
                        <input type="file" accept="image/*" ref={mainImageInputRef} style={{ display: 'none' }} onChange={e => handleImageUpload(e, true)} />
                        <div className={styles.imageUploadBox} onClick={() => mainImageInputRef.current.click()}>
                            {product.mainImage ? <Image src={product.mainImage} alt="Main Preview" width={100} height={100} /> : <span>Upload Image</span>}
                            {product.mainImage && <button className={styles.deleteImageButton} onClick={e => { e.stopPropagation(); handleDeleteImage(null, true); }}>&times;</button>}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Recommended: 350x350px</p>
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Sub Images (Max 10)</label>
                        <input type="file" accept="image/*" multiple ref={subImageInputRef} style={{ display: 'none' }} onChange={e => handleImageUpload(e, false)} />
                        <div className={styles.imageUploadGrid}>
                            {product.subImages.map((img, index) => (
                                <div key={index} className={styles.imageUploadBox}>
                                    <Image src={img} alt={`Sub Preview ${index}`} width={100} height={100} />
                                    <button className={styles.deleteImageButton} onClick={e => { e.stopPropagation(); handleDeleteImage(index, false); }}>&times;</button>
                                </div>
                            ))}
                            {product.subImages.length < 10 && <div className={styles.imageUploadBox} onClick={() => subImageInputRef.current.click()}><span>Upload Image</span></div>}
                        </div>
                    </div>
                </div>
            </section>
            
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Stock & Other Information</h2>
                <div className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="stockQuantity" className={`${styles.label} ${styles.requiredLabel}`}>Stock Quantity</label>
                        <input type="number" id="stockQuantity" name="stockQuantity" value={product.stockQuantity} onChange={handleChange} className={styles.input} min="0" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="유통기한" className={`${styles.label} ${styles.requiredLabel}`}>유통기한 (YYYY-MM-DD)</label>
                        <input type="date" id="유통기한" name="유통기한" value={product.유통기한} onChange={handleChange} className={styles.input} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="납기일" className={`${styles.label} ${styles.requiredLabel}`}>납기일 (Days)</label>
                        <input type="number" id="납기일" name="납기일" value={product.납기일} onChange={handleChange} className={styles.input} min="0" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="purchas" className={styles.label}>Purchas (Optional)</label>
                        <input type="text" id="purchas" name="purchas" value={product.purchas} onChange={handleChange} className={styles.input} />
                    </div>
                </div>
            </section>
            
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Price & Exchange Rate</h2>
                <div className={styles.priceExchangeGrid}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="priceWon" className={`${styles.label} ${styles.requiredLabel}`}>Price(won)</label>
                        <input type="number" id="priceWon" name="priceWon" value={product.priceWon} onChange={handleChange} className={styles.input} min="0" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={`${styles.label} ${styles.requiredLabel}`}>Use Automatic Exchange Rate?</label>
                        <div className={styles.radioGroup}>
                            <label><input type="radio" name="autoExchangeRate" value="Yes" checked={product.autoExchangeRate === 'Yes'} onChange={handleChange} /> Yes</label>
                            <label><input type="radio" name="autoExchangeRate" value="No" checked={product.autoExchangeRate === 'No'} onChange={handleChange} /> No</label>
                        </div>
                    </div>
                    {product.autoExchangeRate === 'Yes' ? (
                        <div className={styles.inputGroup}>
                            <label htmlFor="exchangeRateOffset" className={styles.label}>Exchange Rate Offset (Optional)</label>
                            <input type="number" id="exchangeRateOffset" name="exchangeRateOffset" value={product.exchangeRateOffset} onChange={handleChange} className={styles.input} placeholder="e.g., 0.05 (5%)" step="0.01" min="0" />
                        </div>
                    ) : (
                        <>
                            <div className={styles.inputGroup}>
                                <label htmlFor="exchangeRate" className={`${styles.label} ${styles.requiredLabel}`}>Exchange Rate</label>
                                <input type="number" id="exchangeRate" name="exchangeRate" value={product.exchangeRate} onChange={handleChange} className={styles.input} min="0" />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="usdPriceOverride" className={styles.label}>USD Price Override (Optional)</label>
                                <input type="number" id="usdPriceOverride" name="usdPriceOverride" value={product.usdPriceOverride} onChange={handleChange} className={styles.input} placeholder="Overrides auto-calculation" min="0" />
                            </div>
                        </>
                    )}
                </div>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Calculated USD Price</label>
                    <input type="text" value={`$${product.calculatedPriceUsd.toFixed(2)}`} readOnly disabled className={styles.input} />
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Save & Exposure Setting</h2>
                <div className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                        <label className={`${styles.label} ${styles.requiredLabel}`}>Status</label>
                        <div className={styles.radioGroup}>
                            <label><input type="radio" name="status" value="Public" checked={product.status === 'Public'} onChange={handleChange} /> Public</label>
                            <label><input type="radio" name="status" value="Hidden" checked={product.status === 'Hidden'} onChange={handleChange} /> Hidden</label>
                        </div>
                    </div>
                </div>
            </section>

            <div className={styles.footerActions}>
                <button onClick={handleSave} className={styles.saveButton} disabled={!isFormValid || loading}>
                    {loading ? 'Saving...' : 'SAVE'}
                </button>
            </div>
        </div>
    );
}