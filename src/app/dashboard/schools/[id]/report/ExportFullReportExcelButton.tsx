'use client';
import React, { useState } from 'react';
import * as XLSX from 'xlsx-js-style';

interface ExportFullReportProps {
  data: {
    school: any;
    ea: any;
    stats: any[];
    staff: any[];
    building: any;
  };
}

export default function ExportFullReportExcelButton({ data }: ExportFullReportProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    setLoading(true);
    try {
      const { school, ea, stats, staff, building } = data;

      const aoa: any[][] = [];
      const merges: XLSX.Range[] = [];

      let currentRow = 0;

      // Helper to add merges
      const addMerge = (sR: number, sC: number, eR: number, eC: number) => {
        merges.push({ s: { r: sR, c: sC }, e: { r: eR, c: eC } });
      };

      // --- Header ---
      aoa.push(['جمهورية مصر العربية']); addMerge(currentRow, 0, currentRow, 9); currentRow++;
      aoa.push(['وزارة التربية والتعليم']); addMerge(currentRow, 0, currentRow, 9); currentRow++;
      aoa.push([`${ea?.name_ar || ''} — ${ea?.governorate || ''}`]); addMerge(currentRow, 0, currentRow, 9); currentRow++;
      aoa.push([`تقرير شامل — ${school.school_name_ar}`]); addMerge(currentRow, 0, currentRow, 9); currentRow++;
      aoa.push([]); currentRow++;

      // --- Basic Info ---
      aoa.push(['البيانات الأساسية للمدرسة']); addMerge(currentRow, 0, currentRow, 9); currentRow++;
      aoa.push(['كود المدرسة', school.school_code, 'النوع', school.school_category, 'المرحلة', school.school_type]); currentRow++;
      aoa.push(['الإدارة', ea?.name_ar, 'المحافظة', ea?.governorate, 'حالة المبنى', building?.building_status || 'غير مسجل']); currentRow++;
      aoa.push([]); currentRow++;

      // --- Stats ---
      if (stats.length > 0) {
        aoa.push(['إحصاءات الصفوف الدراسية']); addMerge(currentRow, 0, currentRow, 9); currentRow++;
        aoa.push(['الصف', 'بنين', 'بنات', 'الجملة', 'فصول', 'الكثافة', 'مسلم', 'مسيحي', 'وافد', 'معيد']); currentRow++;
        
        stats.forEach(s => {
          const total = (s.boys_count || 0) + (s.girls_count || 0);
          const density = s.number_of_classes ? (total / s.number_of_classes).toFixed(1) : '0';
          aoa.push([
            s.grade_level,
            s.boys_count || 0,
            s.girls_count || 0,
            total,
            s.number_of_classes || 0,
            Number(density),
            s.muslim_count || 0,
            s.christian_count || 0,
            s.expatriate_count || 0,
            s.retained_count || 0
          ]);
          currentRow++;
        });
        aoa.push([]); currentRow++;
      }

      // --- Staff ---
      const teachers = staff.filter(s => s.job_category === 'معلم').length;
      const admins = staff.filter(s => s.job_category === 'إداري').length;
      const workers = staff.filter(s => s.job_category === 'عامل').length;
      const totalStaff = teachers + admins + workers;

      aoa.push(['الكثافة الوظيفية']); addMerge(currentRow, 0, currentRow, 9); currentRow++;
      aoa.push(['المعلمين', 'الإداريين', 'العمال', 'إجمالي القوة']); currentRow++;
      aoa.push([teachers, admins, workers, totalStaff]); currentRow++;
      aoa.push([]); currentRow++;

      // --- Signatures ---
      aoa.push([]); currentRow++;
      aoa.push(['مدير المدرسة', '', '', 'الموجه الفني', '', '', 'مدير الإدارة']); currentRow++;
      aoa.push(['التوقيع والختم', '', '', 'التوقيع', '', '', 'التوقيع والختم']); currentRow++;


      // 1. Create Sheet
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = merges;
      ws['!dir'] = 'rtl';

      // 2. Styling
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' }; // fill empty cells for styling
          
          const cell = ws[cellRef];
          let isHeader = false;
          let isMainTitle = R <= 3; // Top 4 rows are main titles
          let isSectionTitle = cell.v === 'البيانات الأساسية للمدرسة' || cell.v === 'إحصاءات الصفوف الدراسية' || cell.v === 'الكثافة الوظيفية';
          let isTableHeader = ['الصف', 'بنين', 'كود المدرسة', 'الإدارة', 'المعلمين', 'مدير المدرسة', 'التوقيع والختم'].includes(String(cell.v));

          cell.s = {
            font: {
              name: 'Arial',
              sz: isMainTitle ? 14 : isSectionTitle ? 12 : 11,
              bold: isMainTitle || isSectionTitle || isTableHeader,
              color: { rgb: isMainTitle || isSectionTitle ? "FFFFFF" : "000000" }
            },
            fill: {
              fgColor: { rgb: isMainTitle ? "1F497D" : isSectionTitle ? "4F81BD" : isTableHeader ? "DCE6F1" : "FFFFFF" }
            },
            alignment: {
              vertical: "center",
              horizontal: "center",
              wrapText: true
            },
            border: {
              top: { style: "thin", color: { rgb: "BFBFBF" } },
              bottom: { style: "thin", color: { rgb: "BFBFBF" } },
              left: { style: "thin", color: { rgb: "BFBFBF" } },
              right: { style: "thin", color: { rgb: "BFBFBF" } }
            }
          };
        }
      }

      // 3. Column Widths
      ws['!cols'] = [
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];

      // 4. Save
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'التقرير الشامل');
      XLSX.writeFile(wb, `تقرير_شامل_${school.school_name_ar.replace(/ /g, '_')}.xlsx`);

    } catch (error: any) {
      console.error('Export Error:', error);
      alert('حدث خطأ أثناء التصدير.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="btn-secondary flex items-center gap-2 px-4 py-2 border-green-200 text-green-700 hover:bg-green-50 shadow-sm font-bold text-sm transition-all"
      title="استخراج التقرير كاملاً كملف Excel"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></span>
      ) : (
        <span className="text-lg">📊</span>
      )}
      إكسيل (كامل التقرير)
    </button>
  );
}
