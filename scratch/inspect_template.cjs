const ExcelJS = require('exceljs');
const path = require('path');

async function inspectTemplate() {
    const workbook = new ExcelJS.Workbook();
    try {
        const filePath = path.join(process.cwd(), 'public/templates/overtime_template.xlsx');
        await workbook.xlsx.readFile(filePath);
        const sheet = workbook.getWorksheet(1);

        console.log('--- Cell C5 (The row below C4) ---');
        const cC5 = sheet.getCell('C5');
        console.log('Value:', cC5.value);
        console.log('Border:', JSON.stringify(cC5.border, null, 2));
        console.log('Master:', cC5.master.address);

        console.log('\n--- Cell D5 ---');
        const cD5 = sheet.getCell('D5');
        console.log('Border:', JSON.stringify(cD5.border, null, 2));

    } catch (err) {
        console.error('Inspection failed:', err);
    }
}

inspectTemplate();
