export const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الدقهلية', 'الشرقية', 'الغربية',
  'المنوفية', 'البحيرة', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس',
  'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان',
  'البحر الأحمر', 'الوادي الجديد', 'مطروح', 'شمال سيناء', 'جنوب سيناء',
];

export const money = (n) => `${Math.round(Number(n) || 0).toLocaleString('en-US')} ج.م`;

export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => toISO(new Date());

export const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

// Egyptian work week runs Saturday to Friday.
export const startOfWeek = (iso) => addDays(iso, -((parseISO(iso).getDay() + 1) % 7));

export const weekRange = (iso) => {
  const start = startOfWeek(iso);
  return { start, end: addDays(start, 6) };
};

export const monthKey = (iso) => iso.slice(0, 7);

export const shiftMonth = (mk, n) => {
  const [y, m] = mk.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const monthRange = (mk) => {
  const start = `${mk}-01`;
  const d = parseISO(start);
  d.setMonth(d.getMonth() + 1, 0);
  return { start, end: toISO(d) };
};

export const periodRange = (mode, anchor) =>
  mode === 'week' ? weekRange(anchor) : monthRange(monthKey(anchor));

export const shiftAnchor = (mode, anchor, dir) =>
  mode === 'week' ? addDays(anchor, dir * 7) : `${shiftMonth(monthKey(anchor), dir)}-01`;

export const formatDate = (iso) =>
  parseISO(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });

export const weekLabel = (iso) => {
  const r = weekRange(iso);
  return `${formatDate(r.start)} - ${formatDate(r.end)}`;
};

export const monthLabel = (mk) =>
  parseISO(`${mk}-01`).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
