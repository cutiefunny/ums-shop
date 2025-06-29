'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import styles from '../../new/product-add-edit.module.css'; // 새 CSS 모듈 임포트 (재사용)

import { useAdminModal } from '@/contexts/AdminModalContext';

// DynamoDB 관련 import (클라이언트 컴포넌트에서 직접 접근)
// WARN: 클라이언트 컴포넌트에서 AWS 자격 증명을 직접 사용하는 것은 보안상 위험합니다.
// 프로덕션 환경에서는 반드시 Next.js API Routes를 통해 서버 사이드에서 통신하도록 리팩토링하세요.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// DynamoDB 클라이언트 초기화 (클라이언트 컴포넌트에서 직접 접근 시)
const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
    },
});
const docClient = DynamoDBDocumentClient.from(client);

// DynamoDB 테이블 이름 (환경 변수에서 가져옴)
const PRODUCT_MANAGEMENT_TABLE_NAME = process.env.NEXT_PUBLIC_DYNAMODB_TABLE_PRODUCTS || 'product-management';


// 카테고리 데이터 및 SKU 생성을 위한 Mock/매핑 데이터 (실제로는 API에서 가져오거나 더 복잡한 로직)
const CATEGORY_DATA = {
    'Category A': { code: '01', sub1: [{ name: 'Sub A1', code: '01' }, { name: 'Sub A2', code: '02' }] },
    'Category B': { code: '02', sub1: [{ name: 'Sub B1', code: '01' }, { name: 'Sub B2', code: '02' }] },
    'Category C': { code: '03', sub1: [{ name: 'Sub C1', code: '01' }, { name: 'Sub C2', code: '02' }] },
};

// 이미지 URL을 Base64로 변환하는 헬퍼 함수 (PDF 임베딩용) - PDF 기능을 위해 재사용
async function imageUrlToBase64(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Failed to fetch image for PDF: ${url}, status: ${response.status}`);
            return null;
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error converting image to base64:", url, error);
        return null;
    }
}

// SKU 자동 생성 헬퍼 함수 (편집 페이지에서는 보통 SKU가 고정되지만, 카테고리 변경 시 재활용 가능)
async function generateSku(mainCat, sub1Cat, sub2Cat) {
    if (!mainCat || !sub1Cat || !sub2Cat) return '';

    const mainCode = CATEGORY_DATA[mainCat]?.code || '';
    const sub1Code = CATEGORY_DATA[mainCat]?.sub1.find(s => s.name === sub1Cat)?.code || '';
    const sub2Code = CATEGORY_DATA[mainCat]?.sub1.find(s => s.name === sub2Cat)?.code || ''; 

    // 실제로는 SKU 중복 방지를 위해 DynamoDB에서 마지막 SKU 번호를 조회해야 함
    // 여기서는 간단화를 위해 랜덤 4자리 숫자를 추가합니다. (편집에서는 기존 SKU 유지 권장)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); 

    if (mainCode && sub1Code && sub2Code) {
        return `${mainCode}${sub1Code}${sub2Code}-${randomSuffix}`;
    }
    return '';
}

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const { productId } = params; // URL에서 productId 가져오기

    const { showAdminNotificationModal } = useAdminModal();

    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState(null);

    const [product, setProduct] = useState({
        productId: '', // 편집 모드에서는 초기값으로 설정될 예정
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

    // 제품 데이터 불러오기
    useEffect(() => {
        async function fetchProductData() {
            if (!productId) {
                setLoading(false);
                setError('제품 ID가 누락되었습니다.');
                return;
            }
            setLoading(true);
            setError(null);
            try {
                // 특정 제품을 가져오는 API Route 호출 (GET /api/products/[productId])
                const response = await fetch(`/api/products/${productId}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch product data');
                }
                const data = await response.json();
                setProduct(data); // 불러온 데이터로 폼 채우기
            } catch (err) {
                console.error("Error fetching product:", err);
                setError(`제품 데이터를 불러오는 데 실패했습니다: ${err.message}`);
            } finally {
                setLoading(false);
            }
        }
        fetchProductData();
    }, [productId]);


    // 필수 필드 유효성 검사 (SAVE 버튼 활성화/비활성화)
    const isFormValid = useMemo(() => {
        const requiredFields = [
            'productName', 'mainCategory', 'subCategory1', 'subCategory2', 'description', 
            'stockQuantity', '유통기한', '납기일', 'priceWon', 'status'
        ];
        
        const allRequiredFilled = requiredFields.every(field => {
            if (typeof product[field] === 'number') return product[field] >= 0;
            return product[field] !== '' && product[field] !== null && product[field] !== undefined;
        });

        if (product.autoExchangeRate === 'No') {
            if (product.exchangeRate === '' || parseFloat(product.exchangeRate) <= 0) return false;
        } else {
            if (product.exchangeRateOffset === '' || parseFloat(product.exchangeRateOffset) < 0) return false;
        }
        
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (product.유통기한 && !dateRegex.test(product.유통기한)) return false;

        return allRequiredFilled;
    }, [product]);

    // Calculated USD Price 계산 로직 (SKU는 편집에서 고정되므로 제외)
    useEffect(() => {
        let calculatedPrice = 0;
        const priceWon = parseFloat(product.priceWon);
        const exchangeRate = parseFloat(product.exchangeRate); 
        const exchangeRateOffset = parseFloat(product.exchangeRateOffset);
        const usdPriceOverride = parseFloat(product.usdPriceOverride);
        // const discount = parseFloat(product.discount); // discount 필드가 없으므로 주석 처리

        if (isNaN(priceWon) || priceWon <= 0) {
            calculatedPrice = 0;
        } else if (product.autoExchangeRate === 'No' && !isNaN(usdPriceOverride) && usdPriceOverride > 0) {
            calculatedPrice = usdPriceOverride;
        } else if (product.autoExchangeRate === 'Yes') {
            const baseExchangeRate = 1300; 
            if (!isNaN(baseExchangeRate) && baseExchangeRate > 0) {
                // discount 필드를 사용하지 않고 계산
                calculatedPrice = priceWon / (baseExchangeRate * (1 + (isNaN(exchangeRateOffset) ? 0 : exchangeRateOffset)));
            }
        } else if (product.autoExchangeRate === 'No' && !isNaN(exchangeRate) && exchangeRate > 0) {
            // discount 필드를 사용하지 않고 계산
            calculatedPrice = priceWon / exchangeRate;
        }
        
        const finalCalculatedPrice = Number.isNaN(calculatedPrice) ? 0 : calculatedPrice;
        
        setProduct(prev => ({ ...prev, calculatedPriceUsd: finalCalculatedPrice }));
    }, [
        product.priceWon, product.autoExchangeRate, product.exchangeRate, product.exchangeRateOffset,
        product.usdPriceOverride // Removed product.discount as it's not in the provided schema
    ]);


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setProduct(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleCategoryChange = (e, level) => {
        const { value } = e.target;
        setProduct(prev => {
            const newState = { ...prev };
            if (level === 'main') {
                newState.mainCategory = value;
                newState.subCategory1 = ''; 
                newState.subCategory2 = ''; 
            } else if (level === 'sub1') {
                newState.subCategory1 = value;
                newState.subCategory2 = ''; 
            } else if (level === 'sub2') {
                newState.subCategory2 = value;
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
                        showAdminNotificationModal('추가 이미지는 최대 10장까지 업로드할 수 있습니다.');
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

    const handleSave = async () => {
        const newErrors = {};
        const requiredFields = [
            'productName', 'mainCategory', 'subCategory1', 'subCategory2', 'description', 
            'stockQuantity', '유통기한', '납기일', 'priceWon', 'status'
        ];

        requiredFields.forEach(field => {
            if (!product[field] || product[field] === '') {
                newErrors[field] = '필수 입력 항목입니다.';
            }
        });

        if (product.stockQuantity < 0) {
            newErrors.stockQuantity = '재고 수량은 음수가 될 수 없습니다.';
        }

        if (product.autoExchangeRate === 'No' && (!product.exchangeRate || parseFloat(product.exchangeRate) <= 0)) {
            newErrors.exchangeRate = '수동 환율 사용 시 환율을 입력해야 합니다.';
        }
        
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (product.유통기한 && !dateRegex.test(product.유통기한)) {
            newErrors.유통기한 = '날짜 형식이 올바르지 않습니다 (YYYY-MM-DD).';
        }

        setFormErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            showAdminNotificationModal('필수 항목을 모두 입력하거나 올바르게 입력해주세요.');
            return;
        }

        setLoading(true);
        let finalProductData = { ...product };
        
        // 이미지 S3 업로드 처리 (Main Image)
        if (product.mainImage && product.mainImage.startsWith('data:')) { 
            showAdminNotificationModal('메인 이미지 업로드 중...');
            try {
                const blob = await fetch(product.mainImage).then(res => res.blob());
                const file = new File([blob], `main_image_${Date.now()}.png`, { type: blob.type });

                const s3UploadUrlResponse = await fetch(`/api/s3-upload-url?filename=${file.name}`);
                if (!s3UploadUrlResponse.ok) {
                    const errorData = await s3UploadUrlResponse.json();
                    throw new Error(errorData.message || 'Failed to get S3 upload URL for main image');
                }
                const { url, fields } = await s3UploadUrlResponse.json();

                const formData = new FormData();
                Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
                formData.append('file', file);

                const s3Response = await fetch(url, { method: 'POST', body: formData });
                if (!s3Response.ok) throw new Error('Failed to upload main image to S3');

                const s3BaseUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/`;
                finalProductData.mainImage = `${s3BaseUrl}${fields.key}`;
            } catch (imgError) {
                console.error("Main image upload error:", imgError);
                showAdminNotificationModal(`메인 이미지 업로드 실패: ${imgError.message}`);
                setLoading(false);
                return;
            }
        }

        // Sub Images S3 업로드 처리
        const uploadedSubImages = [];
        for (const img of product.subImages) {
            if (img && img.startsWith('data:')) { // Base64 이미지인 경우
                showAdminNotificationModal('추가 이미지 업로드 중...');
                try {
                    const blob = await fetch(img).then(res => res.blob());
                    const file = new File([blob], `sub_image_${Date.now()}.png`, { type: blob.type });

                    const s3UploadUrlResponse = await fetch(`/api/s3-upload-url?filename=${file.name}`);
                    if (!s3UploadUrlResponse.ok) {
                        const errorData = await s3UploadUrlResponse.json();
                        throw new Error(errorData.message || 'Failed to get S3 upload URL for sub image');
                    }
                    const { url, fields } = await s3UploadUrlResponse.json();

                    const formData = new FormData();
                    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
                    formData.append('file', file);

                    const s3Response = await fetch(url, { method: 'POST', body: formData });
                    if (!s3Response.ok) throw new Error('Failed to upload sub image to S3');

                    const s3BaseUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/`;
                    uploadedSubImages.push(`${s3BaseUrl}${fields.key}`);
                } catch (imgError) {
                    console.error("Sub image upload error:", imgError);
                    showAdminNotificationModal(`추가 이미지 업로드 실패: ${imgError.message}`);
                    setLoading(false);
                    return;
                }
            } else if (img) {
                uploadedSubImages.push(img); // 이미 S3 URL인 경우 그대로 추가
            }
        }
        finalProductData.subImages = uploadedSubImages;

        // DynamoDB 저장 (PUT 요청)
        try {
            // PUT 요청은 URL 파라미터로 productId를 사용하고, body에는 업데이트할 필드들을 보냅니다.
            const response = await fetch(`/api/products/${productId}`, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalProductData), // 모든 필드를 포함하여 전송
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update product');
            }

            console.log('Product updated successfully!');
            showAdminNotificationModal('제품이 성공적으로 수정되었습니다.');
            router.push('/admin/product-management'); // 목록 페이지로 이동
        } catch (err) {
            console.error("Error saving product:", err);
            showAdminNotificationModal(`제품 수정 중 오류 발생: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };


    if (loading) {
        return <div className={styles.container}>Loading product data...</div>;
    }

    if (error) {
        return <div className={`${styles.container} ${styles.errorText}`}>Error: {error}</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.headerTitle}>Edit Product</h1>
                <button onClick={() => router.back()} className={styles.closeButton}>
                    &times;
                </button>
            </header>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Product Information</h2>
                <div className={styles.formGrid}>
                    {/* Product Name */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="productName" className={styles.label + ' ' + styles.requiredLabel}>Product Name</label>
                        <input
                            type="text"
                            id="productName"
                            name="productName"
                            value={product.productName || ''}
                            onChange={handleChange}
                            className={styles.input}
                            maxLength={100}
                        />
                        {formErrors.productName && <p className={styles.errorMessage}>{formErrors.productName}</p>}
                    </div>

                    {/* Category (Main / Sub1 / Sub2) */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="mainCategory" className={styles.label + ' ' + styles.requiredLabel}>Category (Main / Sub1 / Sub2)</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <select
                                id="mainCategory"
                                name="mainCategory"
                                value={product.mainCategory || ''}
                                onChange={(e) => handleCategoryChange(e, 'main')}
                                className={styles.select}
                            >
                                <option value="">Select Main</option>
                                {Object.keys(CATEGORY_DATA).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <select
                                id="subCategory1"
                                name="subCategory1"
                                value={product.subCategory1 || ''}
                                onChange={(e) => handleCategoryChange(e, 'sub1')}
                                className={styles.select}
                                disabled={!product.mainCategory}
                            >
                                <option value="">Select Sub1</option>
                                {product.mainCategory && CATEGORY_DATA[product.mainCategory]?.sub1.map(sub => (
                                    <option key={sub.code} value={sub.name}>{sub.name}</option>
                                ))}
                            </select>
                            <select
                                id="subCategory2"
                                name="subCategory2"
                                value={product.subCategory2 || ''}
                                onChange={(e) => handleCategoryChange(e, 'sub2')}
                                className={styles.select}
                                disabled={!product.subCategory1}
                            >
                                <option value="">Select Sub2</option>
                                {/* Sub2도 Sub1과 동일한 구조의 MockData를 사용한다고 가정 */}
                                {product.subCategory1 && CATEGORY_DATA[product.mainCategory]?.sub1.map(sub => (
                                    <option key={sub.code} value={sub.name}>{sub.name}</option>
                                ))}
                            </select>
                        </div>
                        {formErrors.mainCategory && <p className={styles.errorMessage}>{formErrors.mainCategory}</p>}
                    </div>

                    {/* SKU */}
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>SKU</label>
                        <input
                            type="text"
                            name="sku"
                            value={product.sku || ''}
                            className={styles.input}
                            readOnly
                            disabled
                            placeholder="코드 자동 발급"
                        />
                    </div>

                    {/* Description */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="description" className={styles.label + ' ' + styles.requiredLabel}>Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={product.description || ''}
                            onChange={handleChange}
                            className={styles.textarea}
                            rows="5"
                            placeholder="Enter product description"
                        />
                        {formErrors.description && <p className={styles.errorMessage}>{formErrors.description}</p>}
                    </div>
                </div>
            </section>

            {/* Image Upload */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Image Upload</h2>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    {/* Main Image */}
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Main Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            ref={mainImageInputRef}
                            style={{ display: 'none' }}
                            onChange={(e) => handleImageUpload(e, true)}
                        />
                        <div className={styles.imageUploadBox} onClick={() => mainImageInputRef.current.click()}>
                            {product.mainImage ? (
                                <>
                                    <Image src={product.mainImage} alt="Main Preview" width={100} height={100} />
                                    <button className={styles.deleteImageButton} onClick={(e) => { e.stopPropagation(); handleDeleteImage(null, true); }}>&times;</button>
                                </>
                            ) : (
                                <span>Upload Image</span>
                            )}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Recommended image size 350x350px.</p>
                    </div>

                    {/* Sub Images */}
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Sub Images (Max 10)</label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            ref={subImageInputRef}
                            style={{ display: 'none' }}
                            onChange={(e) => handleImageUpload(e, false)}
                        />
                        <div className={styles.imageUploadGrid}>
                            {product.subImages?.map((img, index) => (
                                <div key={index} className={styles.imageUploadBox}>
                                    <Image src={img} alt={`Sub Preview ${index}`} width={100} height={100} />
                                    <button className={styles.deleteImageButton} onClick={(e) => { e.stopPropagation(); handleDeleteImage(index, false); }}>&times;</button>
                                </div>
                            ))}
                            {product.subImages?.length < 10 && (
                                <div className={styles.imageUploadBox} onClick={() => subImageInputRef.current.click()}>
                                    <span>Upload Image</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Stock & Other Input */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Stock & Other Information</h2>
                <div className={styles.formGrid}>
                    {/* Stock Quantity */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="stockQuantity" className={styles.label + ' ' + styles.requiredLabel}>Stock Quantity</label>
                        <input
                            type="number"
                            id="stockQuantity"
                            name="stockQuantity"
                            value={product.stockQuantity || ''}
                            onChange={handleChange}
                            className={styles.input}
                            min="0"
                        />
                        {formErrors.stockQuantity && <p className={styles.errorMessage}>{formErrors.stockQuantity}</p>}
                    </div>

                    {/* 유통기한 */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="유통기한" className={styles.label + ' ' + styles.requiredLabel}>유통기한 (YYYY-MM-DD)</label>
                        <input
                            type="date"
                            id="유통기한"
                            name="유통기한"
                            value={product.유통기한 || ''}
                            onChange={handleChange}
                            className={styles.input}
                        />
                        {formErrors.유통기한 && <p className={styles.errorMessage}>{formErrors.유통기한}</p>}
                    </div>

                    {/* 납기일 */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="납기일" className={styles.label + ' ' + styles.requiredLabel}>납기일 (Days)</label>
                        <input
                            type="number"
                            id="납기일"
                            name="납기일"
                            value={product.납기일 || ''}
                            onChange={handleChange}
                            className={styles.input}
                            min="0"
                        />
                        {formErrors.납기일 && <p className={styles.errorMessage}>{formErrors.납기일}</p>}
                    </div>

                    {/* Purchas */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="purchas" className={styles.label}>Purchas (Optional)</label>
                        <input
                            type="text"
                            id="purchas"
                            name="purchas"
                            value={product.purchas || ''}
                            onChange={handleChange}
                            className={styles.input}
                        />
                    </div>
                </div>
            </section>

            {/* Price & Exchange Rate */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Price & Exchange Rate</h2>
                <div className={styles.priceExchangeGrid}>
                    {/* Price(won) */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="priceWon" className={styles.label + ' ' + styles.requiredLabel}>Price(won)</label>
                        <input
                            type="number"
                            id="priceWon"
                            name="priceWon"
                            value={product.priceWon || ''}
                            onChange={handleChange}
                            className={styles.input}
                            min="0"
                        />
                        {formErrors.priceWon && <p className={styles.errorMessage}>{formErrors.priceWon}</p>}
                    </div>

                    {/* 자동 환율 사용 여부 */}
                    <div className={styles.inputGroup}>
                        <label className={styles.label + ' ' + styles.requiredLabel}>Use Automatic Exchange Rate?</label>
                        <div className={styles.radioGroup}>
                            <label>
                                <input
                                    type="radio"
                                    name="autoExchangeRate"
                                    value="Yes"
                                    checked={product.autoExchangeRate === 'Yes'}
                                    onChange={handleChange}
                                /> Yes
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="autoExchangeRate"
                                    value="No"
                                    checked={product.autoExchangeRate === 'No'}
                                    onChange={handleChange}
                                /> No
                            </label>
                        </div>
                    </div>

                    {/* Exchange Rate / Offset / USD Price Override */}
                    {product.autoExchangeRate === 'Yes' ? (
                        <div className={styles.inputGroup}>
                            <label htmlFor="exchangeRateOffset" className={styles.label + ' ' + styles.requiredLabel}>Exchange Rate Offset (Optional)</label>
                            <input
                                type="number"
                                id="exchangeRateOffset"
                                name="exchangeRateOffset"
                                value={product.exchangeRateOffset || ''}
                                onChange={handleChange}
                                className={styles.input}
                                placeholder="예: 0.05 (5%)"
                                step="0.01"
                                min="0"
                            />
                            {formErrors.exchangeRateOffset && <p className={styles.errorMessage}>{formErrors.exchangeRateOffset}</p>}
                        </div>
                    ) : (
                        <>
                            <div className={styles.inputGroup}>
                                <label htmlFor="exchangeRate" className={styles.label + ' ' + styles.requiredLabel}>Exchange Rate</label>
                                <input
                                    type="number"
                                    id="exchangeRate"
                                    name="exchangeRate"
                                    value={product.exchangeRate || ''}
                                    onChange={handleChange}
                                    className={styles.input}
                                    min="0"
                                />
                                {formErrors.exchangeRate && <p className={styles.errorMessage}>{formErrors.exchangeRate}</p>}
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="usdPriceOverride" className={styles.label}>USD Price Override (Optional)</label>
                                <input
                                    type="number"
                                    id="usdPriceOverride"
                                    name="usdPriceOverride"
                                    value={product.usdPriceOverride || ''}
                                    onChange={handleChange}
                                    className={styles.input}
                                    placeholder="직접 입력 시 자동 계산 무시"
                                    min="0"
                                />
                            </div>
                        </>
                    )}
                </div>
                {/* Calculated USD Price */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Calculated USD Price</label>
                    <input
                        type="text"
                        value={
                            typeof product.calculatedPriceUsd === 'number' && !isNaN(product.calculatedPriceUsd)
                                ? `$${product.calculatedPriceUsd.toFixed(2)}`
                                : '$0.00'
                        }
                        readOnly
                        disabled
                        className={styles.input}
                    />
                    <p className={styles.calculatedPriceDisplay}>
                        결과 노출: {
                            typeof product.calculatedPriceUsd === 'number' && !isNaN(product.calculatedPriceUsd)
                                ? `$${product.calculatedPriceUsd.toFixed(2)}`
                                : '$0.00'
                        }
                    </p>
                </div>
            </section>

            {/* Save & Exposure Setting */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Save & Exposure Setting</h2>
                <div className={styles.formGrid}>
                    {/* Status (Public / Hidden) */}
                    <div className={styles.inputGroup}>
                        <label className={styles.label + ' ' + styles.requiredLabel}>Status</label>
                        <div className={styles.radioGroup}>
                            <label>
                                <input
                                    type="radio"
                                    name="status"
                                    value="Public"
                                    checked={product.status === 'Public'}
                                    onChange={handleChange}
                                /> Public
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="status"
                                    value="Hidden"
                                    checked={product.status === 'Hidden'}
                                    onChange={handleChange}
                                /> Hidden
                            </label>
                        </div>
                    </div>
                </div>
            </section>

            {/* SAVE Button */}
            <div className={styles.footerActions}>
                <button onClick={handleSave} className={styles.saveButton} disabled={!isFormValid || loading}>
                    {loading ? 'Saving...' : 'SAVE'}
                </button>
            </div>
        </div>
    );
}