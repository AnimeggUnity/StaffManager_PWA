const ExcelJS = require('exceljs');
const path = require('path');

async function inspectTemplate() {
    const workbook = new ExcelJS.Workbook();
    try {
        const filePath = path.join(process.cwd(), 'public/templates/overtime_template.xlsx');
        await workbook.xlsx.readFile(filePath);
        const sheet = workbook.getWorksheet(1);

        const r4 = sheet.getRow(4);
        const cC4 = sheet.getCell('C4');

        console.log('--- Cell C4 (User Updated) ---');
        console.log('Value:', cC4.value);
        console.log('Border:', JSON.stringify(cC4.border, null, 2));

    } catch (err) {
        console.error('Inspection failed:', err);
    }
}

inspectTemplate();
