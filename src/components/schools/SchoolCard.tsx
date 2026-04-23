// src/components/schools/SchoolCard.tsx
import React from 'react';
import Link from 'next/link';

interface SchoolCardProps {
  id: string;
  schoolCode: string;
  schoolName: string;
  totalStudents: number;
  classroomCount: number;
  administrationName: string;
  avgDensity?: number;
}

export const SchoolCard: React.FC<SchoolCardProps> = ({
  id,
  schoolCode,
  schoolName,
  totalStudents,
  classroomCount,
  administrationName,
  avgDensity
}) => {
  const density = avgDensity || (classroomCount > 0 ? totalStudents / classroomCount : 0);
  
  const getDensityStatus = () => {
    if (density > 50) return { label: 'خطر', color: 'border-red-600 bg-red-50', badge: 'bg-red-600 text-white' };
    if (density > 40) return { label: 'مرتفع', color: 'border-red-500 bg-red-50', badge: 'bg-red-500 text-white' };
    if (density > 30) return { label: 'متوسط', color: 'border-yellow-500 bg-yellow-50', badge: 'bg-yellow-500 text-gray-800' };
    return { label: 'آمن', color: 'border-green-500 bg-green-50', badge: 'bg-green-500 text-white' };
  };

  const status = getDensityStatus();

  return (
    <div className={`transition-all hover:shadow-xl border-2 rounded-xl overflow-hidden ${status.color}`}>
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{schoolCode}</span>
            <h3 className="text-xl font-bold text-gray-900 mt-2">{schoolName}</h3>
            <p className="text-sm text-gray-600">{administrationName}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${status.badge}`}>
            {status.label}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/50 p-3 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">الطلاب</p>
            <p className="text-2xl font-black text-gray-800">{totalStudents.toLocaleString('ar-EG')}</p>
          </div>
          <div className="bg-white/50 p-3 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">الكثافة</p>
            <p className={`text-2xl font-black ${density > 40 ? 'text-red-600' : 'text-gray-800'}`}>
              {density.toFixed(1)}
            </p>
          </div>
        </div>

        {density > 40 && (
          <div className="mt-4 flex items-center gap-2 bg-red-600 text-white p-3 rounded-lg animate-pulse">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-bold">تجاوز الحد الأقصى للكثافة!</span>
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 px-5 py-3 border-t flex justify-end">
        <Link 
          href={`/dashboard/schools/${id}`}
          className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          عرض التفاصيل
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>
    </div>
  );
};
