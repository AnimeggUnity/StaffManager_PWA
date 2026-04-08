const ExcelJS = require('exceljs');
const path = require('path');

async function purgeUnderscores() {
    const workbook = new ExcelJS.Workbook();
    try {
        const filePath = path.join(process.cwd(), 'public/templates/drivebonus_template_v2.xlsx');
        await workbook.xlsx.readFile(filePath);
        
        console.log('--- Purging Underscores from Template ---');
        workbook.eachSheet(sheet => {
            sheet.eachRow(row => {
                row.eachCell(cell => {
                    if (typeof cell.value === 'string' && cell.value.includes('_')) {
                        const oldVal = cell.value;
                        const newVal = oldVal.replace(/_/g, '');
                        cell.value = newVal;
                        console.log(`Cell ${cell.address} in ${sheet.name}: "${oldVal}" -> "${newVal}"`);
                    }
                });
            });
        });

        await workbook.xlsx.writeFile(filePath);
        console.log('--- Purge Complete! File saved to v2. ---');

    } catch (err) {
        console.error('Purge failed:', err);
    }
}

purgeUnderscores();
