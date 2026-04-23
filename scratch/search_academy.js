const XLSX = require('xlsx');

function searchAcademy() {
  const filePath = 'd:/E-system/البيانات_الرئيسية.xlsx';
  const wb = XLSX.readFile(filePath);
  
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws);
    rows.forEach((row, i) => {
      const name = String(row['اسم_المدرسة'] || '');
      if (name.includes('اكاديمية') || name.includes('أكاديمية')) {
        console.log(`Found "${name}" in ${sheetName} row ${i}`);
      }
    });
  });
}

searchAcademy();
