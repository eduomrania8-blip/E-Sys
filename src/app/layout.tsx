// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'منظومة التعليم الابتدائى',
  description: 'نظام ربط المدارس بالإدارة التعليمية - الإدارة التعليمية بالعمرانية',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
