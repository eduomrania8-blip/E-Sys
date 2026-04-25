// src/services/excelImporter.ts
// محرك Excel الذكي v2.0 — مُعاد كتابته بالكامل
// يدعم المرحلة الابتدائية حالياً + معمارية قابلة للتوسع للمراحل الأخرى

import * as XLSX from 'xlsx';
import { sanitizeSubject, sanitizeQualification } from '@/utils/dataSanitizer';

// ─── أنواع البيانات ────────────────────────────────────────────────

export interface SheetResult {
  sheetId: string;
  label: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  count?: number;
  data?: Record<string, unknown>[];
  warnings?: string[];    // تحذيرات غير قاتلة (صفوف تم تخطيها مع السبب)
}

export interface ImportSession {
  schoolCode: string;
  requestedSheets: string[];
  results: SheetResult[];
}

// ─── معمارية المراحل التعليمية (قابل للتوسع مستقبلاً) ──────────────

export type EducationStage = 'primary' | 'preparatory' | 'secondary' | 'kg';

interface GradeConfig {
  key: string;         // القيمة المحفوظة في DB
  stage: EducationStage;
  aliases: string[];   // كل الأشكال المحتملة في Excel
}

export const GRADE_CONFIGS: GradeConfig[] = [
  // مرحلة KG
  { key: 'KG1', stage: 'kg', aliases: ['kg1', 'كجي 1', 'كى جى 1', 'كيجي 1', 'روضة أولى', 'الروضة الأولى'] },
  { key: 'KG2', stage: 'kg', aliases: ['kg2', 'كجي 2', 'كى جى 2', 'كيجي 2', 'روضة ثانية', 'الروضة الثانية'] },
  // المرحلة الابتدائية (الفعّالة حالياً)
  { key: 'الأول', stage: 'primary', aliases: ['الأول الابتدائي', 'أول ابتدائي', '1 ابتدائي', 'الصف الأول'] },
  { key: 'الثاني', stage: 'primary', aliases: ['الثاني الابتدائي', 'ثاني ابتدائي', '2 ابتدائي', 'الصف الثاني'] },
  { key: 'الثالث', stage: 'primary', aliases: ['الثالث الابتدائي', 'ثالث ابتدائي', '3 ابتدائي', 'الصف الثالث'] },
  { key: 'الرابع', stage: 'primary', aliases: ['الرابع الابتدائي', 'رابع ابتدائي', '4 ابتدائي', 'الصف الرابع'] },
  { key: 'الخامس', stage: 'primary', aliases: ['الخامس الابتدائي', 'خامس ابتدائي', '5 ابتدائي', 'الصف الخامس'] },
  { key: 'السادس', stage: 'primary', aliases: ['السادس الابتدائي', 'سادس ابتدائي', '6 ابتدائي', 'الصف السادس'] },
  // المرحلة الإعدادية (غير فعّالة الآن لكن معرَّفة للمستقبل)
  { key: 'الأول اعدادي', stage: 'preparatory', aliases: ['الأول الإعدادي', 'أول إعدادي', '1 إعدادي'] },
  { key: 'الثاني اعدادي', stage: 'preparatory', aliases: ['الثاني الإعدادي', 'ثاني إعدادي', '2 إعدادي'] },
  { key: 'الثالث اعدادي', stage: 'preparatory', aliases: ['الثالث الإعدادي', 'ثالث إعدادي', '3 إعدادي'] },
  // المرحلة الثانوية (غير فعّالة الآن لكن معرَّفة للمستقبل)
  { key: 'الأول ثانوي', stage: 'secondary', aliases: ['الأول الثانوي', 'أول ثانوي', '1 ثانوي'] },
  { key: 'الثاني ثانوي', stage: 'secondary', aliases: ['الثاني الثانوي', 'ثاني ثانوي', '2 ثانوي'] },
  { key: 'الثالث ثانوي', stage: 'secondary', aliases: ['الثالث الثانوي', 'ثالث ثانوي', '3 ثانوي'] },
];

// الصفوف المفعّلة حالياً (ابتدائي + KG)
export const ACTIVE_STAGES: EducationStage[] = ['primary', 'kg'];
export const ACTIVE_GRADES = GRADE_CONFIGS.filter(g => ACTIVE_STAGES.includes(g.stage));
export const ALL_GRADES = GRADE_CONFIGS;

// ─── دالة normalizeGradeLevel المُصلَحة ──────────────────────────────
// الفرق الجوهري: ترجع null بدلاً من 'الأول' للقيم الغير معروفة
// هذا يمنع Duplicate Key في قاعدة البيانات

export function normalizeGradeLevel(val: string | null | undefined): string | null {
  if (!val || val.trim().length < 2) return null;

  const s = val
    .trim()
    .replace(/أ/g, 'ا').replace(/إ/g, 'ا').replace(/آ/g, 'ا')
    .replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  // 1. تطابق مباشر مع المفتاح
  for (const g of GRADE_CONFIGS) {
    if (s === g.key.toLowerCase() || s === g.key.replace(/أ/g,'ا').replace(/إ/g,'ا').toLowerCase()) {
      return g.key;
    }
  }

  // 2. تطابق مع الـ aliases
  for (const g of GRADE_CONFIGS) {
    for (const alias of g.aliases) {
      const normAlias = alias.replace(/أ/g,'ا').replace(/إ/g,'ا').replace(/آ/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase();
      if (s.includes(normAlias) || normAlias.includes(s)) return g.key;
    }
  }

  // 3. كشف بالأرقام والكلمات المفتاحية
  const hasKG  = s.includes('kg') || s.includes('كج') || s.includes('روض');
  const hasNum = (n: string) => s.includes(n);

  if (hasKG) {
    if (hasNum('2')) return 'KG2';
    return 'KG1';
  }
  if (s.includes('ثانو')) {
    if (hasNum('3') || s.includes('ثالث')) return 'الثالث ثانوي';
    if (hasNum('2') || s.includes('ثاني')) return 'الثاني ثانوي';
    return 'الأول ثانوي';
  }
  if (s.includes('اعداد') || s.includes('اعدادي')) {
    if (hasNum('3') || s.includes('ثالث')) return 'الثالث اعدادي';
    if (hasNum('2') || s.includes('ثاني')) return 'الثاني اعدادي';
    return 'الأول اعدادي';
  }
  // ابتدائي ← البحث بالأرقام والكلمات العربية
  if (s.includes('سادس') || hasNum('6')) return 'السادس';
  if (s.includes('خامس') || hasNum('5')) return 'الخامس';
  if (s.includes('رابع') || hasNum('4')) return 'الرابع';
  if (s.includes('ثالث') || hasNum('3')) return 'الثالث';
  if (s.includes('ثاني') || hasNum('2')) return 'الثاني';
  if (s.includes('اول') || hasNum('1')) return 'الأول';

  // ← القيمة غير معروفة: null بدلاً من الخطأ السابق
  return null;
}

// ─── خريطة أسماء الأوراق ──────────────────────────────────────────

const SHEET_NAME_MAP: Record<string, string> = {
  'بيانات أساسية': 'basic', 'البيانات الأساسية': 'basic', 'بيانات المدرسة': 'basic', 'أساسي': 'basic', 'basic': 'basic',
  'القيادات': 'leaders', 'قيادات': 'leaders', 'القيادات المدرسية': 'leaders', 'leaders': 'leaders',
  'إحصاءات': 'stats', 'الإحصاءات': 'stats', 'إحصاءات الصفوف': 'stats', 'الصفوف': 'stats', 'stats': 'stats', 'statistics': 'stats', 'كثافة': 'stats',
  'الضعاف': 'low_performers', 'ضعاف': 'low_performers', 'كشف الضعاف': 'low_performers', 'ضعيف': 'low_performers', 'low': 'low_performers', 'الضعيف': 'low_performers',
  'الدمج': 'inclusion', 'دمج': 'inclusion', 'كشف الدمج': 'inclusion', 'ذوي الإعاقة': 'inclusion', 'inclusion': 'inclusion',
  'الوافدين': 'expatriates', 'وافدين': 'expatriates', 'كشف الوافدين': 'expatriates', 'expatriates': 'expatriates',
  'اللاجئين': 'refugees', 'لاجئين': 'refugees', 'كشف اللاجئين': 'refugees', 'refugees': 'refugees',
  'المبنى': 'building', 'مبنى': 'building', 'بيانات المبنى': 'building', 'building': 'building',
  'العاملون': 'staff', 'العاملين': 'staff', 'عاملون': 'staff', 'المعلمون': 'staff', 'staff': 'staff', 'هيئة التدريس': 'staff',
};

function matchSheetName(name: string): string | null {
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (SHEET_NAME_MAP[normalized]) return SHEET_NAME_MAP[normalized];
  for (const [key, id] of Object.entries(SHEET_NAME_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return id;
  }
  return null;
}

// ─── قراءة الملف ────────────────────────────────────────────────────

export function parseExcelBuffer(buffer: Buffer | ArrayBuffer): {
  sheets: Map<string, string[][]>;
  sheetNames: string[];
} {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets = new Map<string, string[][]>();
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as unknown[][];
    const rows = rawRows.map(row =>
      (row as unknown[]).map(c => String(c ?? '').trim())
    );
    sheets.set(name, rows);
  }
  return { sheets, sheetNames: workbook.SheetNames };
}

// ─── الكلمات الدالة على أعمدة الإجمالي (تُتخطى) ──────────────────────
// هذا هو الإصلاح الجوهري الثاني — منع قراءة الأعمدة المحسوبة

const SUMMARY_COLUMN_KEYWORDS = [
  'المجموع', 'الإجمالي', 'إجمالي', 'مجموع', 'الجملة', 'جملة', 'total', 'sum',
];

function isSummaryColumn(header: string): boolean {
  const h = header.trim().toLowerCase();
  return SUMMARY_COLUMN_KEYWORDS.some(k =>
    h.includes(k.toLowerCase())
  );
}

// ─── كشف صف العناوين بشكل صارم ───────────────────────────────────────
// الإصلاح الجوهري الثالث: يشترط وجود 3+ مفاتيح حتى يُعترف به كـ header

const STATS_HEADER_KEYWORDS = [
  'صف', 'الصف', 'فصول', 'الفصول', 'بنين', 'بنات', 'ذكور', 'إناث',
  'مسلم', 'مسيحي', 'دمج', 'وافد', 'تسرب', 'منقطع', 'راسب',
];

function detectStatsHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const rowText = rows[i].join(' ');
    const matchCount = STATS_HEADER_KEYWORDS.filter(k => rowText.includes(k)).length;
    if (matchCount >= 3) return i;
  }
  return -1;
}

// ─── parseStatsSheet المُصلَح ──────────────────────────────────────────

function parseStatsSheet(rows: string[][]): { data: Record<string, unknown>[]; warnings: string[] } {
  const data: Record<string, unknown>[] = [];
  const warnings: string[] = [];

  const headerIdx = detectStatsHeaderRow(rows);
  if (headerIdx === -1) return { data, warnings: ['لم يتم التعرف على صف العناوين — تأكد من وجود (الصف، بنين، بنات، الفصول) في سطر واحد'] };

  const hdr = rows[headerIdx];

  // دالة البحث عن عمود مع استبعاد أعمدة الإجمالي
  const colOf = (keywords: string[]): number => {
    for (let ci = 0; ci < hdr.length; ci++) {
      const h = hdr[ci];
      if (!h || isSummaryColumn(h)) continue;
      if (keywords.some(k => h.includes(k))) return ci;
    }
    return -1;
  };

  const gradeCol    = colOf(['الصف', 'المرحلة', 'اسم الصف']);
  const classesCol  = colOf(['عدد الفصول', 'الفصول', 'فصل']);
  const boysCol     = colOf(['بنين', 'ذكور']);
  const girlsCol    = colOf(['بنات', 'إناث']);
  const muslimCol   = colOf(['مسلم', 'إسلام']);
  const christianCol= colOf(['مسيحي', 'مسيح']);
  const mentalCol   = colOf(['ذهني']);
  const hearingCol  = colOf(['سمعي']);
  const visualCol   = colOf(['بصري']);
  const physicalCol = colOf(['حركي']);
  const multiCol    = colOf(['متعدد']);
  const expatCol    = colOf(['وافد']);
  const transferCol = colOf(['محول', 'مستجد', 'منقول']);
  const repeatCol   = colOf(['راسب', 'باقٍ', 'معيد']);
  const dropoutCol  = colOf(['تسرب', 'منقطع']);

  const seenGrades = new Set<string>();

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(c => !c)) continue;

    const rawGrade = gradeCol >= 0 ? row[gradeCol] : '';
    const gradeKey = normalizeGradeLevel(rawGrade);

    // ← الإصلاح: تخطي الصف مع تسجيل السبب
    if (!gradeKey) {
      if (rawGrade && rawGrade.trim().length > 1) {
        warnings.push(`تم تخطي صف: "${rawGrade}" — لم يتم التعرف عليه كصف دراسي`);
      }
      continue;
    }

    // منع التكرار في الملف نفسه
    if (seenGrades.has(gradeKey)) {
      warnings.push(`تم تخطي صف مكرر: "${gradeKey}"`);
      continue;
    }

    const boys  = safeInt(row[boysCol]);
    const girls = safeInt(row[girlsCol]);
    const classesCount = safeInt(row[classesCol]);

    // تخطي الصف إذا كان المجموع صفر
    if (classesCount === 0 && boys === 0 && girls === 0) {
      warnings.push(`تم تخطي صف "${gradeKey}" — لا يحتوي على بيانات`);
      continue;
    }

    seenGrades.add(gradeKey);
    data.push({
      grade_level:         gradeKey,
      number_of_classes:   classesCount,
      boys_count:          boys,
      girls_count:         girls,
      muslim_count:        safeInt(row[muslimCol]),
      christian_count:     safeInt(row[christianCol]),
      inclusion_mental:    safeInt(row[mentalCol]),
      inclusion_hearing:   safeInt(row[hearingCol]),
      inclusion_visual:    safeInt(row[visualCol]),
      inclusion_physical:  safeInt(row[physicalCol]),
      inclusion_multiple:  safeInt(row[multiCol]),
      expatriate_count:    safeInt(row[expatCol]),
      transferred_or_new:  safeInt(row[transferCol]),
      retained_for_repeat: safeInt(row[repeatCol]),
      dropout_count:       safeInt(row[dropoutCol]),
    });
  }

  return { data, warnings };
}

// ─── parseStudentList ────────────────────────────────────────────────

function parseStudentList(
  rows: string[][],
  type: 'low' | 'inclusion' | 'expatriate' | 'refugee'
): { data: Record<string, unknown>[]; warnings: string[] } {
  const data: Record<string, unknown>[] = [];
  const warnings: string[] = [];
  let headerIdx = -1;

  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const rowText = rows[i].join(' ');
    if (
      rowText.includes('اسم') &&
      (rowText.includes('صف') || rowText.includes('فصل') || rowText.includes('جنسية') ||
       rowText.includes('رقم') || rowText.includes('تصنيف') || rowText.includes('ملاحظات') ||
       rowText.includes('نوع'))
    ) { headerIdx = i; break; }
  }
  if (headerIdx === -1) {
    return { data, warnings: ['لم يتم التعرف على صف العناوين — تأكد من وجود: اسم الطالب، الصف'] };
  }

  const hdr = rows[headerIdx];
  const colOf = (kw: string[]) => hdr.findIndex(h => kw.some(k => h.includes(k)));

  const nameCol    = colOf(['اسم الطالب', 'الاسم', 'اسم التلميذ', 'اسم']);
  const gradeCol   = colOf(['الصف', 'صف']);
  const classCol   = colOf(['الفصل', 'فصل', 'شعبة']);
  const idCol      = colOf(['رقم قومي', 'الرقم القومي', 'قومى']);
  const countryCol = colOf(['الجنسية', 'جنسية', 'الدولة', 'بلد']);
  const passCol    = colOf(['جواز', 'رقم الجواز']);
  const disCol     = colOf(['نوع الإعاقة', 'الإعاقة', 'اعاقة', 'إعاقة']);
  const classifCol = colOf(['التصنيف', 'تصنيف']);
  const notesCol   = colOf(['ملاحظات', 'ملاحظة']);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(c => !c)) continue;
    const name = nameCol >= 0 ? row[nameCol] : (row[1] ?? row[0] ?? '');
    if (!name || String(name).trim().length < 3) continue;

    const base: Record<string, unknown> = {
      student_full_name: String(name).trim(),
      grade_level: gradeCol >= 0 ? (normalizeGradeLevel(row[gradeCol]) ?? 'الأول') : 'الأول',
      class_name:  classCol >= 0 ? row[classCol] : null,
    };

    if (type === 'low') {
      base.notes = notesCol >= 0 ? row[notesCol] : null;
    } else if (type === 'inclusion') {
      base.national_id     = idCol >= 0 ? row[idCol] : null;
      base.disability_type = disCol >= 0 ? normalizeDisability(row[disCol]) : null;
    } else if (type === 'expatriate') {
      base.passport_number = passCol >= 0 ? row[passCol] : null;
      base.country         = countryCol >= 0 ? row[countryCol] : null;
    } else if (type === 'refugee') {
      base.country                = countryCol >= 0 ? row[countryCol] : null;
      base.refugee_classification = classifCol >= 0 ? normalizeRefugee(row[classifCol]) : null;
    }
    data.push(base);
  }

  return { data, warnings };
}

// ─── parseLeadersSheet ───────────────────────────────────────────────

function parseLeadersSheet(rows: string[][]): { data: Record<string, unknown>[]; warnings: string[] } {
  const data: Record<string, unknown>[] = [];
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i].join(' ');
    if (r.includes('اسم') && (r.includes('مسمى') || r.includes('وظي') || r.includes('رقم') || r.includes('الصفة'))) {
      headerIdx = i; break;
    }
  }
  if (headerIdx === -1) return { data, warnings: ['لم يتم التعرف على جدول القيادات'] };

  const hdr = rows[headerIdx];
  const colOf = (kw: string[]) => hdr.findIndex(h => kw.some(k => h.includes(k)));

  const nameCol  = colOf(['اسم', 'الاسم']);
  const idCol    = colOf(['رقم قومي', 'الرقم القومي', 'قومى']);
  const titleCol = colOf(['الوظيفة', 'المسمى', 'الصفة', 'وظيفة']);
  const phoneCol = colOf(['تليفون', 'هاتف', 'موبايل', 'رقم الهاتف']);
  const cadreCol = colOf(['الكادر', 'كادر']);
  const typeCol  = colOf(['نوع التعيين', 'تعيين', 'نوع']);
  const qualCol  = colOf(['المؤهل', 'مؤهل', 'المؤهل الدراسي']);
  const qualDateCol = colOf(['تاريخ المؤهل', 'سنة المؤهل']);
  const roleCol  = colOf(['العمل المكلف به', 'تكليف', 'العمل']);
  const subCol   = colOf(['مادة', 'التخصص', 'المادة']);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(c => !c)) continue;
    const name = nameCol >= 0 ? row[nameCol] : '';
    const nid  = idCol >= 0 ? row[idCol] : '';
    if (!name || String(name).trim().length < 3) continue;
    const validNid = String(nid).length >= 14 ? String(nid) : ('00000000000000' + Math.floor(Math.random() * 100000)).slice(-14);
    data.push({
      full_name_ar:     String(name).trim(),
      national_id:      validNid,
      job_title:        titleCol >= 0 ? normalizeTitle(row[titleCol]) : 'مدير',
      phone:            phoneCol >= 0 ? row[phoneCol] : null,
      cadre:            cadreCol >= 0 ? row[cadreCol] : null,
      appointment_type: typeCol >= 0 ? normalizeAppointment(row[typeCol]) : null,
      qualification:    qualCol >= 0 ? sanitizeQualification(row[qualCol]) : null,
      qualification_date: qualDateCol >= 0 ? row[qualDateCol] : null,
      school_role:      roleCol >= 0 ? row[roleCol] : null,
      subject_taught:   subCol >= 0 ? sanitizeSubject(row[subCol]) : null,
    });
  }
  return { data, warnings: [] };
}

// ─── parseBuildingSheet ──────────────────────────────────────────────

function parseBuildingSheet(rows: string[][]): Record<string, unknown> | null {
  const kv: Record<string, string> = {};
  for (const row of rows) {
    // القيمة قد تكون في العمود 1 أو 2 أو 3
    for (let ci = 1; ci < Math.min(row.length, 5); ci++) {
      if (row[0] && row[ci] && row[ci].trim()) {
        kv[row[0].trim()] = row[ci].trim();
        break;
      }
    }
  }

  const findKey = (keys: string[]): string | null => {
    for (const k of keys) for (const [rawK, v] of Object.entries(kv)) {
      if (rawK.includes(k)) return v;
    }
    return null;
  };

  return {
    building_status:      normalizeBuildingStatus(findKey(['حالة المبنى', 'حالة المبني', 'حالة'])),
    actual_classrooms:    safeInt(findKey(['عدد الفصول', 'الفصول الدراسية', 'فصول', 'الفصول'])),
    admin_rooms:          safeInt(findKey(['غرف إدارية', 'إدارية', 'الغرف الإدارية'])),
    total_labs:           safeInt(findKey(['معامل', 'معمل', 'المعامل', 'عدد المعامل'])),
    activity_rooms:       safeInt(findKey(['أنشطة', 'نشاط', 'غرف النشاط'])),
    playgrounds:          safeInt(findKey(['ملعب', 'ملاعب', 'الملاعب'])),
    boys_toilets:         safeInt(findKey(['دورات مياه بنين', 'دورات بنين', 'حمامات بنين', 'بنين'])),
    girls_toilets:        safeInt(findKey(['دورات مياه بنات', 'دورات بنات', 'حمامات بنات', 'بنات'])),
    staff_toilets:        safeInt(findKey(['دورات هيئة', 'حمامات هيئة', 'هيئة'])),
    surveillance_cameras: safeInt(findKey(['كاميرات', 'مراقبة', 'كاميرات مراقبة'])),
    fence_condition:      normalizeFence(findKey(['السور', 'حالة السور', 'سور']) ?? ''),
    has_landline:
      (findKey(['تليفون أرضي', 'خط أرضي', 'أرضي']) ?? '').includes('نعم') ||
      (findKey(['تليفون أرضي', 'خط أرضي', 'أرضي']) ?? '').includes('يوجد'),
    has_internet:
      (findKey(['إنترنت', 'انترنت', 'الإنترنت']) ?? '').includes('نعم') ||
      (findKey(['إنترنت', 'انترنت', 'الإنترنت']) ?? '').includes('يوجد'),
  };
}

// ─── parseStaffSheet ───────────────────────────────────────────────

function parseStaffSheet(rows: string[][]): { data: Record<string, unknown>[]; warnings: string[] } {
  const data: Record<string, unknown>[] = [];
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i].join(' ');
    if (r.includes('اسم') && (r.includes('فئة') || r.includes('رقم') || r.includes('حالة') || r.includes('مؤهل') || r.includes('تصنيف'))) {
      headerIdx = i; break;
    }
  }
  if (headerIdx === -1) return { data, warnings: ['لم يتم التعرف على جدول العاملين'] };

  const hdr = rows[headerIdx];
  const colOf = (kw: string[]) => hdr.findIndex(h => kw.some(k => h.includes(k)));

  const nameCol   = colOf(['اسم', 'الاسم']);
  const idCol     = colOf(['رقم قومي', 'الرقم القومي', 'قومى']);
  const catCol    = colOf(['الفئة', 'فئة', 'التصنيف', 'نوع الوظيفة']);
  const qualCol   = colOf(['المؤهل', 'مؤهل', 'المؤهل الدراسي']);
  const qualDateCol = colOf(['تاريخ المؤهل', 'سنة المؤهل']);
  const hireDateCol = colOf(['تاريخ التعيين', 'تاريخ العمل']);
  const statusCol = colOf(['حالة الخدمة', 'الحالة', 'حالة', 'الوضع']);
  const phoneCol  = colOf(['تليفون', 'هاتف', 'موبايل', 'رقم الهاتف']);
  
  // حقول جديدة حسب الهيكلة
  const subCol    = colOf(['مادة', 'التخصص', 'المادة']);
  const roleCol   = colOf(['العمل المكلف به', 'تكليف', 'العمل']);
  const workerCol = colOf(['نوع العامل', 'تخصيص العامل', 'طبيعة العامل']);
  const typeCol   = colOf(['نوع التعيين', 'التعيين']);
  const cadreCol  = colOf(['الكادر', 'الوظيفة على الكادر']);
  const assignCol = colOf(['الوضع', 'أصلي', 'منتدب']);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(c => !c)) continue;
    const name = nameCol >= 0 ? row[nameCol] : '';
    const nid  = idCol >= 0 ? row[idCol] : '';
    if (!name || String(name).trim().length < 3) continue;
    const validNid = String(nid).length >= 14 ? String(nid) : ('00000000000000' + Math.floor(Math.random() * 100000)).slice(-14);
    
    const cat = catCol >= 0 ? normalizeCategory(row[catCol]) : 'عامل';
    
    data.push({
      full_name_ar:  String(name).trim(),
      national_id:   validNid,
      job_category:  cat,
      qualification: qualCol >= 0 ? sanitizeQualification(row[qualCol]) : null,
      qualification_date: qualDateCol >= 0 ? row[qualDateCol] : null,
      hire_date: hireDateCol >= 0 ? row[hireDateCol] : null,
      school_role: roleCol >= 0 ? row[roleCol] : null,
      subject_taught: cat === 'معلم' && subCol >= 0 ? sanitizeSubject(row[subCol]) : null,
      worker_type: cat === 'عامل' && workerCol >= 0 ? row[workerCol] : null,
      cadre_position: cadreCol >= 0 ? row[cadreCol] : null,
      employment_type: typeCol >= 0 ? row[typeCol] : 'تعيين',
      assignment_status: assignCol >= 0 ? (row[assignCol].includes('منتدب') ? 'منتدب' : 'أصل') : 'أصل',
      work_status:   statusCol >= 0 ? normalizeWorkStatus(row[statusCol]) : 'على رأس العمل',
      phone:         phoneCol >= 0 ? row[phoneCol] : null,
    });
  }
  return { data, warnings: [] };
}

// ─── المعالج الرئيسي ────────────────────────────────────────────────

export function processExcelFile(
  buffer: Buffer | ArrayBuffer,
  requestedSheets: string[]
): ImportSession {
  const { sheets, sheetNames } = parseExcelBuffer(buffer);
  const results: SheetResult[] = [];

  // بناء خريطة sheetId → rows مع أفضل تطابق
  const sheetMap = new Map<string, string[][]>();
  for (const name of sheetNames) {
    const matched = matchSheetName(name);
    if (matched && requestedSheets.includes(matched) && !sheetMap.has(matched)) {
      sheetMap.set(matched, sheets.get(name)!);
    }
  }

  // fallback: إذا لم توجد أوراق مطابقة + طُلبت ورقة واحدة → اقرأ الورقة الأولى
  if (sheetMap.size === 0 && requestedSheets.length === 1 && sheetNames.length >= 1) {
    sheetMap.set(requestedSheets[0], sheets.get(sheetNames[0])!);
  }

  // fallback ثانوي: اقرأ كل الأوراق وجرّب تطابق كل واحدة
  if (sheetMap.size < requestedSheets.length) {
    for (const name of sheetNames) {
      const matched = matchSheetName(name);
      if (matched && requestedSheets.includes(matched) && !sheetMap.has(matched)) {
        sheetMap.set(matched, sheets.get(name)!);
      }
    }
  }

  for (const sheetId of requestedSheets) {
    const rows = sheetMap.get(sheetId);
    const label = getSheetLabel(sheetId);

    if (!rows) {
      results.push({
        sheetId, label, status: 'skipped',
        message: `لم يتم العثور على ورقة "${label}" في الملف (الأوراق الموجودة: ${sheetNames.join('، ')})`,
      });
      continue;
    }

    try {
      let parsed: { data: Record<string, unknown>[]; warnings: string[] } | null = null;

      switch (sheetId) {
        case 'stats':         parsed = parseStatsSheet(rows); break;
        case 'low_performers':parsed = parseStudentList(rows, 'low'); break;
        case 'inclusion':     parsed = parseStudentList(rows, 'inclusion'); break;
        case 'expatriates':   parsed = parseStudentList(rows, 'expatriate'); break;
        case 'refugees':      parsed = parseStudentList(rows, 'refugee'); break;
        case 'leaders':       parsed = parseLeadersSheet(rows); break;
        case 'building': {
          const bld = parseBuildingSheet(rows);
          parsed = { data: bld ? [bld] : [], warnings: [] };
          break;
        }
        case 'staff':         parsed = parseStaffSheet(rows); break;
        default:
          results.push({ sheetId, label, status: 'skipped', message: 'نوع غير مدعوم' });
          continue;
      }

      if (!parsed.data || parsed.data.length === 0) {
        results.push({
          sheetId, label, status: 'skipped',
          message: 'لم يتم العثور على بيانات صالحة في هذه الورقة',
          warnings: parsed.warnings,
        });
      } else {
        results.push({
          sheetId, label, status: 'success',
          message: `تم استخراج ${parsed.data.length} صف`,
          count: parsed.data.length,
          data: parsed.data,
          warnings: parsed.warnings,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ sheetId, label, status: 'error', message: `خطأ في المعالجة: ${msg}` });
    }
  }

  return { schoolCode: '', requestedSheets, results };
}

// ─── دوال المساعدة ──────────────────────────────────────────────────

function safeInt(val: string | undefined | null): number {
  if (!val) return 0;
  const n = parseInt(String(val).replace(/[^\d-]/g, ''), 10);
  return isNaN(n) ? 0 : Math.max(0, n);
}

function getSheetLabel(id: string): string {
  const map: Record<string, string> = {
    basic: 'البيانات الأساسية', leaders: 'القيادات', stats: 'إحصاءات الصفوف',
    low_performers: 'كشف الضعاف', inclusion: 'كشف الدمج', expatriates: 'كشف الوافدين',
    refugees: 'كشف اللاجئين', building: 'بيانات المبنى', staff: 'العاملون',
  };
  return map[id] ?? id;
}

function normalizeDisability(val: string): string | null {
  if (!val) return null;
  if (val.includes('ذهن')) return 'ذهني';
  if (val.includes('سمع')) return 'سمعي';
  if (val.includes('بصر')) return 'بصري';
  if (val.includes('حرك')) return 'حركي';
  if (val.includes('متعدد')) return 'متعدد';
  return val.trim() || null;
}

function normalizeRefugee(val: string): string {
  if (!val) return 'أخرى';
  if (val.includes('سور')) return 'سوري';
  if (val.includes('فلسطين')) return 'فلسطيني';
  if (val.includes('سودان')) return 'سوداني';
  if (val.includes('يمن')) return 'يمني';
  if (val.includes('أجنب') || val.includes('اجنب')) return 'أجنبي';
  return 'أخرى';
}

function normalizeTitle(val: string): string {
  if (!val) return 'مدير';
  if (val.includes('مدير')) return 'مدير';
  if (val.includes('عامل'))  return 'وكيل شئون العاملين';
  if (val.includes('طلاب') || val.includes('طلب')) return 'وكيل شئون الطلاب';
  if (val.includes('إحصاء') || val.includes('احصاء')) return 'مسئول الإحصاء';
  if (val.includes('دمج'))   return 'مسئول الدمج';
  if (val.includes('قرائية'))return 'مسئول القرائية';
  if (val.includes('تدريب')) return 'مسئول وحدة التدريب';
  if (val.includes('كنترول'))return 'رئيس الكنترول';
  return val.trim() || 'مدير';
}

function normalizeAppointment(val: string): string | null {
  if (!val) return null;
  if (val.includes('أساسي') || val.includes('اساسي')) return 'أساسي';
  if (val.includes('أجر') || val.includes('اجر')) return 'بالأجر';
  if (val.includes('معاش')) return 'معاش';
  return null;
}

function normalizeCategory(val: string): string {
  if (!val) return 'عامل';
  if (val.includes('معلم') || val.includes('مدرس')) return 'معلم';
  if (val.includes('إداري') || val.includes('اداري')) return 'إداري';
  return 'عامل';
}

function normalizeWorkStatus(val: string): string {
  if (!val) return 'على رأس العمل';
  if (val.includes('معاش')) return 'بالمعاش';
  if (val.includes('أجر') || val.includes('اجر')) return 'بالأجر';
  if (val.includes('منتدب')) return 'منتدب';
  if (val.includes('إجازة') || val.includes('اجازة')) return 'إجازة';
  if (val.includes('نصف') || val.includes('الوقت')) return 'نصف الوقت';
  return 'على رأس العمل';
}

function normalizeBuildingStatus(val: string | null): string {
  if (!val) return 'مستقل';
  const s = val.replace(/أ/g, 'ا').trim();
  if (s.includes('يعمل') || s.includes('مدارس') || s.includes('مشترك') || s.includes('اخرى')) {
    return 'يعمل مع مدارس أخرى';
  }
  return 'مستقل';
}

function normalizeFence(val: string): string {
  if (!val) return 'غير موجود';
  if (val.includes('جيد') || val.includes('سليم') || val.includes('ممتاز') || val.includes('كامل')) return 'جيد';
  if (val.includes('صيانة') || val.includes('متصدع') || val.includes('متهالك') || val.includes('جزئي')) return 'يحتاج صيانة';
  return 'غير موجود';
}
