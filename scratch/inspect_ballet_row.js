const XLSX = require('xlsx');

function checkRow495() {
  const filePath = 'd:/E-system/البيانات_الرئيسية.xlsx';
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets['البيانات_الرئيسية'];
  const data = XLSX.utils.sheet_to_json(ws);
  console.log('Row 495:', data[494]); // index 494 is row 496 in Excel if row 1 is header
  // Wait, my previous log said "row 495" from sheet_to_json.
  console.log('Target Row:', data.find(r => String(r['اسم_المدرسة']).includes('بالية')));
}

checkRow495();
