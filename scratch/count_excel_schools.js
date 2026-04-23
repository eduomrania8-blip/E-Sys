const XLSX = require('xlsx');

function countUniqueSchools() {
  const filePath = 'd:/E-system/البيانات_الرئيسية.xlsx';
  const wb = XLSX.readFile(filePath);
  const codes = new Set();
  
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws);
    rows.forEach(row => {
      const code = String(row['كود_المدرسة']).trim();
      if (code && code !== 'undefined') codes.add(code);
    });
  });

  console.log('Unique school codes in Excel:', codes.size);
  console.log('List of codes:', Array.from(codes));
}

countUniqueSchools();
