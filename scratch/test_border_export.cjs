const ExcelJS = require('exceljs');

async function testExport() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('public/templates/drivebonus_template.xlsx');
  const tSheet = wb.getWorksheet('正駕');
  
  const newWb = new ExcelJS.Workbook();
  const nSheet = newWb.addWorksheet('Test');
  
  // 1. Copy structure
  for (let r = 1; r <= tSheet.rowCount; r++) {
    const tRow = tSheet.getRow(r);
    const nRow = nSheet.getRow(r);
    nRow.height = tRow.height;
    if (tRow.border) nRow.border = JSON.parse(JSON.stringify(tRow.border));
    
    for (let c = 1; c <= tSheet.columnCount; c++) {
      const tCell = tRow.getCell(c);
      const nCell = nRow.getCell(c);
      if (tCell.style) {
        if (tCell.font) nCell.font = JSON.parse(JSON.stringify(tCell.font));
        if (tCell.fill) nCell.fill = JSON.parse(JSON.stringify(tCell.fill));
        if (tCell.alignment) nCell.alignment = JSON.parse(JSON.stringify(tCell.alignment));
        if (tCell.border) nCell.border = JSON.parse(JSON.stringify(tCell.border));
      }
      nCell.value = tCell.value;
    }
  }

  // merge
  const merges = tSheet.model.merges || [];
  merges.forEach(m => nSheet.mergeCells(m));

  // border fix (same as current logic)
  for (let r = 1; r <= tSheet.rowCount; r++) {
    const tRow = tSheet.getRow(r);
    for (let c = 1; c <= tSheet.columnCount; c++) {
      const tCell = tRow.getCell(c);
      if (tCell.border) {
        nSheet.getRow(r).getCell(c).border = JSON.parse(JSON.stringify(tCell.border));
      }
    }
  }
  
  await newWb.xlsx.writeFile('scratch/test_out.xlsx');
  console.log("Saved to scratch/test_out.xlsx");
}
testExport();
