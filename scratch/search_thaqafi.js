const XLSX = require('xlsx');

function searchThaqafi() {
  const filePath = 'd:/E-system/البيانات_الرئيسية.xlsx';
  const wb = XLSX.readFile(filePath);
  
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws);
    rows.forEach((row, i) => {
      const name = String(row['اسم_المدرسة'] || '');
      const type = String(row['النوعية'] || '');
      if (name.includes('ثقاف') || type.includes('ثقاف')) {
        console.log(`Found "${name}" (Type: ${type}) in ${sheetName} row ${i}`);
      }
    });
  });
}

searchThaqafi();
