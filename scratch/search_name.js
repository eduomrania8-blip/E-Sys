const XLSX = require('xlsx');

function findNameInExcel() {
  const filePath = 'd:/E-system/البيانات_الرئيسية.xlsx';
  const wb = XLSX.readFile(filePath);
  const targetName = 'ذوى الاحتياجات الخاصة لرياض الاطفال';
  
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws);
    rows.forEach((row, i) => {
      const name = String(row['اسم_المدرسة']).trim();
      if (name.includes(targetName)) {
        console.log(`Found name "${targetName}" in sheet ${sheetName}, row ${i}`);
        console.log('Row data:', row);
      }
    });
  });
}

findNameInExcel();
