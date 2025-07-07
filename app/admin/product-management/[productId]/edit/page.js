// app/admin/product-management/[productId]/edit/page.js
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'; // useCallback 추가
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
const TABLE_MAIN_CATEGORIES = process.env.NEXT_PUBLIC_DYNAMODB_TABLE_MAIN_CATEGORIES || 'category-main';
const TABLE_SUB1_CATEGORIES = process.env.NEXT_PUBLIC_DYNAMODB_TABLE_SUB1_CATEGORIES || 'category-sub1';
const TABLE_SUB2_CATEGORIES = process.env.NEXT_PUBLIC_DYNAMODB_TABLE_SUB2_CATEGORIES || 'category-sub2';


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

// SKU 자동 생성 헬퍼 함수 (이제 동적으로 가져온 카테고리 데이터 사용)
// 이 함수는 카테고리 이름과 해당 카테고리 옵션 배열을 받아 코드를 찾습니다.
async function generateSku(productName, mainCatName) {
    if (!productName || !mainCatName) return '';

    // 상품 이름에서 대문자만 추출하여 SKU 코드로 사용
    const productNameCode = productName.match(/[A-Z]/g)?.join('') || '';

    // 실제로는 SKU 중복 방지를 위해 DynamoDB에서 마지막 SKU 번호를 조회해야 함
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 1000-9999

    return `${productNameCode}-${randomSuffix}`;
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
        mainCategory: '', // Name string
        subCategory1: '', // Name string
        subCategory2: '', // Name string
        sku: '',
        description: '',
        mainImage: null,
        subImages: [], // 초기값을 빈 배열로 설정하여 iterable 보장
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
    console.log("Initial product state:", product);

    const [formErrors, setFormErrors] = useState({});
    const mainImageInputRef = useRef(null);
    const subImageInputRef = useRef(null);

    // 동적 카테고리 옵션 상태 (ID와 Name을 함께 저장)
    const [mainCategoryOptions, setMainCategoryOptions] = useState([]);
    const [subCategory1Options, setSubCategory1Options] = useState([]);
    const [subCategory2Options, setSubCategory2Options] = useState([]);

    // next/image에 허용된 호스트네임 목록 (next.config.mjs와 일치해야 함)
    const allowedImageHostnames = useMemo(() => [
        'firebasestorage.googleapis.com',
        'ums-shop-storage.s3.ap-southeast-2.amazonaws.com'
    ], []);

    // 이미지 URL의 호스트네임이 허용 목록에 있는지 확인하는 헬퍼 함수
    const isHostnameAllowed = useCallback((url) => {
        if (!url || typeof url !== 'string') return false;
        try {
            const parsedUrl = new URL(url);
            return allowedImageHostnames.includes(parsedUrl.hostname);
        } catch (e) {
            // URL 파싱 오류 (잘못된 URL 형식 등)
            return false;
        }
    }, [allowedImageHostnames]);


    // API를 통해 메인 카테고리 데이터를 가져오는 함수
    const fetchMainCategories = useCallback(async () => {
        try {
            const response = await fetch('/api/categories?level=main');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setMainCategoryOptions([{ id: 'All', name: 'All', code: '' }, ...data.map(cat => ({ id: cat.categoryId, name: cat.name, code: cat.code }))]);
            return data; // 불러온 데이터 반환
        } catch (err) {
            console.error("Error fetching main categories:", err);
            showAdminNotificationModal(`메인 카테고리 목록을 불러오는 데 실패했습니다: ${err.message}`);
            return [];
        }
    }, [showAdminNotificationModal]);

    // API를 통해 Surve Category 1 데이터를 가져오는 함수
    const fetchSubCategory1s = useCallback(async (mainCatId) => {
        if (mainCatId === 'All' || !mainCatId) {
            setSubCategory1Options([{ id: 'All', name: 'All', code: '' }]);
            return [];
        }
        try {
            const response = await fetch(`/api/categories?level=surve1&parentId=${mainCatId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("Sub categories 1 fetched:", data);
            setSubCategory1Options([{ id: 'All', name: 'All', code: '' }, ...data.map(cat => ({ id: cat.categoryId, name: cat.name, code: cat.code }))]);
            return data; // 불러온 데이터 반환
        } catch (err) {
            console.error("Error fetching sub category 1s:", err);
            showAdminNotificationModal(`Surve Category 1 목록을 불러오는 데 실패했습니다: ${err.message}`);
            return [];
        }
    }, [showAdminNotificationModal]);

    // API를 통해 Surve Category 2 데이터를 가져오는 함수
    const fetchSubCategory2s = useCallback(async (sub1CatId) => {
        if (sub1CatId === 'All' || !sub1CatId) {
            setSubCategory2Options([{ id: 'All', name: 'All', code: '' }]);
            return [];
        }
        try {
            const response = await fetch(`/api/categories?level=surve2&parentId=${sub1CatId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setSubCategory2Options([{ id: 'All', name: 'All', code: '' }, ...data.map(cat => ({ id: cat.categoryId, name: cat.name, code: cat.code }))]);
            return data; // 불러온 데이터 반환
        } catch (err) {
            console.error("Error fetching sub category 2s:", err);
            showAdminNotificationModal(`Surve Category 2 목록을 불러오는 데 실패했습니다: ${err.message}`);
            return [];
        }
    }, [showAdminNotificationModal]);


    // 제품 데이터 불러오기 및 카테고리 필터 초기화
    useEffect(() => {
        async function fetchProductAndInitCategories() {
            if (!productId) {
                setLoading(false);
                setError('제품 ID가 누락되었습니다.');
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const productResponse = await fetch(`/api/products/${productId}`);
                if (!productResponse.ok) {
                    const errorData = await productResponse.json();
                    throw new Error(errorData.message || 'Failed to fetch product data');
                }
                const productData = await productResponse.json();
                setProduct(productData); // 불러온 데이터로 폼 채우기, SKU 포함

                // 카테고리 옵션들을 순차적으로 불러오고 필터 상태 초기화
                const mainCats = await fetchMainCategories();
                const selectedMainCat = mainCats.find(cat => cat.name === productData.mainCategory);
                const mainCatId = selectedMainCat ? selectedMainCat.categoryId : 'All';
                console.log("Fetched Main Categories:", mainCats, "Selected Main Category:", selectedMainCat);

                if (mainCatId !== 'All') {
                    const sub1Cats = await fetchSubCategory1s(mainCatId);
                    console.log("Fetched Sub Category 1s:", sub1Cats);
                    const selectedSub1Cat = sub1Cats.find(cat => cat.name === productData.subCategory1);
                    const sub1CatId = selectedSub1Cat ? selectedSub1Cat.categoryId : 'All';

                    if (sub1CatId !== 'All') {
                        await fetchSubCategory2s(sub1CatId);
                    }
                }
            } catch (err) {
                console.error("Error fetching product or categories:", err);
                setError(`데이터를 불러오는 데 실패했습니다: ${err.message}`);
            } finally {
                setLoading(false);
            }
        }
        fetchProductAndInitCategories();
    }, [productId, fetchMainCategories, fetchSubCategory1s, fetchSubCategory2s]);

    // SKU 자동 생성 로직 (Edit 페이지용 - 기존 SKU가 없을 때만 생성)
    useEffect(() => {
        const updateSkuIfEmpty = async () => {
            // SKU가 이미 존재하면 (즉, 불러온 제품 데이터에 SKU가 있으면) 새로 생성하지 않습니다.
            // product.sku가 초기값인 ''이거나 null/undefined인 경우에만 생성 로직을 수행합니다.
            if (product.sku) {
                return;
            }

            const mainCatName = product.mainCategory;

            if (mainCatName) {

                const newSku = await generateSku(
                    product.productName,
                    mainCatName
                );
                // 새롭게 생성된 SKU가 유효하고, 현재 SKU와 다를 경우에만 업데이트
                if (newSku && newSku !== product.sku) {
                    setProduct(prev => ({ ...prev, sku: newSku }));
                }
            } else {
                // 카테고리가 모두 선택되지 않았고 SKU가 비어 있지 않으면, 빈 값으로 설정 (클리어)
                // 이 부분은 초기 로드 시 SKU가 비어있지 않은 경우를 방지하며, 카테고리 선택이 불완전할 때 SKU 필드를 비웁니다.
                if (product.sku !== '') {
                    setProduct(prev => ({ ...prev, sku: '' }));
                }
            }
        };
        updateSkuIfEmpty();
    }, [
        product.sku, // 이 useEffect가 product.sku가 비어있는지 확인할 수 있도록 의존성에 포함.
        product.mainCategory,
        mainCategoryOptions
    ]);


    // Calculated USD Price 계산 로직 (기존 코드와 동일)
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
    }, [
        product.priceWon, product.autoExchangeRate, product.exchangeRate, product.exchangeRateOffset,
        product.usdPriceOverride
    ]);


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


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setProduct(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleCategoryChange = async (e, level) => { // async 추가
        const { value: selectedId } = e.target; // 선택된 옵션의 ID
        let selectedName = '';

        setProduct(prev => {
            const newState = { ...prev };
            if (level === 'main') {
                selectedName = mainCategoryOptions.find(cat => cat.id === selectedId)?.name || '';
                newState.mainCategory = selectedName;
                newState.subCategory1 = '';
                newState.subCategory2 = '';
                // 메인 카테고리 변경 시 하위 옵션 초기화 및 새로 불러오기
                setSubCategory1Options([{ id: 'All', name: 'All', code: '' }]);
                setSubCategory2Options([{ id: 'All', name: 'All', code: '' }]);
                if (selectedId !== 'All') {
                    fetchSubCategory1s(selectedId);
                }
            } else if (level === 'sub1') {
                selectedName = subCategory1Options.find(cat => cat.id === selectedId)?.name || '';
                newState.subCategory1 = selectedName;
                newState.subCategory2 = '';
                // 서브1 카테고리 변경 시 하위 옵션 초기화 및 새로 불러오기
                setSubCategory2Options([{ id: 'All', name: 'All', code: '' }]);
                if (selectedId !== 'All') {
                    fetchSubCategory2s(selectedId);
                }
            } else if (level === 'sub2') {
                selectedName = subCategory2Options.find(cat => cat.id === selectedId)?.name || '';
                newState.subCategory2 = selectedName;
            }
            // SKU 자동 생성 로직은 EditProductPage에서는 적용되지 않도록 직접 호출하지 않습니다.
            return newState;
        });
        setFormErrors(prev => ({ ...prev.mainCategory, [`${level}Category`]: undefined }));
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
        for (const img of (product.subImages || [])) { // product.subImages가 null일 경우를 대비하여 || [] 추가
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
                                value={mainCategoryOptions.find(cat => cat.name === product.mainCategory)?.id || 'All'} // ID로 값 설정
                                onChange={(e) => handleCategoryChange(e, 'main')}
                                className={styles.select}
                            >
                                {mainCategoryOptions.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <select
                                id="subCategory1"
                                name="subCategory1"
                                value={subCategory1Options.find(cat => cat.name === product.subCategory1)?.id || 'All'} // ID로 값 설정
                                onChange={(e) => handleCategoryChange(e, 'sub1')}
                                className={styles.select}
                                disabled={mainCategoryOptions.find(cat => cat.name === product.mainCategory)?.id === 'All'} // 'All' 선택 시 비활성화
                            >
                                {subCategory1Options.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <select
                                id="subCategory2"
                                name="subCategory2"
                                value={subCategory2Options.find(cat => cat.name === product.subCategory2)?.id || 'All'} // ID로 값 설정
                                onChange={(e) => handleCategoryChange(e, 'sub2')}
                                className={styles.select}
                                disabled={subCategory1Options.find(cat => cat.name === product.subCategory1)?.id === 'All'} // 'All' 선택 시 비활성화
                            >
                                {subCategory2Options.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                                isHostnameAllowed(product.mainImage) ? (
                                    <Image src={product.mainImage} alt="Main Preview" width={100} height={100} />
                                ) : (
                                    // Fallback to a regular img tag if hostname is not configured for next/image
                                    <img
                                        src={product.mainImage}
                                        alt="Main Preview"
                                        width={100}
                                        height={100}
                                        style={{ objectFit: 'cover' }}
                                        onError={(e) => { e.target.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; }} // Transparent pixel
                                    />
                                )
                            ) : (
                                <span>Upload Image</span>
                            )}
                            {product.mainImage && (
                                <button className={styles.deleteImageButton} onClick={(e) => { e.stopPropagation(); handleDeleteImage(null, true); }}>&times;</button>
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
                                    {isHostnameAllowed(img) ? (
                                        <Image src={img} alt={`Sub Preview ${index}`} width={100} height={100} />
                                    ) : (
                                        <img
                                            src={img}
                                            alt={`Sub Preview ${index}`}
                                            width={100}
                                            height={100}
                                            style={{ objectFit: 'cover' }}
                                            onError={(e) => { e.target.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; }} // Transparent pixel
                                        />
                                    )}
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