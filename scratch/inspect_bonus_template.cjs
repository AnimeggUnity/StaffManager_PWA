const ExcelJS = require('exceljs');
const path = require('path');

async function inspectBonusTemplate() {
    const workbook = new ExcelJS.Workbook();
    try {
        const filePath = path.join(process.cwd(), 'public/templates/drivebonus_template.xlsx');
        await workbook.xlsx.readFile(filePath);
        const sheet = workbook.getWorksheet(1);

        console.log('--- Inspecting Bonus Template Keywords ---');
        sheet.eachRow(row => {
            row.eachCell(cell => {
                if (typeof cell.value === 'string' && cell.value.includes('{{')) {
                    console.log(`Cell ${cell.address}: ${cell.value}`);
                }
            });
        });

    } catch (err) {
        console.error('Inspection failed:', err);
    }
}

inspectBonusTemplate();
