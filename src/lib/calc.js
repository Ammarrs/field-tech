import { weekRange, monthKey, startOfWeek } from './format';

export const inRange = (iso, { start, end }) => iso >= start && iso <= end;

export const installAmount = (i) => (Number(i.printers) || 0) * (Number(i.rate) || 0);
export const expenseAmount = (e) => Number(e.amount) || 0;
export const expenseTotal = expenseAmount;

export const PAY_STATUS = {
  paid: { label: 'تم الاستلام', tone: 'success' },
  partial: { label: 'استلمت جزء', tone: 'warning' },
  unpaid: { label: 'لم يُستلم', tone: 'neutral' },
};

// Amount received for a period. "covered" means the period is fully paid up to `due`.
export function receivedFor(entry, due) {
  if (!entry) return 0;
  const amount = Number(entry.amount) || 0;
  return entry.covered ? Math.max(amount, due) : amount;
}

// A week is identified by its Saturday start date.
// This is the full week, used for the weekly payment record.
export function weekSummary(state, anyDate) {
  const range = weekRange(anyDate);
  const items = state.installations.filter((i) => inRange(i.date, range));
  const printers = items.reduce((s, i) => s + (Number(i.printers) || 0), 0);
  const earned = items.reduce((s, i) => s + installAmount(i), 0);
  const advance = Math.round((earned * state.settings.payPercent) / 100);

  const entry = state.payments.weeks[range.start];
  const received = receivedFor(entry, advance);

  let status = 'unpaid';
  if (entry?.covered || (advance > 0 && received >= advance)) status = 'paid';
  else if (received > 0) status = 'partial';

  return {
    start: range.start,
    end: range.end,
    printers,
    earned,
    advance,
    balance: earned - advance,
    received,
    remaining: earned - received,
    status,
    entry,
  };
}

// Month = calendar month of each installation date (1st to last day).
// A week that crosses into this month is split by how much of it falls in this month.
export function monthSummary(state, mk) {
  const installs = state.installations.filter((i) => monthKey(i.date) === mk);
  const starts = [...new Set(installs.map((i) => startOfWeek(i.date)))].sort();

  const weeks = starts.map((s) => {
    const full = weekSummary(state, s);
    const inMonth = installs.filter((i) => startOfWeek(i.date) === s);
    const earned = inMonth.reduce((t, i) => t + installAmount(i), 0);
    const printers = inMonth.reduce((t, i) => t + (Number(i.printers) || 0), 0);
    const share = full.earned > 0 ? earned / full.earned : 0;
    const advance = Math.round(full.advance * share);
    const received = Math.round(full.received * share);
    return {
      start: full.start,
      end: full.end,
      printers,
      earned,
      advance,
      balance: earned - advance,
      received,
      remaining: earned - received,
      status: full.status,
      entry: full.entry,
      weekRemaining: full.remaining,
    };
  });

  const printers = installs.reduce((s, i) => s + (Number(i.printers) || 0), 0);
  const earned = installs.reduce((s, i) => s + installAmount(i), 0);
  const weeksReceived = weeks.reduce((s, w) => s + w.received, 0);

  const monthEntry = state.payments.months[mk];
  const monthEndReceived = receivedFor(monthEntry, Math.max(0, earned - weeksReceived));
  const received = weeksReceived + monthEndReceived;
  const pending = earned - received;

  const expenses = state.expenses.filter((e) => monthKey(e.date) === mk);
  const companyExpenses = expenses.filter((e) => e.kind === 'company');
  const personalExpenses = expenses.filter((e) => e.kind !== 'company');
  const companyAdd = companyExpenses.reduce((s, e) => s + expenseAmount(e), 0);
  const personalDeduct = personalExpenses.reduce((s, e) => s + expenseAmount(e), 0);

  // Company tools are added to what the company owes you. Personal expenses are deducted.
  const remaining = pending + companyAdd - personalDeduct;

  const byRate = {};
  installs.forEach((i) => {
    const rate = Number(i.rate) || 0;
    const g = byRate[rate] || (byRate[rate] = { rate, printers: 0, total: 0 });
    g.printers += Number(i.printers) || 0;
    g.total += installAmount(i);
  });
  const rateGroups = Object.values(byRate).sort((a, b) => b.rate - a.rate);

  let status = 'unpaid';
  if (monthEntry?.covered || (earned > 0 && pending <= 0)) status = 'paid';
  else if (received > 0) status = 'partial';

  return {
    mk, weeks, installs, expenses, companyExpenses, personalExpenses,
    printers, earned, weeksReceived, monthEntry, monthEndReceived,
    received, pending, companyAdd, personalDeduct, remaining, rateGroups, status,
  };
}

// Total money received since the first installation (الرصيد).
export function totalReceivedAllTime(state) {
  const months = [...new Set(state.installations.map((i) => monthKey(i.date)))];
  return months.reduce((s, mk) => s + monthSummary(state, mk).received, 0);
}

export const categoryLabel = (state, key) => {
  if (key === 'transport') return 'مواصلات';
  if (key === 'tools') return 'أدوات';
  return state.categories?.find((c) => c.id === key)?.name ?? 'تصنيف محذوف';
};

export function expenseDetail(state, e) {
  if (e.category === 'transport') return `من ${e.fromPlace || '—'} إلى ${e.toPlace || '—'}`;
  if (e.category === 'tools') return e.itemName || 'أداة';
  return e.description || categoryLabel(state, e.category);
}

export function buildVisits(state) {
  const branchById = Object.fromEntries(state.branches.map((b) => [b.id, b]));

  const installs = state.installations.map((i) => {
    const b = branchById[i.branchId];
    return {
      id: `i-${i.id}`,
      date: i.date,
      kind: 'install',
      branch: b?.name ?? 'فرع محذوف',
      governorate: b?.governorate ?? '—',
      detail: `${i.printers} طابعة`,
    };
  });

  const expenses = state.expenses.map((e) => {
    const b = branchById[e.branchId];
    return {
      id: `e-${e.id}`,
      date: e.date,
      kind: 'expense',
      branch: b?.name ?? '—',
      governorate: e.governorate,
      detail: expenseDetail(state, e),
    };
  });

  return [...installs, ...expenses].sort((a, b) => b.date.localeCompare(a.date));
}