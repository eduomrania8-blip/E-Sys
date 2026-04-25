'use client';
// src/app/school/components/reports/PrintableReport.tsx
// مكوّن مشترك: رأس وتذييل الكشوف الرسمية القابلة للطباعة — بأسلوب احترافي

import React from 'react';

interface ReportHeaderProps {
  title: string;
  schoolName: string;
  adminName?: string;
  governorate?: string;
  schoolCode?: string;
  subtitle?: string;
}

export function ReportHeader({ title, schoolName, adminName, governorate, schoolCode, subtitle }: ReportHeaderProps) {
  const now = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="text-center border-b-2 border-gray-900 pb-3 mb-4">
      <div className="flex justify-between items-start text-xs text-gray-500 mb-2">
        <span>جمهورية مصر العربية</span>
        <span>العام الدراسي: 2025 / 2026</span>
        <span>وزارة التربية والتعليم</span>
      </div>
      <p className="text-sm font-black text-gray-800">{adminName ?? ''} {governorate ? `— ${governorate}` : ''}</p>
      <h1 className="text-lg font-black text-gray-900 mt-1">{title}</h1>
      <p className="text-sm font-bold text-gray-700 mt-0.5">{schoolName}</p>
      {schoolCode && <p className="text-xs text-gray-400">كود: {schoolCode}</p>}
      {subtitle && <p className="text-xs text-blue-700 font-bold mt-0.5">{subtitle}</p>}
      <p className="text-[10px] text-gray-400 mt-1">{now}</p>
    </div>
  );
}

interface ReportFooterProps {
  signers?: { label: string }[];
}

export function ReportFooter({ signers = [
  { label: 'شئون العاملين' },
  { label: 'مدير المدرسة' },
] }: ReportFooterProps) {
  return (
    <div className="mt-10 pt-5 border-t-2 border-gray-300 flex w-full justify-around print-footer">
      {signers.map((s, i) => (
        <div key={i} className="text-center px-6">
          <p className="font-black text-gray-700 mb-8">{s.label}</p>
          <div className="border-t border-gray-400 pt-1 text-gray-400 text-[10px]">التوقيع والختم</div>
        </div>
      ))}
    </div>
  );
}

interface PrintButtonProps {
  label?: string;
  reportId?: string;
}

// ══════════════════════════════════════════════════════
// CSS الطباعة الاحترافي — مطابق لأسلوب صفحة الأدمن
// ══════════════════════════════════════════════════════
const PROFESSIONAL_PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  * { box-sizing: border-box; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; }
  body {
    margin: 0; padding: 16px; font-size: 11px; color: #111;
    direction: rtl; text-align: right; background: #fff;
  }
  h1 { font-size: 16px; font-weight: 900; margin: 4px 0; text-align: center; }
  h2 { font-size: 14px; font-weight: 900; margin: 4px 0; text-align: center; }
  h3 { font-size: 12px; font-weight: 900; margin: 4px 0; }
  
  /* ═══ الجداول ═══ */
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { border: 1px solid #555; padding: 4px 6px; text-align: right; vertical-align: middle; }
  thead th { background: #ddd; font-weight: 900; text-align: center; font-size: 10px; }
  tfoot td { background: #eee; font-weight: 900; }
  tr:nth-child(even) td { background: #f9f9f9; }
  
  /* ═══ ألوان الحالة ═══ */
  .text-red-700, .deficit-cell { color: #b91c1c !important; font-weight: 900; }
  .text-emerald-700, .surplus-cell { color: #047857 !important; font-weight: 900; }
  .text-blue-700 { color: #1d4ed8 !important; font-weight: 900; }
  
  /* ═══ رأس الكشف ═══ */
  .report-header { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
  .report-header-top { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-bottom: 4px; }
  .report-title { font-size: 15px; font-weight: 900; text-align: center; margin: 4px 0; }
  .report-school { font-size: 12px; font-weight: 700; text-align: center; color: #333; }
  .report-meta { font-size: 9px; color: #888; text-align: center; margin-top: 2px; }
  
  /* ═══ تذييل التوقيعات ═══ */
  .print-footer { display: flex; justify-content: space-around; margin-top: 40px; padding-top: 16px; border-top: 2px solid #333; }
  .print-footer div { text-align: center; min-width: 120px; }
  .print-footer p { font-weight: 900; margin-bottom: 30px; font-size: 11px; }
  .print-footer small { border-top: 1px solid #888; display: block; padding-top: 4px; color: #666; font-size: 9px; }
  
  /* ═══ صفوف الفئات (مواد تضاف / لا تضاف) ═══ */
  .category-header-row td { background: #e5e7eb !important; font-weight: 900; font-size: 10px; }
  .surplus-row td { background: #f0fdf4 !important; }
  .deficit-row td { background: #fef2f2 !important; }
  
  /* ═══ إعدادات الطباعة ═══ */
  @page { margin: 1.2cm 1cm; size: A4; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }
  }
  
  /* ═══ كشف العجز والزيادة — خلايا محددة ═══ */
  .shortage-table th { text-align: center !important; font-size: 9px; background: #d1d5db; }
  .shortage-table td { text-align: center; font-size: 10px; }
  .shortage-table td:nth-child(2) { text-align: right; font-weight: 700; }
  .quota-row { background: #fef9c3 !important; }
  .quota-row td { font-weight: 900; color: #1e40af; font-size: 10px; }
  .total-row { background: #e2e8f0 !important; }
  .total-row td { font-weight: 900; font-size: 11px; }
  
  /* ═══ شريط الإحصاء السريع ═══ */
  .kpi-grid { display: flex; gap: 8px; margin: 8px 0; }
  .kpi-card { flex: 1; border: 1px solid #d1d5db; border-radius: 6px; padding: 6px; text-align: center; }
  .kpi-value { font-size: 16px; font-weight: 900; }
  .kpi-label { font-size: 9px; color: #6b7280; margin-top: 2px; }
`;

export function PrintButton({ label = '🖨️ طباعة الكشف', reportId }: PrintButtonProps) {
  const handlePrint = () => {
    if (reportId) {
      const el = document.getElementById(reportId);
      if (!el) return;
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) return;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>كشف رسمي — منظومة التعليم الابتدائي</title>
          <style>${PROFESSIONAL_PRINT_CSS}</style>
        </head>
        <body>${el.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); }, 600);
    } else {
      window.print();
    }
  };

  return (
    <button
      onClick={handlePrint}
      className="no-print flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-black rounded-xl hover:bg-slate-700 transition-all shadow-sm"
    >
      {label}
    </button>
  );
}
