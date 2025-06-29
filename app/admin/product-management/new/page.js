// app/admin/product-management/new/page.js
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './product-add-edit.module.css'; // 새 CSS 모듈 임포트

import { useAdminModal } from '@/contexts/AdminModalContext';

// DynamoDB 관련 import (클라이언트 컴포넌트에서 직접 접근)
// WARN: 클라이언트 컴포넌트에서 AWS 자격 증명을 직접 사용하는 것은 보안상 위험합니다.
// 프로덕션 환경에서는 반드시 Next.js API Routes를 통해 서버 사이드에서 통신하도록 리팩토링하세요.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// DynamoDB 클라이언트 초기화
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

// SKU 자동 생성 헬퍼 함수
async function generateSku(mainCat, sub1Cat, sub2Cat) {
  if (!mainCat || !sub1Cat || !sub2Cat) return '';

  const mainCode = CATEGORY_DATA[mainCat]?.code || '';
  const sub1Code = CATEGORY_DATA[mainCat]?.sub1.find(s => s.name === sub1Cat)?.code || '';
  const sub2Code = CATEGORY_DATA[mainCat]?.sub1.find(s => s.name === sub2Cat)?.code || ''; // 가정: Sub2도 동일한 Sub1 구조에서 찾음

  // 실제로는 SKU 중복 방지를 위해 DynamoDB에서 마지막 SKU 번호를 조회해야 함
  // 여기서는 간단화를 위해 랜덤 4자리 숫자를 추가합니다.
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 1000-9999

  if (mainCode && sub1Code && sub2Code) {
    return `${mainCode}${sub1Code}${sub2Code}-${randomSuffix}`;
  }
  return '';
}

export default function NewProductPage() {
  const router = useRouter();
  const { showAdminNotificationModal } = useAdminModal();

  // loading 상태 추가
  const [loading, setLoading] = useState(false); // 초기 로딩 상태는 false로 설정합니다.

  const [product, setProduct] = useState({
    productName: '',
    mainCategory: '',
    subCategory1: '', // Sub1
    subCategory2: '', // Sub2
    sku: '', // 자동 생성
    description: '',
    mainImage: null, // File object or URL
    subImages: [], // Array of File objects or URLs
    stockQuantity: '',
    유통기한: '', // Watanabe-MM-DD
    납기일: '', // Days (number)
    purchas: '',
    autoExchangeRate: 'Yes', // 'Yes' or 'No'
    priceWon: '',
    exchangeRate: '',
    exchangeRateOffset: '',
    usdPriceOverride: '',
    calculatedPriceUsd: 0, // 초기값을 숫자로 설정 (toFixed 오류 방지)
    status: 'Public', // 'Public' or 'Hidden'
  });

  const [formErrors, setFormErrors] = useState({});
  const mainImageInputRef = useRef(null);
  const subImageInputRef = useRef(null);


  // 필수 필드 유효성 검사 (SAVE 버튼 활성화/비활성화)
  const isFormValid = useMemo(() => {
    const requiredFields = [
      'productName', 'mainCategory', 'subCategory1', 'subCategory2', 'description', 
      'stockQuantity', '유통기한', '납기일', 'priceWon', 'status'
    ];
    
    // Check if all required fields are filled
    const allRequiredFilled = requiredFields.every(field => {
      // 숫자 필드는 0도 유효하게 간주
      if (typeof product[field] === 'number') return product[field] >= 0;
      return product[field] !== '' && product[field] !== null && product[field] !== undefined;
    });

    // Specific validation based on autoExchangeRate
    if (product.autoExchangeRate === 'No') {
        if (product.exchangeRate === '' || parseFloat(product.exchangeRate) <= 0) return false; // parseFloat로 변환 후 검증
    } else { // autoExchangeRate === 'Yes'
        if (product.exchangeRateOffset === '' || parseFloat(product.exchangeRateOffset) < 0) return false; // parseFloat로 변환 후 검증
    }
    
    // 유효성 검사 추가 (날짜 형식)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (product.유통기한 && !dateRegex.test(product.유통기한)) return false;


    return allRequiredFilled;
  }, [product]);

  // SKU 자동 생성 및 Calculated USD Price 계산 로직
  useEffect(() => {
    const updateSkuAndPrice = async () => {
      // SKU 생성
      if (product.mainCategory && product.subCategory1 && product.subCategory2) {
        const newSku = await generateSku(product.mainCategory, product.subCategory1, product.subCategory2);
        if (newSku !== product.sku) { // 불필요한 리렌더링 방지
          setProduct(prev => ({ ...prev, sku: newSku }));
        }
      } else {
        if (product.sku !== '') {
          setProduct(prev => ({ ...prev, sku: '' }));
        }
      }

      // Calculated USD Price 계산
      let calculatedPrice = 0;
      const priceWon = parseFloat(product.priceWon);
      const exchangeRate = parseFloat(product.exchangeRate); 
      const exchangeRateOffset = parseFloat(product.exchangeRateOffset);
      const usdPriceOverride = parseFloat(product.usdPriceOverride);
      const discount = parseFloat(product.discount);

      if (isNaN(priceWon) || priceWon <= 0) {
        calculatedPrice = 0;
      } else if (product.autoExchangeRate === 'No' && !isNaN(usdPriceOverride) && usdPriceOverride > 0) {
        calculatedPrice = usdPriceOverride; // USD Price Override가 입력되면 무시
      } else if (product.autoExchangeRate === 'Yes') {
        // 자동 환율: Price(won) / (기본 환율 * (1 + Offset)) * (1 - Discount/100)
        // 여기서는 기본 환율을 가정해야 함 (예: 1300)
        const baseExchangeRate = 1300; // 실제 API에서 가져와야 함
        if (!isNaN(baseExchangeRate) && baseExchangeRate > 0) { // 기본 환율이 유효할 때만 계산
            calculatedPrice = (priceWon / (baseExchangeRate * (1 + (isNaN(exchangeRateOffset) ? 0 : exchangeRateOffset)))) * (1 - (isNaN(discount) ? 0 : discount) / 100);
        }
      } else if (product.autoExchangeRate === 'No' && !isNaN(exchangeRate) && exchangeRate > 0) {
        // 수동 환율: Price(won) / Exchange Rate * (1 - Discount/100)
        calculatedPrice = (priceWon / exchangeRate) * (1 - (isNaN(discount) ? 0 : discount) / 100);
      }
      
      // calculatedPrice가 NaN인 경우 0으로 설정하고, 항상 숫자로 명확히 설정
      const finalCalculatedPrice = Number.isNaN(calculatedPrice) ? 0 : calculatedPrice;
      
      // 불필요한 재할당 방지 및 타입 일관성 유지
      setProduct(prev => ({ ...prev, calculatedPriceUsd: finalCalculatedPrice }));
    };

    updateSkuAndPrice();
  }, [
    product.productName, product.mainCategory, product.subCategory1, product.subCategory2, // SKU 트리거
    product.priceWon, product.autoExchangeRate, product.exchangeRate, product.exchangeRateOffset,
    product.usdPriceOverride, product.discount // 가격 계산 트리거
  ]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProduct(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // 입력 시 오류 메시지 제거
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleCategoryChange = (e, level) => {
    const { value } = e.target;
    setProduct(prev => {
      const newState = { ...prev };
      if (level === 'main') {
        newState.mainCategory = value;
        newState.subCategory1 = ''; // 메인 카테고리 변경 시 서브1 초기화
        newState.subCategory2 = ''; // 메인 카테고리 변경 시 서브2 초기화
      } else if (level === 'sub1') {
        newState.subCategory1 = value;
        newState.subCategory2 = ''; // 서브1 변경 시 서브2 초기화
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
          setProduct(prev => ({ ...prev, mainImage: reader.result })); // Base64로 저장 (임시)
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
    
    // 유효성 검사 추가 (날짜 형식)
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
    if (product.mainImage && product.mainImage.startsWith('data:')) { // Base64 이미지인 경우
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
        if (img.startsWith('data:')) { // Base64 이미지인 경우
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
        } else {
            uploadedSubImages.push(img); // 이미 S3 URL인 경우 그대로 추가
        }
    }
    finalProductData.subImages = uploadedSubImages;

    // DynamoDB 저장
    try {
      // API Route가 요구하는 필수 필드 포함 (id, name, price)
      const dataToSend = {
          id: finalProductData.sku, // SKU를 id로 사용
          name: finalProductData.productName, // productName을 name으로 사용
          price: parseFloat(finalProductData.priceWon), // priceWon을 price로 사용 (숫자로 변환)
          // 다른 모든 필드를 그대로 전송
          ...finalProductData,
      };

      // POST /api/products (새 제품 추가)
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend), // 수정된 데이터 전송
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add product');
      }

      console.log('Product added successfully!');
      showAdminNotificationModal('제품이 성공적으로 등록되었습니다.');
      router.push('/admin/product-management'); // 목록 페이지로 이동
    } catch (err) {
      console.error("Error saving product:", err);
      showAdminNotificationModal(`제품 등록 중 오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Add New Product</h1>
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
              value={product.productName}
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
                value={product.mainCategory}
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
                value={product.subCategory1}
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
                value={product.subCategory2}
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
              value={product.sku}
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
              value={product.description}
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
              {product.subImages.map((img, index) => (
                <div key={index} className={styles.imageUploadBox}>
                  <Image src={img} alt={`Sub Preview ${index}`} width={100} height={100} />
                  <button className={styles.deleteImageButton} onClick={(e) => { e.stopPropagation(); handleDeleteImage(index, false); }}>&times;</button>
                </div>
              ))}
              {product.subImages.length < 10 && (
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
              value={product.stockQuantity}
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
              value={product.유통기한}
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
              value={product.납기일}
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
              value={product.purchas}
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
              value={product.priceWon}
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
                value={product.exchangeRateOffset}
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
                  value={product.exchangeRate}
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
                  value={product.usdPriceOverride}
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
