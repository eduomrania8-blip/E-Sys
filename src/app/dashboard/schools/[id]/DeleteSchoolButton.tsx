'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function DeleteSchoolButton({ schoolId }: { schoolId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleDelete = async () => {
    if (!confirm('الرجاء الانتباه! ⚠️\n\nهل أنت متأكد من حذف هذه المدرسة بالكامل؟ سيتم مسح كافة البيانات المرتبطة بها (إحصاءات، مبنى، عمال، الخ) ولن يمكن التراجع عن هذا الإجراء.')) return;
    
    setLoading(true);
    
    // API Call to delete school securely
    try {
      // 1. مسح البيانات من الجداول التي قد تفتقر إلى ON DELETE CASCADE
      await supabase.from('audit_log').delete().eq('school_id', schoolId);
      await supabase.from('staging_school_data').delete().eq('matched_school_id', schoolId);
      await supabase.from('system_notifications').delete().eq('school_id', schoolId);
      await supabase.from('upload_sessions').delete().eq('school_id', schoolId);
      await supabase.from('supervision_visits').delete().eq('school_id', schoolId);
      await supabase.from('user_school_permissions').delete().eq('school_id', schoolId);

      // 2. مسح المدرسة (سيتم مسح معظم البيانات المرتبطة بفضل CASCADE)
      const { error } = await supabase.from('schools').delete().eq('id', schoolId);
      
      if (error) throw error;
      
      // If success, navigate back
      router.push('/dashboard/schools');
      router.r