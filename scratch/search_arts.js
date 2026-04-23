const XLSX = require('xlsx');

function searchArts() {
  const filePath = 'd:/E-system/البيانات_الرئيسية.xlsx';
  const wb = XLSX.readFile(filePath);
  
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws);
    rows.forEach((row, i) => {
      const name = String(row['اسم_المدرسة'] || '');
      if (name.includes('موسيقى') || name.includes('فنون')) {
        console.log(`Found "${name}" in ${sheetName} row ${i}`);
      }
    });
  });
}

searchArts();
