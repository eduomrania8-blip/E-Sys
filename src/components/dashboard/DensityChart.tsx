'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DensityChartProps {
  safe: number;     // schools with avg_density <= 40
  warning: number;  // schools with avg_density 41-50
  danger: number;   // schools with avg_density > 50
}

export default function DensityChart({ safe, warning, danger }: DensityChartProps) {
  const total = safe + warning + danger;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm font-bold flex-col gap-2">
        <span className="text-3xl">📊</span>
        <span>لا توجد بيانات كثافة متاحة</span>
      </div>
    );
  }

  const data = [
    { name: `طبيعية ≤40 (${safe})`, value: safe, color: '#10b981' },
    { name: `تحذير 41-50 (${warning})`, value: warning, color: '#f59e0b' },
    { name: `خطر >50 (${danger})`, value: danger, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value} مدرسة`, '']}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right', direction: 'rtl' }}
            itemStyle={{ fontWeight: 'bold' }}
          />
          <Legend verticalAlign="bottom" height={48} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
