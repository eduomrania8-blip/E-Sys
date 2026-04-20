// src/components/ui/index.tsx
// Reusable primitive UI components

export function Badge({ type }: { type: string }) {
  const map: Record<string, string> = {
    'رسمي': 'bg-blue-100 text-blue-800',
    'رسمي لغات': 'bg-violet-100 text-violet-800',
    'خاص': 'bg-pink-100 text-pink-800',
    'خاص لغات': 'bg-amber-100 text-amber-800',
    'دولي': 'bg-emerald-100 text-emerald-800',
    'ثقافي': 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${map[type] ?? 'bg-gray-100 text-gray-700'}`}>
      {type}
    </span>
  );
}

export function StatCard({
  num,
  label,
  accent,
}: {
  num: number | string;
  label: string;
  accent: 'blue' | 'green' | 'amber' | 'red';
}) {
  const accents = {
    blue: 'border-r-4 border-blue-500',
    green: 'border-r-4 border-emerald-500',
    amber: 'border-r-4 border-amber-500',
    red: 'border-r-4 border-red-500',
  };
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 text-center ${accents[accent]}`}>
      <div className="text-3xl font-bold text-navy">{num}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

export function Alert({ message, type = 'info', onClose }: { message: string; type?: 'success' | 'error' | 'info'; onClose?: () => void }) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    error: 'bg-red-50 border-red-300 text-red-800',
    info: 'bg-blue-50 border-blue-300 text-blue-800',
  };
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  return (
    <div className={`flex items-start gap-2 border rounded-lg px-4 py-3 text-sm ${styles[type]}`}>
      <span>{icons[type]}</span>
      <span className="flex-1">{message}</span>
      {onClose && <button onClick={onClose} className="opacity-60 hover:opacity-100 mr-auto">✕</button>}
    </div>
  );
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div className={`${s[size]} border-2 border-gray-200 border-t-brand rounded-full animate-spin`} />
  );
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1);
  return (
    <div className="flex gap-1.5 justify-center mt-4 flex-wrap">
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            p === page ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {p}
        </button>
      ))}
      {totalPages > 10 && <span className="text-xs text-gray-400 self-center">... {totalPages}</span>}
    </div>
  );
}

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b border-gray-100">
      {children}
    </h2>
  );
}
