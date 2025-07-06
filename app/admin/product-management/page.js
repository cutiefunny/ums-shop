// app/admin/product-management/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from '../common.module.css';

// 엑셀 다운로드 라이브러리 임포트
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// PDF 다운로드 라이브러리 임포트
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts'; // pdfmake 기본 폰트
// Fix: pdfFonts가 vfs 객체 자체일 수 있으므로 직접 할당
pdfMake.vfs = pdfFonts;


// AdminModalContext 훅 사용
import { useAdminModal } from '@/contexts/AdminModalContext';

// DynamoDB 관련 import (클라이언트 컴포넌트에서 직접 접근)
// WARN: 클라이언트 컴포넌트에서 AWS 자격 증명을 직접 사용하는 것은 보안상 위험합니다.
// 프로덕션 환경에서는 반드시 Next.js API Routes를 통해 서버 사이드에서 통신하도록 리팩토링하세요.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// 새로운 모달 컴포넌트 임포트
import BulkEditOptionModal from './components/BulkEditOptionModal';
import BulkDateEditModal from './components/BulkDateEditModal';
import BulkNumberEditModal from './components/BulkNumberEditModal';


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


const ITEMS_PER_PAGE = 5;
const MAIN_CATEGORIES = ['All', 'Category A', 'Category B', 'Category C']; // 실제 데이터에 맞게 조정
const SUB1_CATEGORIES = ['All', 'Sub1 A1', 'Sub1 B1', 'Sub1 C1']; // 실제 데이터에 맞게 조정
const SUB2_CATEGORIES = ['All', 'Sub2 A2', 'Sub2 B2', 'Sub2 C2']; // 실제 데이터에 맞게 조정
const PRODUCT_STATUS_OPTIONS = ['Active', 'Inactive'];

// 이미지 URL을 Base64로 변환하는 헬퍼 함수 (PDF 임베딩용)
async function imageUrlToBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image for PDF: ${url}, status: ${response.status}`);
      // 이미지 로드 실패 시 대체 이미지 또는 투명 Base64를 반환할 수 있음
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


export default function ProductManagementPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [mainCategoryFilter, setMainCategoryFilter] = useState('All');
  const [subCategory1Filter, setSubCategory1Filter] = useState('All');
  const [subCategory2Filter, setSubCategory2Filter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // 동적 카테고리 옵션 상태
  const [mainCategoryOptions, setMainCategoryOptions] = useState([]);
  const [subCategory1Options, setSubCategory1Options] = useState([]);
  const [subCategory2Options, setSubCategory2Options] = useState([]);

  // 일괄 수정 관련 상태
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [showBulkEditOptionModal, setShowBulkEditOptionModal] = useState(false);
  const [showBulkEditDateModal, setShowBulkEditDateModal] = useState(false);
  const [showBulkEditNumberModal, setShowBulkEditNumberModal] = useState(false);
  const [bulkEditField, setBulkEditField] = useState(null); // '유통기한' 또는 '납기일'

  const router = useRouter();
  const { showAdminNotificationModal, showAdminConfirmationModal } = useAdminModal();


  // API를 통해 제품 데이터를 가져오는 함수
  async function fetchProducts() {
    try {
      setLoading(true);
      setError(null);
      // Next.js API Route를 호출 (GET /api/products)
      const response = await fetch('/api/products'); 
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(`제품 목록을 불러오는 데 실패했습니다: ${err.message}`);
      showAdminNotificationModal(`제품 목록을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    fetchMainCategories(); // 메인 카테고리 데이터도 함께 가져옴
  }, []);

  // API를 통해 메인 카테고리 데이터를 가져오는 함수
  const fetchMainCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories?level=main');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // 'All' 옵션과 함께 { id, name } 형태로 저장
      setMainCategoryOptions([{ id: 'All', name: 'All' }, ...data.map(cat => ({ id: cat.categoryId, name: cat.name }))]);
    } catch (err) {
      console.error("Error fetching main categories:", err);
      showAdminNotificationModal(`메인 카테고리 목록을 불러오는 데 실패했습니다: ${err.message}`);
    }
  }, [showAdminNotificationModal]);

  // API를 통해 Surve Category 1 데이터를 가져오는 함수
  const fetchSubCategory1s = useCallback(async (mainCatId) => {
    if (mainCatId === 'All' || !mainCatId) {
      setSubCategory1Options([{ id: 'All', name: 'All' }]);
      return;
    }
    try {
      const response = await fetch(`/api/categories?level=surve1&parentId=${mainCatId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Sub categories 1 fetched:", data);
      setSubCategory1Options([{ id: 'All', name: 'All' }, ...data.map(cat => ({ id: cat.categoryId, name: cat.name }))]);
    } catch (err) {
      console.error("Error fetching sub category 1s:", err);
      showAdminNotificationModal(`Surve Category 1 목록을 불러오는 데 실패했습니다: ${err.message}`);
    }
  }, [showAdminNotificationModal]);

  // API를 통해 Surve Category 2 데이터를 가져오는 함수
  const fetchSubCategory2s = useCallback(async (sub1CatId) => {
    if (sub1CatId === 'All' || !sub1CatId) {
      setSubCategory2Options([{ id: 'All', name: 'All' }]);
      return;
    }
    try {
      const response = await fetch(`/api/categories?level=surve2&parentId=${sub1CatId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSubCategory2Options([{ id: 'All', name: 'All' }, ...data.map(cat => ({ id: cat.categoryId, name: cat.name }))]);
    } catch (err) {
      console.error("Error fetching sub category 2s:", err);
      showAdminNotificationModal(`Surve Category 2 목록을 불러오는 데 실패했습니다: ${err.message}`);
    }
  }, [showAdminNotificationModal]);
  

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product => {
      // 납기일 필터링 시 안전하게 문자열로 변환하여 toLowerCase 호출
      const 납기일_string = String(product.납기일 ?? '').toLowerCase();
      const matchesSearch =
        product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.mainCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.유통기한?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        납기일_string.includes(searchTerm.toLowerCase()); // 수정된 부분

      const matchesMainCategory =
        mainCategoryFilter === 'All' || product.mainCategory === mainCategoryFilter;
      const matchesSubCategory1 =
        subCategory1Filter === 'All' || product.subCategory1 === subCategory1Filter;
      const matchesSubCategory2 =
        subCategory2Filter === 'All' || product.subCategory2 === subCategory2Filter;

      return matchesSearch && matchesMainCategory && matchesSubCategory1 && matchesSubCategory2;
    });
  }, [products, searchTerm, mainCategoryFilter, subCategory1Filter, subCategory2Filter]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const currentProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage]);


  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleMainCategoryFilterChange = (e) => {
    setMainCategoryFilter(e.target.value);
    setCurrentPage(1);
    fetchSubCategory1s(e.target.value); // 메인 카테고리 변경 시 서브 카테고리 1 업데이트
  };

  const handleSubCategory1FilterChange = (e) => {
    setSubCategory1Filter(e.target.value);
    setCurrentPage(1);
    fetchSubCategory2s(e.target.value); // 서브 카테고리 1 변경 시 서브 카테고리 2 업데이트
  };

  const handleSubCategory2FilterChange = (e) => {
    setSubCategory2Filter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleStatusToggle = async (productId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    console.log(`Product ${productId} status changed to: ${newStatus}`);

    try {
      // Next.js API Route를 호출 (PUT /api/products/[productId])
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update status for product ${productId}`);
      }

      // 로컬 상태 업데이트 (fetchProducts() 대신 최적화)
      setProducts(prevProducts =>
        prevProducts.map(product =>
          product.productId === productId ? { ...product, status: newStatus } : product
        )
      );
      showAdminNotificationModal(`제품 ${productId}의 상태가 ${newStatus}로 변경되었습니다.`);
    } catch (err) {
      console.error("Error updating product status:", err);
      showAdminNotificationModal(`제품 상태 변경 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  const handleEditClick = (productId) => {
    router.push(`/admin/product-management/${productId}/edit`); // 상세 편집 페이지로 이동
  };

  const handleDeleteClick = async (productId) => {
    showAdminConfirmationModal(
      `정말로 제품 ${productId}를 삭제하시겠습니까?`,
      async () => { // onConfirm 콜백
        setLoading(true);
        setError(null);
        try {
          // Next.js API Route를 호출 (DELETE /api/products/[productId])
          const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to delete product ${productId}`);
          }

          setProducts(prevProducts => prevProducts.filter(p => p.productId !== productId));
          showAdminNotificationModal(`제품 ${productId}이(가) 삭제되었습니다.`);
        } catch (err) {
          console.error("Error deleting product:", err);
          showAdminNotificationModal(`제품 삭제 중 오류가 발생했습니다: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      () => { // onCancel 콜백
        console.log('제품 삭제 취소됨');
      }
    );
  };

  const handleUpload = () => {
    showAdminNotificationModal('Upload 기능은 미구현입니다.');
    // 파일 업로드 로직 (S3 Presigned URL + BatchWriteItem 등)
  };

  const handleExcelDownload = async () => {
    if (!filteredProducts || filteredProducts.length === 0) {
      showAdminNotificationModal('다운로드할 제품이 없습니다.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Product List');

    // 헤더 정의
    const headers = [
      'Product Name', 'SKU', 'Main-Category', '유통기한', '납기일',
      'Price(won)', 'Exchange Rate', 'Exchange Rate Offset', 'USD Price Override',
      'Discount', 'Calculated', 'Status'
    ];
    worksheet.addRow(headers);

    // 데이터 추가
    filteredProducts.forEach(product => {
      worksheet.addRow([
        product.productName,
        product.sku,
        product.mainCategory,
        product.유통기한,
        product.납기일,
        product.priceWon, // 숫자로 직접 추가
        product.exchangeRate, // 숫자로 직접 추가
        product.exchangeRateOffset, // 숫자로 직접 추가
        product.usdPriceOverride, // 숫자로 직접 추가
        product.discount, // 숫자로 직접 추가
        product.calculatedPriceUsd, // 숫자로 직접 추가
        product.status
      ]);
    });

    // 컬럼 너비 자동 조정 (선택 사항)
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength;
    });

    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(data, `Product_List_${new Date().toISOString().slice(0,10)}.xlsx`);
      showAdminNotificationModal('엑셀 파일 다운로드를 시작합니다.');
    } catch (excelError) {
      console.error("Error generating Excel file:", excelError);
      showAdminNotificationModal('엑셀 파일 생성 중 오류가 발생했습니다: ' + excelError.message);
    }
  };

  const handlePdfDownload = async () => {
    const productsToPdf = filteredProducts.filter(p => 
      mainCategoryFilter === 'All' ? true : p.mainCategory === mainCategoryFilter
    );

    if (productsToPdf.length === 0) {
      showAdminNotificationModal('PDF로 출력할 제품이 없습니다. 카테고리 필터를 확인하세요.');
      return;
    }

    showAdminNotificationModal('PDF 생성 중입니다. 잠시 기다려주세요...');

    // 이미지 Base64 변환 (병렬 처리)
    const imagePromises = productsToPdf.map(async (product) => {
      // product.image가 데이터에 있다고 가정하거나, 없을 경우 기본 이미지 사용
      // MockData에 imageUrl 필드가 없으므로 productId를 기반으로 임시 이미지 URL 생성
      const imageUrl = `/images/${product.sku}.png`; // 예를 들어 SKU를 이미지 파일명으로 사용
      const base64 = await imageUrlToBase64(imageUrl);
      return { ...product, base64Image: base64 };
    });

    const productsWithBase64Images = await Promise.all(imagePromises);

    // PDF 문서 정의
    const docDefinition = {
      content: [
        // 상단에 카테고리 경로 + 코드명 표시
        { 
          text: `Category: ${mainCategoryFilter} / ${subCategoryFilter === 'All' ? 'All Sub-Categories' : subCategoryFilter}`, 
          style: 'categoryHeader', // 새로운 스타일 적용
          margin: [0, 0, 0, 10], // 이미지처럼 상단 여백 줄임
          alignment: 'left' // 좌측 정렬
        },
        {
          // PDF 테이블 (그리드 레이아웃)
          table: {
            headerRows: 0,
            widths: Array(5).fill('auto'), // 5개 열을 자동으로 분배 (pdfmake가 내용에 따라 너비 조정 시도)
            body: productsWithBase64Images.reduce((acc, product, index) => {
              const rowIndex = Math.floor(index / 5);
              if (!acc[rowIndex]) {
                acc[rowIndex] = [];
              }
              // 각 제품 셀의 내용 (stack 사용)
              const productCell = {
                stack: [
                  { // 썸네일 이미지
                    image: product.base64Image || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // 기본 1x1 투명 이미지
                    width: 80, 
                    height: 80, 
                    alignment: 'center',
                    margin: [0, 0, 0, 5]
                  },
                  { // 상품명
                    text: product.productName, 
                    style: 'productName'
                  },
                  { // 가격
                    text: `$${product.calculatedPriceUsd?.toFixed(2) || 'N/A'}`, 
                    style: 'productPrice'
                  },
                  { // 상품코드 (SKU)
                    text: product.sku, 
                    style: 'productSku'
                  }
                ],
                alignment: 'center', // 셀 전체 내용을 가운데 정렬
                margin: [5, 5, 5, 5], // 각 제품 블록 간 여백
                border: [true, true, true, true], // 각 제품 블록에 경계선
                borderColor: '#ddd'
              };
              acc[rowIndex].push(productCell);
              return acc;
            }, []).map(row => { // 마지막 행이 5열이 아닐 경우 빈 셀로 채우기
              while (row.length < 5) {
                row.push({}); // 빈 셀 추가
              }
              return row;
            })
          },
          // 모든 셀에 경계선 적용을 위한 커스텀 레이아웃 (이미지처럼 그리드)
          layout: { 
            hLineWidth: function (i, node) { return 1; }, // 모든 가로선
            vLineWidth: function (i, node) { return 1; }, // 모든 세로선
            hLineColor: function (i, node) { return '#ddd'; }, // 선 색상
            vLineColor: function (i, node) { return '#ddd'; },
            paddingLeft: function (i, node) { return 5; },
            paddingRight: function (i, node) { return 5; },
            paddingTop: function (i, node) { return 5; },
            paddingBottom: function (i, node) { return 5; },
          }
        }
      ],
      styles: {
        categoryHeader: { // 새로운 헤더 스타일
          fontSize: 14,
          bold: true,
          alignment: 'left',
          margin: [0, 0, 0, 10]
        },
        productName: {
            fontSize: 10,
            bold: true,
            alignment: 'center'
        },
        productPrice: {
            fontSize: 9,
            alignment: 'center'
        },
        productSku: {
            fontSize: 8,
            color: '#666',
            alignment: 'center'
        }
      },
      // 페이지 번호 설정 (이미지 하단 중앙)
      footer: function(currentPage, pageCount) {
        return { text: currentPage.toString() + ' / ' + pageCount, alignment: 'center', margin: [0, 10, 0, 0], fontSize: 9 };
      },
      pageMargins: [ 40, 40, 40, 40 ] // 페이지 여백
    };

    try {
      pdfMake.createPdf(docDefinition).download(`Product_Catalog_${mainCategoryFilter}.pdf`);
      showAdminNotificationModal('PDF 파일 다운로드를 시작합니다.');
    } catch (pdfError) {
      console.error("Error generating PDF file:", pdfError);
      showAdminNotificationModal('PDF 파일 생성 중 오류가 발생했습니다: ' + pdfError.message);
    }
  };

  const handleAddProduct = () => {
    router.push('/admin/product-management/new'); // 새 제품 추가 페이지로 이동
  };

  const handleBulkEdit = () => {
    // 일괄 수정 기능 시작: 선택된 제품이 있는지 확인 후 옵션 모달 열기
    if (selectedProductIds.length === 0) {
      showAdminNotificationModal('수정할 제품을 하나 이상 선택해주세요.');
      return;
    }
    setShowBulkEditOptionModal(true);
  };

  // 일괄 수정 옵션 선택 핸들러
  const handleSelectBulkEditOption = (option) => {
    setBulkEditField(option);
    setShowBulkEditOptionModal(false); // 옵션 모달 닫기
    if (option === '유통기한') {
      setShowBulkEditDateModal(true); // 날짜 입력 모달 열기
    } else if (option === '납기일') {
      setShowBulkEditNumberModal(true); // 숫자 입력 모달 열기
    }
  };

  // 날짜 일괄 수정 저장 핸들러
  const handleSaveBulkEditDate = async (newDateValue) => {
    showAdminNotificationModal(`유통기한 일괄 수정 중...`);
    setLoading(true);
    setError(null);
    const updates = selectedProductIds.map(productId => ({
      productId,
      유통기한: newDateValue
    }));

    try {
      // 각 선택된 제품에 대해 API 호출
      // 실제로는 단일 BatchWriteItem API를 사용하는 것이 효율적이지만,
      // 여기서는 기존 API 구조를 활용하여 개별 PUT 요청을 보냅니다.
      const updatePromises = updates.map(update =>
        fetch(`/api/products/${update.productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 유통기한: update.유통기한 }),
        })
      );
      const responses = await Promise.allSettled(updatePromises);

      let successCount = 0;
      let failCount = 0;
      responses.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.ok) {
          successCount++;
        } else {
          failCount++;
          console.error(`Failed to update product ${updates[index].productId}:`, result.reason || result.value);
        }
      });

      if (failCount === 0) {
        showAdminNotificationModal(`선택된 ${successCount}개 제품의 유통기한이 성공적으로 변경되었습니다.`);
      } else {
        showAdminNotificationModal(`유통기한 변경 실패: ${failCount}개 제품 업데이트 실패. 자세한 내용은 콘솔을 확인하세요.`);
      }
      fetchProducts(); // 데이터 새로고침
      setSelectedProductIds([]); // 선택 초기화
    } catch (err) {
      console.error("Bulk edit date error:", err);
      showAdminNotificationModal(`유통기한 일괄 수정 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setLoading(false);
      setShowBulkEditDateModal(false);
    }
  };

  // 숫자 일괄 수정 저장 핸들러 (납기일)
  const handleSaveBulkEditNumber = async (newNumberValue) => {
    showAdminNotificationModal(`납기일 일괄 수정 중...`);
    setLoading(true);
    setError(null);
    const updates = selectedProductIds.map(productId => ({
      productId,
      납기일: newNumberValue.toString() // 숫자를 문자열로 저장 (DynamoDB 스키마에 따라 다름)
    }));

    try {
      const updatePromises = updates.map(update =>
        fetch(`/api/products/${update.productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 납기일: update.납기일 }),
        })
      );
      const responses = await Promise.allSettled(updatePromises);

      let successCount = 0;
      let failCount = 0;
      responses.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.ok) {
          successCount++;
        } else {
          failCount++;
          console.error(`Failed to update product ${updates[index].productId}:`, result.reason || result.value);
        }
      });

      if (failCount === 0) {
        showAdminNotificationModal(`선택된 ${successCount}개 제품의 납기일이 성공적으로 변경되었습니다.`);
      } else {
        showAdminNotificationModal(`납기일 변경 실패: ${failCount}개 제품 업데이트 실패. 자세한 내용은 콘솔을 확인하세요.`);
      }
      fetchProducts(); // 데이터 새로고침
      setSelectedProductIds([]); // 선택 초기화
    } catch (err) {
      console.error("Bulk edit number error:", err);
      showAdminNotificationModal(`납기일 일괄 수정 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setLoading(false);
      setShowBulkEditNumberModal(false);
    }
  };


  if (loading) {
    return <div className={styles.container}>Loading products...</div>;
  }

  if (error) {
    return <div className={`${styles.container} ${styles.errorText}`}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.searchGroup}>
          <input
            type="text"
            placeholder="Search Products (SKU, main category, 유통기한, 납기일)"
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          <button className={styles.searchButton}>Search</button>
        </div>
        
        <div className={styles.headerRight}>
          <button onClick={handleUpload} className={styles.uploadButton}>Upload</button>
          <button onClick={handleExcelDownload} className={styles.excelButton}>EXCELL</button>
          <button onClick={handlePdfDownload} className={styles.pdfButton}>PDF</button>
          <button onClick={handleBulkEdit} className={styles.editButton}>수정하기</button>
          <button onClick={handleAddProduct} className={styles.addButton}>+ Add</button>
        </div>
      </header>

      <div className={styles.controlsOnlyFilter}>
        <div className={styles.filterGroup}>
          <select value={mainCategoryFilter} onChange={handleMainCategoryFilterChange} className={styles.filterSelect}>
            {mainCategoryOptions.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <select value={subCategory1Filter} onChange={handleSubCategory1FilterChange} className={styles.filterSelect}>
            {subCategory1Options.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <select value={subCategory2Filter} onChange={handleSubCategory2FilterChange} className={styles.filterSelect}>
            {subCategory2Options.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>
              <input 
                type="checkbox" 
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedProductIds(filteredProducts.map(p => p.productId));
                  } else {
                    setSelectedProductIds([]);
                  }
                }}
                checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
              />
            </th>
            <th>Product Name</th>
            <th>SKU</th>
            <th>Main-Category</th>
            <th>유통기한</th>
            <th>납기일</th>
            <th>Price(won)</th>
            <th>Exchange Rate</th>
            <th>Exchange Rate Offset</th>
            <th>USD Price Override</th>
            <th>Discount</th>
            <th>Calculated</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentProducts.length > 0 ? (
            currentProducts.map(product => (
              <tr key={product.productId}>
                <td>
                  <input 
                    type="checkbox" 
                    checked={selectedProductIds.includes(product.productId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProductIds(prev => [...prev, product.productId]);
                      } else {
                        setSelectedProductIds(prev => prev.filter(id => id !== product.productId));
                      }
                    }}
                  />
                </td>
                <td>{product.productName}</td>
                <td>{product.sku}</td>
                <td>{product.mainCategory}</td>
                <td>{product.유통기한}</td>
                <td>{product.납기일}</td>
                <td>{product.priceWon?.toLocaleString()}</td>
                <td>{product.exchangeRate}</td>
                <td>{product.exchangeRateOffset}</td>
                <td>{product.usdPriceOverride}</td>
                <td>{product.discount}%</td>
                <td>${product.calculatedPriceUsd?.toFixed(2)}</td>
                <td>
                  <button onClick={() => handleStatusToggle(product.productId, product.status)} className={styles.statusToggle}>
                    {product.status === 'Active' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a1.8 1.8 0 0 1 0-2.66m3.18-3.18A8.82 8.82 0 0 1 12 5c7 0 10 7 10 7a1.8 1.8 0 0 1 0 2.66"/><path d="M10 10l4 4"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <button onClick={() => handleEditClick(product.productId)} className={styles.actionButton}>
                      <img src="/images/write.png" alt="Edit" />
                    </button>
                    <button onClick={() => handleDeleteClick(product.productId)} className={styles.actionButton}>
                      <img src="/images/delete.png" alt="Delete" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="14" style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={styles.pagination}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`${styles.paginationButton} ${currentPage === page ? styles.active : ''}`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* 일괄 수정 옵션 모달 */}
      <BulkEditOptionModal
        isOpen={showBulkEditOptionModal}
        onClose={() => setShowBulkEditOptionModal(false)}
        onSelectOption={handleSelectBulkEditOption}
      />

      {/* 유통기한 수정 모달 */}
      <BulkDateEditModal
        isOpen={showBulkEditDateModal}
        onClose={() => setShowBulkEditDateModal(false)}
        onSave={handleSaveBulkEditDate}
        title="유통기한 수정"
      />

      {/* 납기일 수정 모달 */}
      <BulkNumberEditModal
        isOpen={showBulkEditNumberModal}
        onClose={() => setShowBulkEditNumberModal(false)}
        onSave={handleSaveBulkEditNumber}
        title="납기일 수정"
      />
    </div>
  );
}