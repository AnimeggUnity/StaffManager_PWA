const ExcelJS = require('exceljs');
const path = require('path');

async function testFinalBorderLogic() {
  const wb = new ExcelJS.Workbook();
  const templatePath = 'public/templates/drivebonus_template.xlsx';
  await wb.xlsx.readFile(templatePath);
  const templateSheet = wb.getWorksheet('正駕');
  
  const newWb = new ExcelJS.Workbook();
  const newSheet = newWb.addWorksheet('Test_Result');
  
  // 模擬基礎複製
  templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const newRow = newSheet.getRow(rowNumber);
    newRow.height = row.height;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const newCell = newRow.getCell(colNumber);
      newCell.value = cell.value;
    });
  });

  // 1. 執行合併 (毀滅性動作)
  const merges = (templateSheet.model.merges || []);
  merges.forEach((m) => { newSheet.mergeCells(m); });

  // 2. 執行您的「雙向推斷」邏輯 (修復動作)
  const tRowCount = templateSheet.rowCount;
  const tColCount = templateSheet.columnCount;
  for (let r = 1; r <= tRowCount; r++) {
    for (let c = 1; c <= tColCount; c++) {
      const tCell = templateSheet.getRow(r).getCell(c);
      const directBorder = tCell.border || {};
      const effectiveBorder = { ...directBorder };

      // 向上推斷
      if (!effectiveBorder.top && r > 1) {
        const above = templateSheet.getRow(r - 1).getCell(c);
        if (above.border && above.border.bottom) effectiveBorder.top = above.border.bottom;
      }
      // 向下推斷
      if (!effectiveBorder.bottom && r < tRowCount) {
        const below = templateSheet.getRow(r + 1).getCell(c);
        if (below.border && below.border.top) effectiveBorder.bottom = below.border.top;
      }
      // 向左推斷
      if (!effectiveBorder.left && c > 1) {
        const leftCell = templateSheet.getRow(r).getCell(c - 1);
        if (leftCell.border && leftCell.border.right) effectiveBorder.left = leftCell.border.right;
      }
      // 向右推斷
      if (!effectiveBorder.right && c < tColCount) {
        const rightCell = templateSheet.getRow(r).getCell(c + 1);
        if (rightCell.border && rightCell.border.left) effectiveBorder.right = rightCell.border.left;
      }

      if (Object.keys(effectiveBorder).length > 0) {
        newSheet.getRow(r).getCell(c).border = effectiveBorder;
      }
    }
  }
  
  const outPath = 'scratch/final_verification.xlsx';
  await newWb.xlsx.writeFile(outPath);
  console.log('--- Verification Complete ---');
  
  // 讀取結果進行斷言
  const checkWb = new ExcelJS.Workbook();
  await checkWb.xlsx.readFile(outPath);
  const resultSheet = checkWb.getWorksheet('Test_Result');
  const c3Border = resultSheet.getCell('C3').border;
  console.log('C3 Top Border After Fix:', JSON.stringify(c3Border ? c3Border.top : null));
}

testFinalBorderLogic();
