'use client';
import React from 'react';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-primary flex items-center gap-2 px-6 py-2.5 shadow-lg font-black transition-all"
    >
      <span className="text-lg">🖨️</span>
      طباعة التقرير (أو حفظ كـ PDF)
    </button>
  );
}
