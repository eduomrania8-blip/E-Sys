// src/services/excelExport.ts
import * as XLSX from 'xlsx';

export interface ExportRow {
  rowNum: number;
  name: string;
  grade: string;
  classRoom: string;
}

/**
 * Build an Excel workbook buffer with the standard ترويسة header.
 * Returns a Node.js Buffer suitable for HTTP response.
 */
export function buildExcelExport(params: {
  district: string;
  schoolName: string;
  address: string;
  rows: ExportRow[];
}): Buffer {
  const { district, schoolName, address, rows } = params;

  const wsData: (string | number)[][] = [
    ['الإدارة:', district],
    ['المدرسة:', schoolName],
    ['العنوان:', address],
    [],
    ['م', 'اسم التلميذ رباعياً', 'الصف', 'الفصل'],
    ...rows.map((r) => [r.rowNum, r.name, r.grade, r.classRoom]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 12 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'كشف الطلاب الضعاف');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
