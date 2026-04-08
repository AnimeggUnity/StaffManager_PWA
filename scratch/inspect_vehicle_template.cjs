const ExcelJS = require('exceljs');
const path = require('path');

async function inspectVehicleTemplate() {
    const workbook = new ExcelJS.Workbook();
    try {
        const filePath = path.join(process.cwd(), 'public/templates/driverec_template.xlsx');
        await workbook.xlsx.readFile(filePath);
        const sheet = workbook.getWorksheet(1); // 先看第一個分頁（資收車）

        console.log('--- Inspecting Sheet 1 Keywords ---');
        sheet.eachRow(row => {
            row.eachCell(cell => {
                if (typeof cell.value === 'string' && cell.value.includes('{{')) {
                    console.log(`Cell ${cell.address}: ${cell.value}`);
                }
            });
        });

        console.log('\n--- Inspecting Page Setup ---');
        console.log(JSON.stringify(sheet.pageSetup, null, 2));

    } catch (err) {
        console.error('Inspection failed:', err);
    }
}

inspectVehicleTemplate();
