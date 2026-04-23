const XLSX = require('xlsx');

function checkExcelTypes() {
  const filePath = 'd:/E-system/البيانات_الرئيسية.xlsx';
  const wb = XLSX.readFile(filePath);
  const types = new Set();
  
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws);
    rows.forEach(row => {
      const type = row['النوعية'] || row['نظام_الدراسة'];
      if (type) types.add(String(type).trim());
    });
  });

  console.log('Unique types in Excel:', Array.from(types));
}

checkExcelTypes();
