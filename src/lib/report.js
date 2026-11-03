import { monthLabel } from './format';
import { categoryLabel, expenseDetail, installAmount, monthSummary } from './calc';

const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const line = (cells) => cells.map(cell).join(',');

// Builds one month as CSV. Opens directly in Excel and can be imported into Google Sheets.
export function buildMonthCsv(state, mk) {
  const m = monthSummary(state, mk);
  const branchOf = (id) => state.branches.find((b) => b.id === id);

  const installRows = [...m.installs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((i) => line([
      i.date,
      branchOf(i.branchId)?.name ?? '',
      branchOf(i.branchId)?.governorate ?? '',
      i.printers,
      i.rate,
      installAmount(i),
    ]));

  const expenseRows = [...m.expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => line([
      e.date,
      categoryLabel(state, e.category),
      e.kind === 'company' ? 'على الشركة' : 'شخصي',
      e.governorate,
      branchOf(e.branchId)?.name ?? '',
      expenseDetail(state, e),
      e.amount,
    ]));

  const rows = [
    line(['تقرير شهر', monthLabel(mk)]),
    '',
    line(['الملخص']),
    line(['عدد الطابعات', m.printers]),
    line(['إجمالي الشغل', m.earned]),
    line(['اتقبض', m.received]),
    line(['الباقي من الشغل', m.pending]),
    line(['أدوات الشركة (بتتضاف)', m.companyAdd]),
    line(['مصاريف شخصية (بتتخصم)', m.personalDeduct]),
    line(['المتبقي للشهر', m.remaining]),
    '',
    line(['الطابعات حسب السعر']),
    line(['السعر', 'عدد الطابعات', 'الإجمالي']),
    ...m.rateGroups.map((g) => line([g.rate, g.printers, g.total])),
    '',
    line(['التركيبات']),
    line(['التاريخ', 'الفرع', 'المحافظة', 'عدد الطابعات', 'السعر', 'الإجمالي']),
    ...installRows,
    '',
    line(['المصاريف']),
    line(['التاريخ', 'التصنيف', 'النوع', 'المحافظة', 'الفرع', 'التفاصيل', 'المبلغ']),
    ...expenseRows,
  ];

  return rows.join('\r\n');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// The BOM makes Excel read Arabic text correctly.
const makeBlob = (csv) => new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });

export function downloadCsv(csv, filename) {
  downloadBlob(makeBlob(csv), filename);
}

// On phones this opens the share sheet, where you can pick WhatsApp.
// On desktop it falls back to a download.
export async function shareOrDownloadCsv(csv, filename) {
  const blob = makeBlob(csv);
  const file = new File([blob], filename, { type: 'text/csv' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}