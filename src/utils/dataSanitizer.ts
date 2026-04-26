/**
 * قاموس توحيد البيانات (Data Sanitization & Normalization Dictionary)
 * يضمن عدم وجود تكرارات عشوائية في التصنيفات المختلفة.
 */

import { normalizeArabic } from './textNormalization';

// ─── 1. خريطة المواد الدراسية ──────────────────────────────────────────
const SUBJECTS_MAP: Record<string, string> = {
  'عربي': 'اللغة العربية',
  'لغه عربيه': 'اللغة العربية',
  'حساب': 'رياضيات',
  'رياضه': 'رياضيات',
  'انجليزي': 'اللغة الإنجليزية',
  'انجلش': 'اللغة الإنجليزية',
  'فرنساوي': 'اللغة الفرنسية',
  'علوم': 'علوم',
  'دراسات': 'دراسات اجتماعية',
  'دين': 'تربية دينية إسلامية',
  'دين اسلامي': 'تربية دينية إسلامية',
  'دين مسيحي': 'تربية دينية مسيحية',
  'حاسب': 'حاسب آلي',
  'كمبيوتر': 'حاسب آلي',
  'العاب': 'تربية رياضية',
  'رياضيه': 'تربية رياضية',
  'رسم': 'تربية فنية',
  'موسيقي': 'تربية موسيقية',
  'اقتصاد': 'اقتصاد منزلي',
  'زراعه': 'مجال زراعي',
  'صناعه': 'مجال صناعي',
};

// ─── 2. خريطة الكوادر الوظيفية ─────────────────────────────────────────
const CADRE_MAP: Record<string, string> = {
  'معلم مساعد': 'معلم مساعد',
  'معلم': 'معلم',
  'معلم اول': 'معلم أول',
  'معلم اول ا': 'معلم أول أ',
  'معلم خبير': 'معلم خبير',
  'كبير معلمين': 'كبير معلمين',
  'بدون كادر': 'بدون كادر',
  'غير مخاطب': 'غير مخاطب',
};

// ─── 3. خريطة المسميات الوظيفية (للقيادات) ───────────────────────────
const JOB_TITLE_MAP: Record<string, string> = {
  'مدير': 'مدير',
  'ناظر': 'مدير',
  'وكيل': 'وكيل',
  'وكيل عاملون': 'وكيل شئون العاملين',
  'وكيل طلاب': 'وكيل شئون الطلاب',
  'احصاء': 'مسئول الإحصاء',
  'دمج': 'مسئول الدمج',
  'قرائيه': 'مسئول القرائية',
  'تدريب': 'مسئول وحدة التدريب',
  'كنترول': 'رئيس الكنترول',
};

// ─── 4. خريطة أنواع التعيين ───────────────────────────────────────────
const APPOINTMENT_MAP: Record<string, string> = {
  'اساسي': 'أساسي',
  'تعيين': 'أساسي',
  'اجر': 'بالأجر',
  'بالاجر': 'بالأجر',
  'حصه': 'بالأجر',
  'بالحصه': 'بالأجر',
  'معاش': 'معاش',
};

// ─── 5. خريطة أنواع الإعاقة ───────────────────────────────────────────
const DISABILITY_MAP: Record<string, string> = {
  'ذهني': 'ذهني',
  'سمعي': 'سمعي',
  'بصري': 'بصري',
  'حركي': 'حركي',
  'متعدد': 'متعدد',
};

// ─── دوال التطهير (Sanitizers) ───────────────────────────────────────

function sanitizeGeneric(input: string | null | undefined, map: Record<string, string>, defaultValue: string): string {
  if (!input) return defaultValue;
  const normalized = normalizeArabic(input);
  
  // 1. بحث عن تطابق كامل في المفاتيح الموحدة
  for (const [key, value] of Object.entries(map)) {
    if (normalized.includes(normalizeArabic(key)) || normalizeArabic(key).includes(normalized)) {
      return value;
    }
  }
  
  return input.trim();
}

export function sanitizeSubject(input: string | null | undefined): string {
  return sanitizeGeneric(input, SUBJECTS_MAP, '');
}

export function sanitizeCadre(input: string | null | undefined): string {
  return sanitizeGeneric(input, CADRE_MAP, 'بدون كادر');
}

export function sanitizeJobTitle(input: string | null | undefined): string {
  return sanitizeGeneric(input, JOB_TITLE_MAP, 'مدير');
}

export function sanitizeAppointment(input: string | null | undefined): string {
  return sanitizeGeneric(input, APPOINTMENT_MAP, 'أساسي');
}

export function sanitizeDisability(input: string | null | undefined): string {
  return sanitizeGeneric(input, DISABILITY_MAP, 'ذهني');
}

export function sanitizeQualification(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/بكلوريوس|بكلريوس/g, 'بكالوريوس')
    .replace(/\s+/g, ' ');
}

export const STANDARD_SUBJECTS = [
  'اللغة العربية', 'اللغة الإنجليزية', 'اللغة الفرنسية', 'اللغة الألمانية',
  'رياضيات', 'علوم', 'دراسات اجتماعية', 'تاريخ', 'جغرافيا',
  'فيزياء', 'كيمياء', 'أحياء', 'فلسفة', 'علم نفس',
  'حاسب آلي', 'تربية دينية إسلامية', 'تربية دينية مسيحية',
  'تربية رياضية', 'تربية فنية', 'تربية موسيقية', 
  'اقتصاد منزلي', 'مجال زراعي', 'مجال صناعي',
  'رياض أطفال', 'معلم فصل', 'أخصائي اجتماعي', 'أخصائي نفسي', 'أخصائي تكنولوجيا', 'أخصائي مكتبات', 'أخرى'
];
