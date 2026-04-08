const ExcelJS = require('exceljs');
const path = require('path');

async function inspectTemplate() {
    const workbook = new ExcelJS.Workbook();
    try {
        const filePath = '/home/ubuntu/wordtoexcel/staff_manager/frontend/public/templates/overtime_template.xlsx';
        await workbook.xlsx.readFile(filePath);
        const sheet = workbook.getWorksheet(1);

        console.log('--- Inspecting Row 4 ---');
        const row4 = sheet.getRow(4);
        console.log('Row 4 height:', row4.height);
        console.log('Row 4 border:', JSON.stringify(row4.border, null, 2));

        console.log('\n--- Inspecting Column 3 (C) ---');
        const colC = sheet.getColumn(3);
        console.log('Col C width:', colC.width);
        console.log('Col C border:', JSON.stringify(colC.border, null, 2));

        console.log('\n--- Inspecting Cell C4 ---');
        const cellC4 = sheet.getCell('C4');
        console.log('Cell C4 value:', cellC4.value);
        console.log('Cell C4 type:', cellC4.type);
        console.log('Cell C4 border:', JSON.stringify(cellC4.border, null, 2));
        console.log('Cell C4 master address:', cellC4.master.address);

        console.log('\n--- Inspecting Cell D4 ---');
        const cellD4 = sheet.getCell('D4');
        console.log('Cell D4 value:', cellD4.value);
        console.log('Cell D4 border:', JSON.stringify(cellD4.border, null, 2));
        console.log('Cell D4 master address:', cellD4.master.address);

        console.log('\n--- Merges in the sheet ---');
        console.log(sheet._merges);

    } catch (err) {
        console.error('Inspection failed:', err);
    }
}

inspectTemplate();
