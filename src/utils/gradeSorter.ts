export const gradeOrderMap: Record<string, number> = {
  'رياض أطفال 1': 1, 'رياض اطفال 1': 1, 'KG1': 1, 'kg1': 1,
  'رياض أطفال 2': 2, 'رياض اطفال 2': 2, 'KG2': 2, 'kg2': 2,
  'الصف الأول': 3, 'الأول': 3,
  'الصف الثاني': 4, 'الثاني': 4,
  'الصف الثالث': 5, 'الثالث': 5,
  'الصف الرابع': 6, 'الرابع': 6,
  'الصف الخامس': 7, 'الخامس': 7,
  'الصف السادس': 8, 'السادس': 8,
  'الصف الأول الإعدادي': 9, 'الأول الإعدادي': 9,
  'الصف الثاني الإعدادي': 10, 'الثاني الإعدادي': 10,
  'الصف الثالث الإعدادي': 11, 'الثالث الإعدادي': 11,
  'الصف الأول الثانوي': 12, 'الأول الثانوي': 12,
  'الصف الثاني الثانوي': 13, 'الثاني الثانوي': 13,
  'الصف الثالث الثانوي': 14, 'الثالث الثانوي': 14,
};

/**
 * Sorts an array of class statistics objects based on the logical numerical grade level.
 * @param stats Array of statistics objects containing a `grade_level` property.
 * @returns Sorted array.
 */
export function sortStatsByGrade<T extends { grade_level?: string | null }>(stats: T[]): T[] {
  if (!stats) return [];
  return [...stats].sort((a, b) => {
    const gradeA = a.grade_level || '';
    const gradeB = b.grade_level || '';
    const orderA = gradeOrderMap[gradeA] || 99;
    const orderB = gradeOrderMap[gradeB] || 99;
    return orderA - orderB;
  });
}
