'use client';
import React, { useState } from 'react';

interface Props {
  title: string;
  targetId: string;
}

export default function DownloadPdfButton({ title, targetId }: Props) {
  const [loading, setLoading] = useState(false);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  const loadHtml2Pdf = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).html2pdf) {
        resolve((window as any).html2pdf);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = () => reject(new Error('Failed to load html2pdf.js'));
      document.body.appendChild(script);
    });
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const html2pdf = await loadHtml2Pdf();
      
      const element = document.getElementById(targetId);
      if (!element) throw new Error('Content not found');

      // Add a temporary class to ensure the downloaded PDF looks like the printed version
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = '#ffffff';

      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `${title.replace(/ /g, '_')}_${orientation === 'landscape' ? 'عرضي' : 'طولي'}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true, windowWidth: 1200 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: orientation },
      };

      await html2pdf().set(opt).from(element).save();

      element.style.backgroundColor = originalBg;
    } catch (error) {
      console.error('Error generating PDF', error);
      alert('حدث خطأ أثناء إنشاء الـ PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select 
        value={orientation} 
        onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
        className="border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold bg-white text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        disabled={loading}
      >
        <option value="landscape">📄 عرضي (أفضل للجداول)</option>
        <option value="portrait">📄 طولي</option>
      </select>
      
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl shadow-sm hover:bg-red-700 disabled:opacity-50 text-sm font-black transition-all"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            جاري...
          </>
        ) : (
          <>
            <span>📥</span>
            تصدير PDF
          </>
        )}
      </button>
    </div>
  );
}
