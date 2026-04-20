// src/services/excelParser.ts
// Parses uploaded Excel files into structured data.
// Validates header rows and column structure.

import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { ParsedExcelData, ParsedStudent } from '@/types';

// ── Validation schemas ───────────────────────────────────────
const StudentRowSchema = z.object({
  name: z.string().min(2, 'اسم الطالب قصير جداً'),
  grade: z.string().min(1),
  classRoom: z.string(),
});

export interface ParseResult {
  success: true;
  data: ParsedExcelData;
}
export interface ParseError {
  success: false;
  error: string;
}
export type ParseOutcome = ParseResult | ParseError;

// ── Keyword matchers ─────────────────────────────────────────
const matches = (cell: string, keywords: string[]) =>
  keywords.some((k) => cell.toLowerCase().includes(k));

const isDistrictRow = (row: string[]) =>
  row.some((c) => matches(c, ['الإدارة', 'إداره', 'اداره', 'ادارة']));

const isSchoolRow = (row: string[]) =>
  row.some((c) => matches(c, ['المدرسة', 'المدرسه']));

const isAddressRow = (row: string[]) =>
  row.some((c) => matches(c, ['العنوان']));

const isHeaderRow = (row: string[]) =>
  row.some((c) => matches(c, ['اسم التلميذ', 'اسم الطالب', 'اسم التلميه', 'اسم'])) &&
  row.some((c) => matches(c, ['الصف', 'صف']));

/**
 * Extract cell value from a row by removing a label prefix.
 * e.g. ["الإدارة:", "شرق"] → "شرق"
 *      ["الإدارة: شرق"] → "شرق"
 */
function extractValue(row: string[], labelKeywords: string[]): string {
  // If value is in adjacent cell
  const labelIdx = row.findIndex((c) => matches(c, labelKeywords));
  if (labelIdx !== -1) {
    // Check next cells
    for (let i = labelIdx + 1; i < row.length; i++) {
      const v = row[i].trim();
      if (v) return v;
    }
    // Value might be inline (e.g. "الإدارة: شرق")
    const inline = row[labelIdx]
      .replace(new RegExp(labelKeywords.join('|'), 'gi'), '')
      .replace(/[:：]/g, '')
      .trim();
    if (inline) return inline;
  }
  // Fallback: join all non-label cells
  return row
    .filter((c) => !matches(c, labelKeywords) && c.trim())
    .join(' ')
    .trim();
}

/**
 * Main parser – accepts a Buffer of an Excel file.
 * Returns structured data or an error message.
 */
export function parseExcelBuffer(buffer: Buffer): ParseOutcome {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    return { success: false, error: 'تعذّر قراءة الملف. تأكد أنه ملف Excel صحيح (.xlsx أو .xls).' };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { success: false, error: 'الملف لا يحتوي على أوراق عمل.' };

  const sheet = workbook.Sheets[sheetName];
  const rawRows: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  // Normalize to string rows
  const rows: string[][] = rawRows.map((row) =>
    (row as (string | number | null)[]).map((c) => String(c ?? '').trim())
  );

  // ── Extract header (ترويسة) ──────────────────────────────
  let district = '';
  let schoolName = '';
  let address = '';
  let headerRowIdx = -1;
  let dataStartIdx = -1;

  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i].filter(Boolean);
    if (!row.length) continue;

    if (!district && isDistrictRow(rows[i]))
      district = extractValue(rows[i], ['الإدارة', 'إداره', 'اداره', 'ادارة']);

    if (!schoolName && isSchoolRow(rows[i]) && i < 6)
      schoolName = extractValue(rows[i], ['المدرسة', 'المدرسه']);

    if (!address && isAddressRow(rows[i]))
      address = extractValue(rows[i], ['العنوان']);

    if (headerRowIdx === -1 && isHeaderRow(rows[i])) {
      headerRowIdx = i;
      dataStartIdx = i + 1;
    }
  }

  if (dataStartIdx === -1) {
    // Fallback: skip first few rows and treat rest as data
    dataStartIdx = Math.min(4, rows.length);
    headerRowIdx = dataStartIdx - 1;
  }

  // ── Detect column positions from header row ──────────────
  const hdr = rows[headerRowIdx] ?? [];
  const colOf = (keywords: string[]) =>
    hdr.findIndex((h) => keywords.some((k) => h.includes(k)));

  const nameCol = colOf(['اسم التلميذ', 'اسم الطالب', 'اسم التلميه', 'الاسم', 'اسم']);
  const gradeCol = colOf(['الصف', 'صف']);
  const classCol = colOf(['الفصل', 'فصل', 'الشعبة', 'شعبة']);

  // ── Parse student rows ───────────────────────────────────
  const students: ParsedStudent[] = [];
  const errors: string[] = [];

  for (let i = dataStartIdx; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((c) => !c)) continue; // skip empty rows

    // Skip rows that look like headers
    const rowText = row.join(' ');
    if (/^اسم|الصف|الفصل|م$|رقم/.test(row[0] ?? '') && i === dataStartIdx) continue;
    if (/اسم.*تلميذ|اسم.*طالب/.test(rowText)) continue;

    const name =
      nameCol !== -1 ? row[nameCol] : row[1] ?? row[0] ?? '';
    const grade =
      gradeCol !== -1 ? row[gradeCol] : row[2] ?? '';
    const classRoom =
      classCol !== -1 ? row[classCol] : row[3] ?? '';

    if (!name || name.length < 2) continue;

    const parsed = StudentRowSchema.safeParse({ name, grade, classRoom });
    if (!parsed.success) {
      errors.push(`صف ${i + 1}: ${parsed.error.issues[0].message}`);
      continue;
    }

    students.push({
      rowNum: students.length + 1,
      name: parsed.data.name,
      grade: parsed.data.grade,
      classRoom: parsed.data.classRoom,
    });
  }

  if (!students.length) {
    return {
      success: false,
      error: `لم يتم العثور على بيانات طلاب صالحة في الملف. ${errors.slice(0, 3).join(' | ')}`,
    };
  }

  return {
    success: true,
    data: {
      header: { district, schoolName, address },
      students,
    },
  };
}
