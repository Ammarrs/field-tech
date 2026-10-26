import { weekRange, monthKey, startOfWeek } from './format';

export const inRange = (iso, { start, end }) => iso >= start && iso <= end;

export const installAmount = (i) => (Number(i.printers) || 0) * (Number(i.rate) || 0);

export const expenseTotal = (e) =>
  (Number(e.transport) || 0) + (e.tools || []).reduce((s, t) => s + (Number(t.price) || 0), 0);

// A week is identified by its Saturday start date.
export function weekSummary(state, anyDate) {
  const range = weekRange(anyDate);
  const items = state.installations.filter((i) => inRange(i.date, range));
  const printers = items.reduce((s, i) => s + (Number(i.printers) || 0), 0);
  const earned = items.reduce((s, i) => s + installAmount(i), 0);
  const advance = Math.round((earned * state.settings.payPercent) / 100);
  const paid = !!state.payments.weeks[range.start];
  return {
    start: range.start,
    end: range.end,
    printers,
    earned,
    advance,
    balance: earned - advance,
    paid,
    received: paid ? advance : 0,
  };
}

// A month's figures are the sum of the weeks that start in that month.
export function monthSummary(state, mk) {
  const weeks = [...new Set(state.installations.map((i) => startOfWeek(i.date)))]
    .filter((s) => monthKey(s) === mk)
    .sort();

  let earned = 0;
  let balances = 0;
  let advancesReceived = 0;
  weeks.forEach((s) => {
    const w = weekSummary(state, s);
    earned += w.earned;
    balances += w.balance;
    advancesReceived += w.received;
  });

  const monthPaid = !!state.payments.months[mk];
  const received = advancesReceived + (monthPaid ? balances : 0);
  return { weeks, earned, balances, received, remaining: earned - received, monthPaid };
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
      detail: e.placeVisited || 'مصروف',
    };
  });

  return [...installs, ...expenses].sort((a, b) => b.date.localeCompare(a.date));
}
