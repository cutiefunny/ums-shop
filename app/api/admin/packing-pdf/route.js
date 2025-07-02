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

let regularFontBuffer;
let boldFontBuffer;

try {
  regularFontBuffer = fs.readFileSync(FONT_PATH_REGULAR);
  boldFontBuffer = fs.readFileSync(FONT_PATH_BOLD);
  console.log("PDFKit TTF fonts loaded successfully from public/fonts.");
} catch (fontError) {
  console.error("Error loading PDFKit TTF font files. Please ensure arial.ttf and arialbd.ttf are in public/fonts/", fontError);
  // 폰트 로드 실패 시 API가 PDF 생성을 시도하지 않도록 오류를 throw 합니다.
  return NextResponse.json({ message: 'PDF 폰트 로드에 실패하여 PDF를 생성할 수 없습니다. 폰트 파일을 확인해주세요.', error: fontError.message }, { status: 500 });
}


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

  // packingItems 변수를 미리 선언하고 초기화
  let packingItems = []; 

  try {
    // ... (DynamoDB 데이터 조회 로직은 동일)
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
      filterExpressions.push('#shipName = :shipNameFilter');
      expressionAttributeValues[':shipNameFilter'] = shipNameFilter;
      expressionAttributeNames['#shipName'] = 'shipName';
    }
    if (packingStatusFilter && packingStatusFilter !== 'All') {
      filterExpressions.push('#packingStatus = :packingStatusFilter');
      expressionAttributeValues[':packingStatusFilter'] = packingStatusFilter === 'true';
      expressionAttributeNames['#packingStatus'] = 'packingStatus';
    }

    if (filterExpressions.length > 0) {
      scanParams.FilterExpression = filterExpressions.join(' AND ');
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
      scanParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    const command = new ScanCommand(scanParams);
    const { Items } = await docClient.send(command);

    // Items가 null 또는 undefined일 경우 빈 배열로 처리하여 map 호출을 안전하게 함
    packingItems = (Items || []).map(item => ({
      order_id: item.orderId,
      shipName: item.shipName,
      product: item.productName,
      stock: item.quantity,
      packing: item.packingStatus || false,
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
        return NextResponse.json({ message: 'PDF 폰트 로드에 실패하여 PDF를 생성할 수 없습니다. (내부 오류)', error: 'Font buffers are not loaded.' }, { status: 500 });
    }

    // 로드된 TTF 폰트 버퍼를 명시적으로 사용합니다.
    doc.font(boldFontBuffer).fontSize(20).text('Packing Status Report', { align: 'center' }); 
    doc.moveDown();

    // 데이터가 없을 경우 메시지 표시
    if (packingItems.length === 0) {
        doc.font(regularFontBuffer).fontSize(12).text('No items found for this report.', { align: 'center' });
    } else {
        const headers = ['Order #', 'Ship Name', 'Product', 'Stock', 'Packing Status'];
        const columnPositions = [50, 150, 250, 400, 450]; 

        let currentY = doc.y; 

        // 헤더 출력 (Bold 폰트 사용)
        doc.font(boldFontBuffer).fontSize(10); 
        headers.forEach((header, i) => {
            doc.text(header, columnPositions[i], currentY, { width: columnPositions[i+1] ? columnPositions[i+1] - columnPositions[i] : undefined, align: 'left' });
        });
        doc.moveDown(); 

        // 데이터 출력 (Regular 폰트 사용)
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