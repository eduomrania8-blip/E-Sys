// src/components/ui/FileUploader.tsx
'use client';

import React, { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';

export const FileUploader: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(20);
    setResult(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) throw new Error('يرجى تسجيل الدخول أولاً');

      const formData = new FormData();
      formData.append('file', file);

      setProgress(50);

      // Call the Supabase Edge Function
      const { data, error } = await supabaseBrowser.functions.invoke('upload-excel', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setProgress(100);
      setResult({ success: true, ...data });

    } catch (error: any) {
      console.error('Upload Error:', error);
      setResult({ success: false, error: error.message || 'حدث خطأ أثناء الرفع' });
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900">رفع بيانات المدرسة (Excel)</h3>
        <p className="text-sm text-gray-500 mt-1">يرجى رفع ملف الإحصاء السنوي المعتمد</p>
      </div>

      <div className="relative group">
        <label 
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all
            ${uploading ? 'bg-gray-50 border-blue-300' : 'hover:bg-blue-50 hover:border-blue-400 border-gray-300'}
          `}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className={`w-12 h-12 mb-3 ${uploading ? 'text-blue-500 animate-bounce' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mb-2 text-sm text-gray-700">
              <span className="font-bold">اضغط لاختيار ملف</span> أو اسحب الملف هنا
            </p>
            <p className="text-xs text-gray-500">XLSX, XLS (الحد الأقصى 10MB)</p>
          </div>
          <input 
            id="file-upload" 
            type="file" 
            className="hidden" 
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
        
        {uploading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-xl flex items-center justify-center flex-col px-10">
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-blue-700 font-bold animate-pulse">جاري معالجة البيانات...</p>
          </div>
        )}
      </div>

      {result && (
        <div className={`p-5 rounded-xl border flex items-start gap-4 transition-all animate-in fade-in slide-in-from-top-4
          ${result.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}
        `}>
          <div className={`p-2 rounded-full ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
            {result.success ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-bold">{result.success ? 'تم بنجاح!' : 'خطأ في المعالجة'}</h4>
            <p className="text-sm mt-1">{result.success ? 'تم رفع الملف وبدء عملية التدريج بنجاح.' : result.error}</p>
            {result.session_id && (
              <p className="text-xs font-mono mt-2 opacity-60">Session: {result.session_id}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
