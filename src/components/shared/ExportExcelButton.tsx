'use client';
import React, { useState } from 'react';
import * as XLSX from 'xlsx-js-style';

interface ExportExcelButtonProps {
  /** The ID of the HTML table to export (if exporting from UI) */
  tableId?: string;
  /** Raw JSON data to export (if exporting from database) */
  data?: any[];
  /** The name of the downloaded file (without .xlsx) */
  fileName: string;
  /** The name of the sheet inside the workbook */
  sheetName?: string;
  /** Button text */
  buttonText?: string;
  /** Button CSS classes */
  className?: string;
}

export default function ExportExcelButton({
  tableId,
  data,
  fileName,
  sheetName = 'البيانات',
  buttonText = 'تصدير إكسيل',
  className = 'btn-secondary flex items-center gap-2 px-4 py-2 border-green-200 text-green-700 hover:bg-green-50 shadow-sm font-bold text-sm transition-all'
}: ExportExcelButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    setLoading(true);
    try {
      let wb: XLSX.WorkBook;

      if (tableId) {
        // Export from HTML Table
        const table = document.getElementById(tableId);
        if (!table) throw new Error(`لم يتم العثور على الجدول: ${tableId}`);
        wb = XLSX.utils.table_to_book(table, { sheet: sheetName });
      } else if (data && data.length > 0) {
        // Export from JSON Data
        const ws = XLSX.utils.json_to_sheet(data);
        wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      } else {
        throw new Error('لم يتم توفير بيانات أو جدول للتصدير');
      }

      // تحسين التنسيق الأساسي والستايلات
      const sheet = wb.Sheets[sheetName];
      if (sheet) {
        // 1. تفعيل الاتجاه من اليمين لليسار
        sheet['!dir'] = 'rtl';
        
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        const colWidths = [];
        
        // 2. تطبيق التنسيقات (ألوان، حدود، توسيط)
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
            const cell = sheet[cellRef];
            
            if (!cell) continue;

            const isHeader = R === 0; // الصف الأول يعتبر الرأس
            
            cell.s = {
              font: {
                name: 'Arial',
                sz: 11,
                bold: isHeader,
                color: { rgb: isHeader ? "FFFFFF" : "000000" }
              },
              fill: {
                fgColor: { rgb: isHeader ? "4F81BD" : "FFFFFF" }
              },
              alignment: {
                vertical: "center",
                horizontal: "center",
                wrapText: true
              },
              border: {
                top: { style: "thin", color: { auto: 1 } },
                bottom: { style: "thin", color: { auto: 1 } },
                left: { style: "thin", color: { auto: 1 } },
                right: { style: "thin", color: { auto: 1 } }
              }
            };
          }
        }

        // 3. ضبط عرض الأعمدة تلقائياً
        for (let C = range.s.c; C <= range.e.c; ++C) {
          let max = 10;
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cell = sheet[XLSX.utils.encode_cell({ c: C, r: R })];
            if (cell && cell.v) {
              const len = cell.v.toString().length;
              if (len > max) max = len;
            }
          }
          colWidths.push({ wch: max + 5 }); // توسعة أكثر بـ 5 أحرف لشكل أجمل
        }
        sheet['!cols'] = colWidths;
      }

      // Generate File
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } catch (error: any) {
      console.error('Excel Export Error:', error);
      alert(error.message || 'حدث خطأ أثناء تصدير ملف الإكسيل.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={className}
      title="تحميل كملف Excel قابل للتعديل"
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></span>
          جاري المعالجة...
        </>
      ) : (
        <>
          <span className="text-lg">📊</span>
          {buttonText}
        </>
      )}
    </button>
  );
}
