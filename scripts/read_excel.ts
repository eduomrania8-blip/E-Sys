import * as xlsx from 'xlsx';

const wb = xlsx.readFile('d:/E-system/احصاء_العجز_والزيادة_وفق_آحر_تحديث (1).xlsx');
console.log('Sheets:', wb.SheetNames);

wb.SheetNames.forEach(name => {
  console.log(`\n=== SHEET: "${name}" ===`);
  const sheet = wb.Sheets[name];
  const data = xlsx.utils.sheet_to_json<any>(sheet, { header: 1 });
  // Print first 5 rows for structure
  data.slice(0, 8).forEach((row: any, i: number) => {
    console.log(`Row ${i}:`, JSON.stringify(row));
  });
  console.log(`Total rows: ${data.length}`);
});
