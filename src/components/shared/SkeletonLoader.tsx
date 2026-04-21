'use client';
// src/components/shared/SkeletonLoader.tsx
// مكوّنات التحميل — بديل احترافي للـ Spinners

import React from 'react';

export function SkeletonCard({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="h-3 w-20 bg-gray-200 rounded-full" />
            <div className="w-6 h-6 bg-gray-200 rounded-lg" />
          </div>
          <div className="h-7 w-24 bg-gray-200 rounded-lg mt-2" />
          <div className="mt-4 h-1 bg-gray-200 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-5 w-48 bg-gray-200 rounded-lg mb-4" />
      <div className="space-y-3">
        {/* Header */}
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 bg-gray-200 rounded-full flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className={`h-3 bg-gray-100 rounded-full flex-1 ${j === 0 ? 'w-32' : ''}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-5 w-48 bg-gray-200 rounded-lg mb-2" />
      <div className="h-3 w-64 bg-gray-100 rounded-full mb-6" />
      <div className="flex items-end gap-3 h-48 px-4">
        {[65, 85, 45, 72, 55, 90, 40].map((h, i) => (
          <div key={i} className="flex-1 bg-gray-200 rounded-t-lg" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-8 animate-in" dir="rtl">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded-lg" />
        <div className="h-3 w-64 bg-gray-100 rounded-full mt-2" />
      </div>
      {/* Cards */}
      <SkeletonCard />
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      {/* Table */}
      <SkeletonTable />
    </div>
  );
}
