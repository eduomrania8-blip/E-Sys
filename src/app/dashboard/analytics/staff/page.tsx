'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { calculateSubjectShortage, PRIMARY_CURRICULUM, SUBJECT_WEEKLY_PERIODS } from '@/utils/hrCalculator';

const normalizeArabicSubject = (text: string) => {
  if (!text) return '';
  return text.trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ي/g, 'ى')
    .replace(/^ال/, '') // Remove "ال" from start of string
    .replace(/\sال/g, ' '); // Remove "ال" from middle words
};

// تطبيع مستويات الصفوف لتتطابق مع مفاتيح PRIMARY_CURRICULUM
const GRADE_CANONICAL: Record<string, string> = {
  'الصف الأول': 'الأول', 'الصف الثاني': 'الثاني', 'الصف الثالث': 'الثالث',
  'الصف الرابع': 'الرابع', 'الصف الخامس': 'الخامس', 'الصف السادس': 'السادس',
  'أولى ابتدائي': 'الأول', 'ثانية ابتدائي': 'الثاني', 'ثالثة ابتدائي': 'الثالث',
  'رابعة ابتدائي': 'الرابع', 'خامسة ابتدائي': 'الخامس', 'سادسة ابتدائي': 'السادس',
  '1': 'الأول', '2': 'الثاني', '3': 'الثالث', '4': 'الرابع', '5': 'الخامس', '6': 'السادس',
};

const normalizeGradeLevel = (grade: string | null | undefined): string => {
  if (!grade) return '';
  const clean = grade.trim();
  return GRADE_CANONICAL[clean] || clean; // إذا لم يوجد في الخريطة أرجع القيمة كما هي
};

export default function StaffAnalyticsCenter() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<string>('all');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<'primary' | 'preparatory' | 'secondary'>('primary');
  const [activeTab, setActiveTab] = useState<'stats' | 'schools_shortage' | 'staff_list' | 'leaders_list'>('stats');
  
  // فلاتر كشف العاملين التفصيلي
  const [staffCategoryFilter, setStaffCategoryFilter] = useState('all');
  const [staffSubjectFilter, setStaffSubjectFilter] = useState('all');
  const [staffEmploymentFilter, setStaffEmploymentFilter] = useState('all');

  useEffect(() => {
    async function fetchData() {
      const [schRes, staffRes, leaderRes, statsRes] = await Promise.all([
        supabase.from('schools').select('id, school_name_ar, school_type'),
        supabase.from('school_staff').select('*'),
        supabase.from('school_leaders').select('*'),
        supabase.from('class_statistics').select('school_id, number_of_classes')
      ]);

      if (schRes.error) setFetchError(`Schools Error: ${schRes.error.message}`);
      if (staffRes.error) setFetchError(`Staff Error: ${staffRes.error.message}`);
      if (leaderRes.error) setFetchError(`Leaders Error: ${leaderRes.error.message}`);
      if (statsRes.error) setFetchError(`Stats Error: ${statsRes.error.message}`);

      if (schRes.data) setSchools(schRes.data);
      if (staffRes.data) {
        // تنظيف الأسماء وتوحيد المسميات بمجرد الجلب لضمان التطابق التام في جميع شاشات العرض والفلاتر
        const cleanStaffData = staffRes.data.map(s => {
          let original = s.subject_taught || '';
          let normalized = original.trim();
          let searchStr = normalized.replace(/أ|إ|آ/g, 'ا').replace(/ة/g, 'ه').replace(/ي/g, 'ى').replace(/^ال/, '').replace(/\sال/g, ' ');
          let newSubject = original;

          if (searchStr.includes('عربى')) newSubject = 'اللغة العربية';
          else if (searchStr.includes('انجليزى') || searchStr.includes('لغه اجنبيه')) newSubject = 'اللغة الإنجليزية';
          else if (searchStr.includes('رياضيات') || searchStr.includes('حساب')) newSubject = 'رياضيات';
          else if (searchStr.includes('علوم')) newSubject = 'علوم';
          else if (searchStr.includes('دراسات')) newSubject = 'دراسات اجتماعية';
          else if (searchStr.includes('حاسب') || searchStr.includes('تكنولوجيا')) newSubject = 'حاسب آلي';
          else if (searchStr.includes('فنيه')) newSubject = 'تربية فنية';
          else if (searchStr.includes('رياضيه') || searchStr.includes('بدنيه') || searchStr.includes('العاب')) newSubject = 'تربية رياضية';
          else if (searchStr.includes('موسيقيه')) newSubject = 'تربية موسيقية';
          else if (searchStr.includes('دينيه اسلاميه') || searchStr.includes('دين اسلامى') || searchStr === 'دينيه') newSubject = 'تربية دينية إسلامية';
          else if (searchStr.includes('دينيه مسيحيه') || searchStr.includes('دين مسيحى')) newSubject = 'تربية دينية مسيحية';
          else if (searchStr.includes('دينيه') || searchStr.includes('دين')) newSubject = 'تربية دينية';
          else if (searchStr.includes('اكتشف') || searchStr.includes('متعدد')) newSubject = 'متعدد التخصصات (اكتشف)';
          else if (searchStr.includes('مهارات') || searchStr.includes('مهنيه') || searchStr.includes('اقتصاد منزلى')) newSubject = 'مهارات مهنية';
          else if (searchStr.includes('فرنساوى') || searchStr.includes('فرنسيه')) newSubject = 'لغة فرنسية';
          else if (searchStr.includes('فلسفه')) newSubject = 'فلسفة';
          else if (searchStr.includes('علم نفس')) newSubject = 'علم نفس';
          else if (searchStr.includes('تاريخ')) newSubject = 'تاريخ';
          else if (searchStr.includes('جغرافيا')) newSubject = 'جغرافيا';
          else if (searchStr.includes('فيزياء')) newSubject = 'فيزياء';
          else if (searchStr.includes('كيمياء')) newSubject = 'كيمياء';
          else if (searchStr.includes('احياء')) newSubject = 'أحياء';

          return { ...s, subject_taught: newSubject };
        });
        setStaff(cleanStaffData);
      }
      if (leaderRes.data) setLeaders(leaderRes.data);
      if (statsRes.data) setStats(statsRes.data);
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  // استخراج أنواع المدارس الحقيقية من القاعدة
  const uniqueSchoolTypes = useMemo(() => Array.from(new Set(schools.map(s => s.school_type))).filter(Boolean), [schools]);

  // فلترة المدارس (نوع المدرسة + اختيار مدرسة محددة)
  const filteredSchools = useMemo(() => {
    let result = schools;
    if (schoolTypeFilter !== 'all') {
      result = result.filter(s => s.school_type === schoolTypeFilter);
    }
    if (selectedSchoolId !== 'all') {
      result = result.filter(s => s.id === selectedSchoolId);
    }
    return result;
  }, [schools, schoolTypeFilter, selectedSchoolId]);

  const filteredSchoolIds = new Set(filteredSchools.map(s => s.id));

  // حساب إجمالي الفصول للمدارس المفلترة (للمرحلة المختارة)
  // حالياً نفترض أن class_statistics المفلترة تنتمي للمرحلة الابتدائية (إلى أن نضيف حقل stage في الإحصاءات)
  const totalClasses = useMemo(() => {
    return stats
      .filter(st => filteredSchoolIds.has(st.school_id))
      .reduce((sum, st) => sum + (st.number_of_classes || 0), 0);
  }, [stats, filteredSchoolIds]);

  // حساب الموظفين للمدارس المفلترة (مع تطبيق ترتيب الصفوف الذكي حسب التخصص)
  const filteredStaff = useMemo(() => {
    return staff
      .filter(s => filteredSchoolIds.has(s.school_id))
      .sort((a, b) => {
        // 1. الترتيب حسب الفئة (المعلمين أولاً، ثم الإداريين، ثم العمال)
        const catOrder: Record<string, number> = { 'معلم': 1, 'إداري': 2, 'عامل': 3 };
        const catA = catOrder[a.job_category] || 4;
        const catB = catOrder[b.job_category] || 4;
        if (catA !== catB) return catA - catB;
        
        // 2. الترتيب الأبجدي حسب التخصص داخل نفس الفئة (لتجميع مدرسي العربي معاً، الرياضات معاً، الخ)
        const specA = a.subject_taught || a.school_role || a.worker_type || '';
        const specB = b.subject_taught || b.school_role || b.worker_type || '';
        return specA.localeCompare(specB, 'ar');
      });
  }, [staff, filteredSchoolIds]);

  // إحصائيات القوة العاملة (Teachers vs Admins vs Workers)
  const workforceBreakdown = useMemo(() => {
    const teachers = filteredStaff.filter(s => s.job_category === 'معلم').length;
    const admins = filteredStaff.filter(s => s.job_category === 'إداري').length;
    const workers = filteredStaff.filter(s => s.job_category === 'عامل').length;
    const total = teachers + admins + workers || 1; // تفادي القسمة على صفر
    return { teachers, admins, workers, teachersPct: (teachers/total)*100, adminsPct: (admins/total)*100, workersPct: (workers/total)*100 };
  }, [filteredStaff]);

  // تحليل العجز والزيادة (الاحترافي: حساب العجز على مستوى كل مدرسة لمنع تغطية العجز بالزيادة الوهمية)
  const shortageAnalysis = useMemo(() => {
    const subjects = Object.keys(PRIMARY_CURRICULUM);
    
    return subjects.map(subject => {
      let totalRequired = 0;
      let totalAvailable = 0;
      let districtActualDeficit = 0;
      let districtActualSurplus = 0;
      let activeTeachersCount = 0;
      
      // الحساب يتم مدرسة بمدرسة
      filteredSchools.forEach(school => {
        // تطبيع grade_level لضمان التطابق مع مفاتيح PRIMARY_CURRICULUM
        const schoolClassStats = stats
          .filter(st => st.school_id === school.id)
          .map(st => ({ ...st, grade_level: normalizeGradeLevel(st.grade_level) }));
          
        const schoolTeachers = filteredStaff.filter(s => {
          if (s.school_id !== school.id || s.job_category !== 'معلم') return false;
          const taught = (s.subject_taught || '').trim();
          const cleanSubject = subject.trim();
          
          if (cleanSubject === 'تربية دينية') return taught.includes('تربية دينية') || taught.includes('دين');
          if (cleanSubject === 'حاسب آلي') return taught.includes('حاسب') || taught.includes('تكنولوجيا');
          
          return normalizeArabicSubject(taught) === normalizeArabicSubject(cleanSubject);
        });
        
        const calc = calculateSubjectShortage(subject, schoolClassStats, schoolTeachers, stageFilter);
        
        totalRequired += calc.requiredPeriods;
        totalAvailable += calc.availablePeriods;
        activeTeachersCount += calc.activeTeachersCount;
        
        if (calc.netTeachers < 0) districtActualDeficit += Math.abs(calc.netTeachers);
        if (calc.netTeachers > 0) districtActualSurplus += calc.netTeachers;
      });

      return {
        subject,
        activeTeachersCount,
        requiredPeriods: totalRequired,
        availablePeriods: totalAvailable,
        netPeriods: totalAvailable - totalRequired,
        actualDeficit: Number(districtActualDeficit.toFixed(1)),
        actualSurplus: Number(districtActualSurplus.toFixed(1)),
        netTeachers: Number((districtActualSurplus - districtActualDeficit).toFixed(1)),
      };
    }).sort((a, b) => b.actualDeficit - a.actualDeficit); // ترتيب حسب العجز الأكبر
  }, [filteredStaff, filteredSchools, stats, stageFilter]);

  const schoolBySchoolAnalysis = useMemo(() => {
    return filteredSchools.map(school => {
      const schoolClassStats = stats
        .filter(st => st.school_id === school.id)
        .map(st => ({ ...st, grade_level: normalizeGradeLevel(st.grade_level) }));
      const schoolClassesTotal = schoolClassStats.reduce((sum, st) => sum + (st.number_of_classes || 0), 0);
        
      const subjects = Object.keys(PRIMARY_CURRICULUM);
      let schoolDeficit = 0;
      let schoolSurplus = 0;
      
      const subjectDetails = subjects.map(subject => {
        const schoolTeachers = filteredStaff.filter(s => {
          if (s.school_id !== school.id || s.job_category !== 'معلم') return false;
          const taught = (s.subject_taught || '').trim();
          const cleanSubject = subject.trim();
          
          if (cleanSubject === 'تربية دينية') return taught.includes('تربية دينية') || taught.includes('دين');
          if (cleanSubject === 'حاسب آلي') return taught.includes('حاسب') || taught.includes('تكنولوجيا');
          
          return normalizeArabicSubject(taught) === normalizeArabicSubject(cleanSubject);
        });
        const calc = calculateSubjectShortage(subject, schoolClassStats, schoolTeachers, stageFilter);
        if (calc.netTeachers < 0) schoolDeficit += Math.abs(calc.netTeachers);
        if (calc.netTeachers > 0) schoolSurplus += calc.netTeachers;
        return { subject, ...calc };
      });

      return {
        id: school.id,
        school_name: school.school_name_ar,
        school_type: school.school_type,
        schoolClasses: schoolClassesTotal,
        schoolDeficit: Number(schoolDeficit.toFixed(1)),
        schoolSurplus: Number(schoolSurplus.toFixed(1)),
        subjectDetails: subjectDetails.filter(d => d.netTeachers !== 0)
      };
    }).sort((a, b) => b.schoolDeficit - a.schoolDeficit);
  }, [filteredSchools, stats, filteredStaff, stageFilter]);

  // تحليل أنواع التعيينات (Contract Types)
  const contractBreakdown = useMemo(() => {
    const contracts: Record<string, number> = {};
    filteredStaff.forEach(s => {
      const type = s.employment_type || 'غير محدد';
      contracts[type] = (contracts[type] || 0) + 1;
    });
    return Object.entries(contracts).sort((a, b) => b[1] - a[1]);
  }, [filteredStaff]);

  // تحليل القيادات (Leaders & Governance)
  const leadersAnalysis = useMemo(() => {
    const filteredLeaders = leaders.filter(l => filteredSchoolIds.has(l.school_id));
    
    // عدد المدارس التي استوفت التشكيل القيادي
    let schoolsWithDirector = 0;
    let schoolsWithSecurity = 0;
    let schoolsWithAgents = 0;

    const groupedBySchool = filteredLeaders.reduce((acc: any, l) => {
      acc[l.school_id] = acc[l.school_id] || [];
      acc[l.school_id].push(l.job_title);
      return acc;
    }, {});

    Object.values(groupedBySchool).forEach((titles: any) => {
      if (titles.includes('مدير')) schoolsWithDirector++;
      if (titles.includes('مسئول أمن')) schoolsWithSecurity++;
      if (titles.includes('وكيل شئون الطلاب') || titles.includes('وكيل شئون العاملين')) schoolsWithAgents++;
    });

    const totalFilteredSchools = filteredSchools.length;
    return {
      totalFilteredSchools,
      missingDirector: totalFilteredSchools - schoolsWithDirector,
      missingSecurity: totalFilteredSchools - schoolsWithSecurity,
      missingAgents: totalFilteredSchools - schoolsWithAgents,
      totalLeaders: filteredLeaders.length,
    };
  }, [leaders, filteredSchools, filteredSchoolIds]);

  // تجهيز الفلاتر لكشف العاملين (Unique Values)
  const uniqueCategories = useMemo(() => Array.from(new Set(filteredStaff.map(s => s.job_category).filter(Boolean))), [filteredStaff]);
  const uniqueSubjects = useMemo(() => Array.from(new Set(filteredStaff.map(s => (s.subject_taught || s.school_role || s.worker_type || '').trim()).filter(Boolean))), [filteredStaff]);
  const uniqueEmployments = useMemo(() => Array.from(new Set(filteredStaff.map(s => (s.employment_type || '').trim()).filter(Boolean))), [filteredStaff]);

  // تطبيق الفلاتر على كشف العاملين
  const displayStaff = useMemo(() => {
    return filteredStaff.filter(s => {
      if (staffCategoryFilter !== 'all' && s.job_category !== staffCategoryFilter) return false;
      const spec = (s.subject_taught || s.school_role || s.worker_type || '').trim();
      if (staffSubjectFilter !== 'all' && spec !== staffSubjectFilter) return false;
      const emp = (s.employment_type || '').trim();
      if (staffEmploymentFilter !== 'all' && emp !== staffEmploymentFilter) return false;
      return true;
    });
  }, [filteredStaff, staffCategoryFilter, staffSubjectFilter, staffEmploymentFilter]);

  const totalDeficit = shortageAnalysis.filter(s => s.netTeachers < 0).reduce((sum, s) => sum + s.netTeachers, 0);
  const totalSurplus = shortageAnalysis.filter(s => s.netTeachers > 0).reduce((sum, s) => sum + s.netTeachers, 0);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50/50" dir="rtl">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-indigo-200"></div>
        <p className="font-black text-indigo-900 text-lg animate-pulse">جاري تحميل بيانات الموارد البشرية والأنصبة القانونية...</p>
      </div>
    </div>
  );

  if (fetchError) return (
    <div className="flex h-screen items-center justify-center bg-gray-50/50" dir="rtl">
      <div className="bg-red-50 p-8 rounded-3xl border border-red-200 text-center max-w-xl">
        <h2 className="text-2xl font-black text-red-600 mb-4">⚠️ خطأ في صلاحيات جلب البيانات!</h2>
        <p className="text-slate-700 font-bold mb-4">{fetchError}</p>
        <p className="text-sm text-slate-500">يبدو أن هناك مشكلة في جلسة الدخول (Session Expired) أو أن سياسة الحماية (RLS) تمنع حسابك من قراءة هذه الجداول. يرجى تسجيل الخروج ثم تسجيل الدخول مرة أخرى بحساب الأدمن.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Global Filters */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-900/5 border border-indigo-50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 text-2xl text-white">
              👥
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">مركز تقارير العاملين</h1>
              <p className="text-slate-500 font-bold text-sm mt-1">التحليل الرياضي للعجز والزيادة والنصاب القانوني</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {/* الفرز المتقدم للمدارس */}
            <select value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-xl px-4 py-2 outline-none">
              <option value="all">🏢 الإدارة بالكامل (جميع المدارس)</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.school_name_ar}</option>)}
            </select>

            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex overflow-x-auto">
              <button onClick={() => setSchoolTypeFilter('all')} className={`px-4 py-2 whitespace-nowrap rounded-lg text-sm font-black transition-all ${schoolTypeFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>الكل</button>
              {uniqueSchoolTypes.map(type => (
                <button key={type} onClick={() => setSchoolTypeFilter(type as string)}
                  className={`px-4 py-2 whitespace-nowrap rounded-lg text-sm font-black transition-all ${schoolTypeFilter === type ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {type as string}
                </button>
              ))}
            </div>
            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex">
              <button onClick={() => setStageFilter('primary')} className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${stageFilter === 'primary' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>الابتدائي</button>
              <button onClick={() => setStageFilter('preparatory')} className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${stageFilter === 'preparatory' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>الإعدادي</button>
              <button onClick={() => setStageFilter('secondary')} className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${stageFilter === 'secondary' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>الثانوي</button>
            </div>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute -left-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10"></div>
            <p className="text-slate-400 font-bold text-xs mb-1">إجمالي الفصول المدرسية</p>
            <h3 className="text-3xl font-black text-slate-800">{totalClasses.toLocaleString()} <span className="text-sm text-slate-400 font-bold">فصل</span></h3>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute -left-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10"></div>
            <p className="text-slate-400 font-bold text-xs mb-1">القوة العاملة الفعالة</p>
            <h3 className="text-3xl font-black text-slate-800">{filteredStaff.length.toLocaleString()} <span className="text-sm text-slate-400 font-bold">موظف</span></h3>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-red-50 shadow-sm relative overflow-hidden group">
            <div className="absolute -left-6 -top-6 w-24 h-24 bg-red-50 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10"></div>
            <p className="text-red-400 font-bold text-xs mb-1">إجمالي العجز (بالأفراد)</p>
            <h3 className="text-3xl font-black text-red-600" dir="ltr">{totalDeficit.toLocaleString()}</h3>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-emerald-50 shadow-sm relative overflow-hidden group">
            <div className="absolute -left-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10"></div>
            <p className="text-emerald-500 font-bold text-xs mb-1">إجمالي الزيادة (بالأفراد)</p>
            <h3 className="text-3xl font-black text-emerald-600" dir="ltr">+{totalSurplus.toLocaleString()}</h3>
          </div>
        </div>

        {/* Tabs for Stats vs Lists */}
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-1">
          <button onClick={() => setActiveTab('stats')} className={`whitespace-nowrap px-6 py-3 font-black text-sm transition-all border-b-2 ${activeTab === 'stats' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            📊 لوحة القيادة التحليلية
          </button>
          <button onClick={() => setActiveTab('schools_shortage')} className={`whitespace-nowrap px-6 py-3 font-black text-sm transition-all border-b-2 ${activeTab === 'schools_shortage' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            🏫 العجز والزيادة (تفصيلي بالمدارس)
          </button>
          <button onClick={() => setActiveTab('staff_list')} className={`whitespace-nowrap px-6 py-3 font-black text-sm transition-all border-b-2 ${activeTab === 'staff_list' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            👥 الكشوف الإسمية للعمالة
          </button>
          <button onClick={() => setActiveTab('leaders_list')} className={`whitespace-nowrap px-6 py-3 font-black text-sm transition-all border-b-2 ${activeTab === 'leaders_list' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            🛡️ سجل القيادات
          </button>
        </div>

        {activeTab === 'stats' && (
          <>
            {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Col: Workforce Breakdown */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-6">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <span>🥧</span> الهيكل الوظيفي
            </h3>
            <div className="space-y-4 flex-1 justify-center flex flex-col">
              <div className="relative pt-1">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold text-blue-600">معلمون ({workforceBreakdown.teachers})</span>
                  <span className="text-xs font-bold text-blue-600">{workforceBreakdown.teachersPct.toFixed(1)}%</span>
                </div>
                <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-blue-50">
                  <div style={{ width: `${workforceBreakdown.teachersPct}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                </div>
              </div>
              <div className="relative pt-1">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold text-purple-600">إداريون ({workforceBreakdown.admins})</span>
                  <span className="text-xs font-bold text-purple-600">{workforceBreakdown.adminsPct.toFixed(1)}%</span>
                </div>
                <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-purple-50">
                  <div style={{ width: `${workforceBreakdown.adminsPct}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500"></div>
                </div>
              </div>
              <div className="relative pt-1">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold text-amber-600">عمال ({workforceBreakdown.workers})</span>
                  <span className="text-xs font-bold text-amber-600">{workforceBreakdown.workersPct.toFixed(1)}%</span>
                </div>
                <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-amber-50">
                  <div style={{ width: `${workforceBreakdown.workersPct}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amber-500"></div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs text-slate-500 font-bold leading-relaxed text-center">
                تُبنى هذه المؤشرات على <span className="text-slate-800">بيانات التسكين المباشر</span> وتستبعد من هم على المعاش أو في إجازات بدون مرتب.
              </p>
            </div>
          </div>

          {/* Right Col: Shortage Matrix */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <span>📉</span> مصفوفة العجز والزيادة (قانونياً)
              </h3>
              <button className="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2">
                <span>📥</span> تصدير التقرير
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="text-xs text-slate-500 bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-black rounded-tr-xl">المادة الدراسية</th>
                    <th className="px-4 py-3 font-black text-center">عدد المعلمين</th>
                    <th className="px-4 py-3 font-black text-center">الحصص المتوفرة</th>
                    <th className="px-4 py-3 font-black text-center">الحصص المطلوبة</th>
                    <th className="px-4 py-3 font-black text-center">صافي الحصص</th>
                    <th className="px-4 py-3 font-black text-center bg-red-50 text-red-700">العجز الفعلي</th>
                    <th className="px-4 py-3 font-black text-center bg-emerald-50 text-emerald-700 rounded-tl-xl">الزيادة الفعلية</th>
                  </tr>
                </thead>
                <tbody>
                  {shortageAnalysis.map((row, idx) => (
                    <tr key={row.subject} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                      <td className="px-4 py-3 font-bold text-slate-800">{row.subject}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-500">{row.activeTeachersCount}</td>
                      <td className="px-4 py-3 text-center font-mono text-emerald-600 bg-emerald-50/30">{row.availablePeriods}</td>
                      <td className="px-4 py-3 text-center font-mono text-blue-600 bg-blue-50/30">{row.requiredPeriods}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold" dir="ltr">
                        <span className={row.netPeriods > 0 ? 'text-emerald-500' : row.netPeriods < 0 ? 'text-red-500' : 'text-slate-400'}>
                          {row.netPeriods > 0 ? '+' : ''}{row.netPeriods}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center bg-red-50/30">
                        <span className="font-black text-red-600">{row.actualDeficit > 0 ? `-${row.actualDeficit}` : '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-center bg-emerald-50/30">
                        <span className="font-black text-emerald-600">{row.actualSurplus > 0 ? `+${row.actualSurplus}` : '-'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* Bottom Grid: Contracts & Leaders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contracts */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-black text-slate-800 flex items-center gap-2 mb-6">
              <span>📝</span> أنواع التعيينات والتعاقدات
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {contractBreakdown.map(([type, count]) => (
                <div key={type} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-indigo-600 mb-1">{count}</p>
                  <p className="text-xs font-bold text-slate-500">{type}</p>
                </div>
              ))}
              {contractBreakdown.length === 0 && (
                <div className="col-span-full text-center py-4 text-slate-400 text-sm font-bold">لا توجد بيانات تعيين</div>
              )}
            </div>
          </div>

          {/* Leaders Governance */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-black text-slate-800 flex items-center gap-2 mb-6">
              <span>🛡️</span> الرقابة على الهيكل القيادي
            </h3>
            <div className="space-y-3">
              <div className={`p-4 rounded-xl flex items-center justify-between border ${leadersAnalysis.missingDirector > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👑</span>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">مديري المدارس</h4>
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">مدارس بدون مدير مسجل</p>
                  </div>
                </div>
                <span className={`text-xl font-black ${leadersAnalysis.missingDirector > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{leadersAnalysis.missingDirector}</span>
              </div>

              <div className={`p-4 rounded-xl flex items-center justify-between border ${leadersAnalysis.missingSecurity > 0 ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">مسؤولي الأمن</h4>
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">مدارس لا يوجد بها مسؤول أمن</p>
                  </div>
                </div>
                <span className={`text-xl font-black ${leadersAnalysis.missingSecurity > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{leadersAnalysis.missingSecurity}</span>
              </div>

              <div className={`p-4 rounded-xl flex items-center justify-between border ${leadersAnalysis.missingAgents > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👨‍💼</span>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">الوكلاء (طلاب/عاملين)</h4>
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">مدارس بدون أي وكلاء مسجلين</p>
                  </div>
                </div>
                <span className={`text-xl font-black ${leadersAnalysis.missingAgents > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{leadersAnalysis.missingAgents}</span>
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {/* مصفوفة العجز والزيادة التفصيلية للمدارس */}
        {activeTab === 'schools_shortage' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <span>🏫</span> كشف العجز والزيادة الفعلي (على مستوى كل مدرسة)
              </h3>
              <p className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">الفرز والتحليل مبني على المدارس الفردية</p>
            </div>
            
            <div className="space-y-4">
              {schoolBySchoolAnalysis.map(school => (
                <div key={school.id} className="border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-3 border-b border-slate-50 pb-3">
                    <div>
                      <h4 className="font-black text-indigo-900 text-lg">{school.school_name}</h4>
                      <p className="text-xs font-bold text-slate-400 mt-1">{school.school_type} | {school.schoolClasses} فصل</p>
                    </div>
                    <div className="flex gap-3 text-sm font-black text-center" dir="ltr">
                      <div className="bg-red-50 text-red-700 px-4 py-2 rounded-xl">Deficit: -{school.schoolDeficit}</div>
                      <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl">Surplus: +{school.schoolSurplus}</div>
                    </div>
                  </div>
                  
                  {school.subjectDetails.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {school.subjectDetails.map(sub => (
                        <span key={sub.subject} className={`px-3 py-1.5 rounded-lg text-xs font-black border
                          ${sub.netTeachers < 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          {sub.subject}: {sub.netTeachers < 0 ? `عجز (${sub.netTeachers})` : `زيادة (+${sub.netTeachers})`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-slate-400">لا يوجد عجز أو زيادة في أي مادة (الأنصبة مستقرة)</p>
                  )}
                </div>
              ))}
              {schoolBySchoolAnalysis.length === 0 && (
                <div className="text-center py-10 text-slate-400 font-bold">لا توجد مدارس مطابقة للبحث</div>
              )}
            </div>
          </div>
        )}

        {/* الكشوف التفصيلية للعاملين */}
        {activeTab === 'staff_list' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <span>📋</span> كشف العاملين الشامل
              </h3>
            </div>
            
            {/* شريط الفرز המتقدم لكشف العاملين */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">النوعية (الفئة)</label>
                <select value={staffCategoryFilter} onChange={e => setStaffCategoryFilter(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none">
                  <option value="all">الكل</option>
                  {uniqueCategories.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">التخصص / طبيعة العمل</label>
                <select value={staffSubjectFilter} onChange={e => setStaffSubjectFilter(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none">
                  <option value="all">الكل</option>
                  {uniqueSubjects.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">نوع التعيين</label>
                <select value={staffEmploymentFilter} onChange={e => setStaffEmploymentFilter(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none">
                  <option value="all">الكل</option>
                  {uniqueEmployments.map(e => <option key={e as string} value={e as string}>{e as string}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-black">الاسم</th>
                    <th className="px-4 py-3 font-black">الرقم القومي</th>
                    <th className="px-4 py-3 font-black">المدرسة التابع لها</th>
                    <th className="px-4 py-3 font-black">الفئة</th>
                    <th className="px-4 py-3 font-black">التخصص/العمل</th>
                    <th className="px-4 py-3 font-black">المؤهل وتاريخه</th>
                    <th className="px-4 py-3 font-black">تاريخ التعيين</th>
                    <th className="px-4 py-3 font-black">نوع التعيين</th>
                    <th className="px-4 py-3 font-black">الكادر</th>
                    <th className="px-4 py-3 font-black">الحالة/الوضع</th>
                    <th className="px-4 py-3 font-black">الهاتف</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStaff.length > 0 ? displayStaff.map(s => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3 font-bold text-slate-800">{s.full_name_ar}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{s.national_id}</td>
                      <td className="px-4 py-3 font-bold text-slate-600 text-xs">{schools.find(sch => sch.id === s.school_id)?.school_name_ar || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${s.job_category === 'معلم' ? 'bg-blue-50 text-blue-600' : s.job_category === 'إداري' ? 'bg-purple-50 text-purple-600' : 'bg-amber-50 text-amber-600'}`}>
                          {s.job_category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-600 text-xs">{s.subject_taught || s.school_role || s.worker_type || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {s.qualification ? `${s.qualification} (${s.qualification_date || 'بدون تاريخ'})` : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{s.hire_date || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{s.employment_type || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{s.cadre_position || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${s.assignment_status === 'منتدب' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-emerald-50 text-emerald-600'}`}>
                          {s.assignment_status || 'أصلي'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{s.phone || '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={11} className="text-center py-10 font-bold text-slate-400">لا يوجد موظفين يطابقون خيارات الفرز الحالية</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* سجل القيادات */}
        {activeTab === 'leaders_list' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <span>🛡️</span> سجل القيادات المدرسية
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-black">الاسم</th>
                    <th className="px-4 py-3 font-black">المسمى القيادي</th>
                    <th className="px-4 py-3 font-black">المدرسة التابع لها</th>
                    <th className="px-4 py-3 font-black">الرقم القومي</th>
                    <th className="px-4 py-3 font-black">المؤهل وتاريخه</th>
                    <th className="px-4 py-3 font-black">تاريخ التعيين</th>
                    <th className="px-4 py-3 font-black">الهاتف</th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.filter(l => filteredSchoolIds.has(l.school_id)).length > 0 ? 
                    leaders.filter(l => filteredSchoolIds.has(l.school_id)).map(l => (
                    <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3 font-bold text-slate-800">{l.full_name_ar}</td>
                      <td className="px-4 py-3 font-bold text-indigo-600 text-xs">{l.job_title}</td>
                      <td className="px-4 py-3 font-bold text-slate-600 text-xs">
                        {schools.find(s => s.id === l.school_id)?.school_name_ar || 'غير معروف'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{l.national_id}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {l.qualification ? `${l.qualification} (${l.qualification_date || 'بدون تاريخ'})` : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{l.hire_date || '-'}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{l.phone || '-'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-400 font-bold">لا يوجد قيادات مسجلة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
