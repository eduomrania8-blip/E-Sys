const XLSX = require('xlsx');

function inspectExcel() {
  const filePath = 'd:/E-system/البيانات_الرئيسية.xlsx';
  try {
    const wb = XLSX.readFile(filePath);
    console.log('Sheets:', wb.SheetNames);
    
    wb.SheetNames.forEach(sheetName => {
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      console.log(`\nSheet: ${sheetName}`);
      console.log('First 5 rows:');
      data.slice(0, 5).forEach((row, i) => {
        console.log(`Row ${i}:`, row);
      });
    });
  } catch (error) {
    console.error('Error reading Excel file:', error);
  }
}

inspectExcel();
