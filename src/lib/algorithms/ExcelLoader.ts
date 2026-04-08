import ExcelJS from 'exceljs';
import type { StaffData } from '../../types';

/**
 * 表單格式定義與驗證 (比照 Python schemas.py)
 */
const SCHEMAS: Record<string, { required: string[]; optional: string[] }> = {
  "早班名單": { required: ["工號", "姓名"], optional: [] },
  "晚班名單": { required: ["工號", "姓名"], optional: [] },
  "車輛名單": { required: ["車號", "姓名"], optional: ["額外資訊", "車輛規格"] },
  "司機名單": { required: ["工號", "姓名", "駕駛資格"], optional: [] }
};

/**
 * 輔助函式：根據關鍵字模糊尋找分頁
 */
function findSheetByKeywords(workbook: ExcelJS.Workbook, keywords: string[]): ExcelJS.Worksheet | undefined {
  return workbook.worksheets.find(ws => 
    keywords.some(kw => ws.name.includes(kw))
  );
}

/**
 * 獲取欄位索引對映表
 */
function getColumnMapping(sheet: ExcelJS.Worksheet): Record<string, number> {
  const mapping: Record<string, number> = {};
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const value = cell.value?.toString().trim();
    if (value) mapping[value] = colNumber;
  });
  return mapping;
}

/**
 * 驗證工作表格式 (比照 Python validate_sheet)
 */
function validateSheet(sheet: ExcelJS.Worksheet, schemaName: string, debugInfo: string[]): Record<string, number> {
  const schema = SCHEMAS[schemaName];
  if (!schema) return {};

  const mapping = getColumnMapping(sheet);
  const headers = Object.keys(mapping);

  // 1. 檢查必要欄位
  const missing = schema.required.filter(col => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`表單「${sheet.name}」缺少必要欄位: ${missing.join(', ')}`);
  }

  debugInfo.push(`✓ 表單「${sheet.name}」格式驗證通過`);
  return mapping;
}

export async function parseStaffExcel(buffer: ArrayBuffer): Promise<StaffData & { debugInfo?: string[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const debugInfo: string[] = [];
  const nameToId: Record<string, string> = {}; 
  const nameToIdCheck: Record<string, string> = {}; // 用於跨表姓名一致性檢查

  const staffData: StaffData & { debugInfo?: string[] } = {
    month: '',
    people: {},
    vehicleRecords: [],
    drivers: {},
    debugInfo: []
  };

  // 1. 解析早班與晚班名單
  const shiftSheetPairs = [
    { keywords: ['早班名單', '早班人員'], schemaName: '早班名單', shiftName: '早班' },
    { keywords: ['晚班名單', '晚班人員'], schemaName: '晚班名單', shiftName: '晚班' }
  ];

  for (const pair of shiftSheetPairs) {
    const sheet = findSheetByKeywords(workbook, pair.keywords);
    if (!sheet) continue;
    
    debugInfo.push(`🔍 正在解析「${sheet.name}」...`);
    const mapping = validateSheet(sheet, pair.schemaName, debugInfo);
    
    const idIdx = mapping["工號"];
    const nameIdx = mapping["姓名"];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return;

      const empId = row.getCell(idIdx).value?.toString().trim();
      const empName = row.getCell(nameIdx).value?.toString().trim();
      
      if (empId && empName) {
        // 跨表姓名一致性檢查 (比照 Python DataLoader.transform_to_employee_index)
        if (nameToIdCheck[empId] && nameToIdCheck[empId] !== empName) {
          throw new Error(`工號 ${empId} 的姓名不一致: 「${nameToIdCheck[empId]}」vs「${empName}」`);
        }
        nameToIdCheck[empId] = empName;
        nameToId[empName] = empId;

        if (!staffData.people[empId]) {
          staffData.people[empId] = {
            header: { 
              name: empName, 
              emp_id: empId, 
              shift: pair.shiftName, 
              month: '',
              title: '正式隊員'
            },
            records: []
          };
        }
      }
    });
  }

  // 2. 解析司機名單
  const driverSheet = findSheetByKeywords(workbook, ['司機名單', '司機資料']);
  if (driverSheet) {
    const mapping = validateSheet(driverSheet, '司機名單', debugInfo);
    const idIdx = mapping["工號"];
    const nameIdx = mapping["姓名"];
    const roleIdx = mapping["駕駛資格"];

    driverSheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return;
      
      const empId = row.getCell(idIdx).value?.toString().trim();
      const name = row.getCell(nameIdx).value?.toString().trim();
      const role = row.getCell(roleIdx).value?.toString().trim() || '正式隊員';
      
      if (empId && name) {
        staffData.drivers![empId] = { name, role, cars: [] };
      }
    });
  }

  // 3. 解析車輛名單
  const vehicleKeywords = ['車輛名單', '資收', '鏟裝', '機具'];
  const matchedSheets = workbook.worksheets.filter(ws => 
    vehicleKeywords.some(kw => ws.name.includes(kw))
  );

  matchedSheets.forEach(sheet => {
    debugInfo.push(`✓ 偵測到「${sheet.name}」分頁 (車務)`);
    const mapping = getColumnMapping(sheet); // 車務表可能格式較彈性
    
    const plateIdx = mapping["車號"] || mapping["車牌"];
    const managerIdx = mapping["姓名"] || mapping["管理人"];
    const extraIdx = mapping["額外資訊"];
    const specIdx = mapping["車輛規格"];

    if (!plateIdx || !managerIdx) {
      debugInfo.push(`⚠ 警告：「${sheet.name}」缺少必要欄位 (車號/姓名)，跳過此頁`);
      return;
    }

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return;
      
      const plate = row.getCell(plateIdx).value?.toString().trim();
      const managerName = row.getCell(managerIdx).value?.toString().trim();
      const extra = extraIdx ? row.getCell(extraIdx).value?.toString().trim() || '' : '';
      const specFromCell = specIdx ? row.getCell(specIdx).value?.toString().trim() : undefined;
      
      const spec = specFromCell || (sheet.name.includes('鏟裝') ? '鏟裝機' : '資收班用車');
      
      if (plate) {
        staffData.vehicleRecords?.push({ plate, spec, extra });

        if (managerName && nameToId[managerName]) {
          const empId = nameToId[managerName];
          if (staffData.drivers![empId]) {
            if (!staffData.drivers![empId].cars.includes(plate)) {
              staffData.drivers![empId].cars.push(plate);
            }
          }
        }
      }
    });
  });

  if (debugInfo.length === 0) debugInfo.push('✗ 未能從 Excel 中識別任何標準業務分頁');
  
  // 比照 Python 按工號排序
  const sortedPeople: StaffData['people'] = {};
  Object.keys(staffData.people)
    .sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    })
    .forEach(key => {
      sortedPeople[key] = staffData.people[key];
    });
  staffData.people = sortedPeople;

  staffData.debugInfo = debugInfo;
  return staffData;
}
