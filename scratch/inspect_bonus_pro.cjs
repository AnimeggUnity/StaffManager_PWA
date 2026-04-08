const ExcelJS = require('exceljs');
const path = require('path');

async function inspectBonusTemplatePro() {
    const workbook = new ExcelJS.Workbook();
    try {
        const filePath = path.join(process.cwd(), 'public/templates/drivebonus_template.xlsx');
        await workbook.xlsx.readFile(filePath);
        const sheet = workbook.getWorksheet(1);

        console.log('--- Detailed Inspection of Bonus Template ---');
        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                const val = cell.value;
                if (val && (JSON.stringify(val).includes('{{') || (typeof val === 'string' && val.includes('{{')))) {
                    console.log(`Cell ${cell.address}:`);
                    console.log(`  - Type: ${typeof val}`);
                    console.log(`  - Is Object: ${val !== null && typeof val === 'object'}`);
                    console.log(`  - Raw Value:`, JSON.stringify(val));
                }
            });
        });

    } catch (err) {
        console.error('Inspection failed:', err);
    }
}

inspectBonusTemplatePro();
