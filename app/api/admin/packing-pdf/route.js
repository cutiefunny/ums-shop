// app/api/admin/packing-pdf/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import PDFDocument from 'pdfkit'; 
import fs from 'fs'; 
import path from 'path'; 

// AWS SDK v3 설정
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  logger: console, 
});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_ORDER_ITEMS = process.env.DYNAMODB_TABLE_ORDER_ITEMS || 'ums-shop-order-items';

// 폰트 파일 경로 정의 (public/fonts 폴더에 폰트 파일을 놓았다고 가정)
const FONT_PATH_REGULAR = path.resolve(process.cwd(), 'public', 'fonts', 'arial.ttf'); 
const FONT_PATH_BOLD = path.resolve(process.cwd(), 'public', 'fonts', 'arialbd.ttf'); 

// 폰트 버퍼를 전역 스코프에서 직접 로드합니다.
// fs.readFileSync가 실패하면 이곳에서 에러를 던지고 모듈 로드가 실패하여 빌드가 중단됩니다.
const regularFontBuffer = fs.readFileSync(FONT_PATH_REGULAR); 
const boldFontBuffer = fs.readFileSync(FONT_PATH_BOLD);       
console.log("PDFKit TTF fonts loaded successfully from public/fonts."); 


/**
 * GET handler for /api/admin/packing-pdf
 * 필터링된 데이터를 바탕으로 PDF 파일을 생성하여 반환합니다.
 *
 * @param {Request} request
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('searchTerm');
  const shipNameFilter = searchParams.get('shipName');
  const packingStatusFilter = searchParams.get('packingStatus');

  let packingItems = []; // packingItems 변수를 함수 상단에 선언하여 스코프 보장

  try {
    // 1. DynamoDB에서 데이터 조회
    const filterExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    const scanParams = {
      TableName: TABLE_ORDER_ITEMS,
    };

    if (searchTerm) {
      filterExpressions.push('contains(#productName, :searchTerm) OR contains(#shipName, :searchTerm)');
      expressionAttributeValues[':searchTerm'] = searchTerm;
      expressionAttributeNames['#productName'] = 'productName';
      expressionAttributeNames['#shipName'] = 'shipName';
    }
    if (shipNameFilter && shipNameFilter !== 'All') {
      filterExpressions.push('#shipName = :shipNameVal');
      expressionAttributeValues[':shipNameVal'] = shipNameFilter;
      expressionAttributeNames['#shipName'] = 'shipName';
    }
    if (packingStatusFilter && packingStatusFilter !== 'All') {
      filterExpressions.push('#packingStatus = :packingStatusVal');
      expressionAttributeValues[':packingStatusVal'] = packingStatusFilter; 
      expressionAttributeNames['#packingStatus'] = 'packingStatus';
    }

    if (filterExpressions.length > 0) {
      scanParams.FilterExpression = filterExpressions.join(' AND ');
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
      scanParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    let response;
    try {
        response = await docClient.send(new ScanCommand(scanParams));
        console.log("DynamoDB Scan RAW Response:", response);
    } catch (sendError) {
        console.error("Error directly from docClient.send(command):", sendError);
        // docClient.send()에서 오류 발생 시, 해당 오류를 상위 catch 블록으로 다시 던집니다.
        throw sendError; 
    }

    // response.Items가 null 또는 undefined일 수 있으므로 안전하게 처리합니다.
    const fetchedItems = (response && response.Items) ? response.Items : [];

    // fetchedItems를 사용하여 packingItems를 할당합니다.
    packingItems = fetchedItems.map(item => ({
      order_id: item.orderId,
      shipName: item.shipName,
      product: item.productName,
      stock: item.quantity,
      packing: item.packingStatus || 'false', 
    })).sort((a, b) => (a.order_id < b.order_id ? -1 : 1));

    // 2. PDF 생성
    const doc = new PDFDocument({ font: '' }); 

    let buffers = [];
    
    const pdfPromise = new Promise(resolve => {
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            let pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });
    });

    if (!regularFontBuffer || !boldFontBuffer) {
        console.error("Attempted PDF generation without loaded font buffers.");
        return NextResponse.json({ message: 'PDF 폰트 로드에 실패하여 PDF를 생성할 수 없습니다. (내부 초기화 오류)', error: 'Font files not properly loaded at initialization.' }, { status: 500 });
    }

    doc.font(boldFontBuffer).fontSize(20).text('Packing Status Report', { align: 'center' }); 
    doc.moveDown();

    // packingItems가 비어 있을 경우 메시지 출력
    if (packingItems.length === 0) {
        doc.font(regularFontBuffer).fontSize(12).text('No items found for this report.', { align: 'center' });
    } else {
        const headers = ['Order #', 'Ship Name', 'Product', 'Stock', 'Packing Status'];
        const columnPositions = [50, 150, 250, 400, 450]; 

        let currentY = doc.y; 

        doc.font(boldFontBuffer).fontSize(10); 
        headers.forEach((header, i) => {
            doc.text(header, columnPositions[i], currentY, { width: columnPositions[i+1] ? columnPositions[i+1] - columnPositions[i] : undefined, align: 'left' });
        });
        doc.moveDown(); 

        doc.font(regularFontBuffer).fontSize(9); 
        packingItems.forEach(item => { // 이제 packingItems는 항상 유효한 배열입니다.
            currentY = doc.y; 
            doc.text(item.order_id, columnPositions[0], currentY);
            doc.text(item.shipName, columnPositions[1], currentY);
            doc.text(item.product, columnPositions[2], currentY);
            doc.text(item.stock.toString(), columnPositions[3], currentY);
            doc.text(item.packing ? 'Packed' : 'Unpacked', columnPositions[4], currentY);
            doc.moveDown();
        });
    }

    doc.end(); 

    const pdfBuffer = await pdfPromise; 

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="packing_status_report_${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ message: 'Failed to generate PDF', error: error.message }, { status: 500 });
  }
}