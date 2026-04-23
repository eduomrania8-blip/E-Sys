const XLSX = require('xlsx');

function findCodeInExcel() {
  const filePath = 'd:/E-system/البيانات_الرئيسية.xlsx';
  const wb = XLSX.readFile(filePath);
  const targetCode = '21018398';
  
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws);
    rows.forEach((row, i) => {
      const code = String(row['كود_المدرسة']).trim();
      if (code === targetCode) {
        console.log(`Found code ${targetCode} in sheet ${sheetName}, row ${i}`);
      }
    });
  });
}

findCodeInExcel();
