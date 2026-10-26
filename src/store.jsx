import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './lib/supabase';

const THEME_KEY = 'fieldtech-theme';
const EMPTY = {
  settings: { dailyRate: 200, payPercent: 50 },
  branches: [],
  installations: [],
  expenses: [],
  payments: { weeks: {}, months: {} },
};

const newId = () => crypto.randomUUID();
const upsert = (list, item) => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const next = [...list];
  next[i] = item;
  return next;
};

// ---- DB row <-> app shape ----
const mapBranch = (r) => ({
  id: r.id, name: r.name, governorate: r.governorate,
  floor: r.floor ?? '', room: r.room ?? '', rack: r.rack ?? '',
  installDate: r.install_date ?? '', status: r.status ?? 'installed',
});
const mapInstall = (r) => ({
  id: r.id, date: r.date, branchId: r.branch_id ?? '',
  printers: Number(r.printers), rate: Number(r.rate),
});
const mapExpense = (r) => ({
  id: r.id, date: r.date, governorate: r.governorate, branchId: r.branch_id ?? '',
  placeVisited: r.place_visited ?? '', transport: Number(r.transport) || 0,
  tools: Array.isArray(r.tools) ? r.tools : [],
});
const fromRows = (rows, keyField) =>
  Object.fromEntries((rows || []).map((r) => [r[keyField], r.paid]));

async function loadAll(userId) {
  const byUser = (table) => supabase.from(table).select('*').eq('user_id', userId);
  const [b, i, e, pw, pm, s] = await Promise.all([
    byUser('branches'),
    byUser('installations'),
    byUser('expenses'),
    byUser('payment_weeks'),
    byUser('payment_months'),
    supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  for (const res of [b, i, e, pw, pm, s]) if (res.error) throw res.error;

  return {
    settings: {
      dailyRate: Number(s.data?.daily_rate ?? 200),
      payPercent: Number(s.data?.pay_percent ?? 50),
    },
    branches: b.data.map(mapBranch),
    installations: i.data.map(mapInstall),
    expenses: e.data.map(mapExpense),
    payments: {
      weeks: fromRows(pw.data, 'week_start'),
      months: fromRows(pm.data, 'month_key'),
    },
  };
}

const StoreContext = createContext(null);

export function StoreProvider({ userId, children }) {
  const [data, setData] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');

  const dataRef = useRef(data);
  dataRef.current = data;

  const reload = useCallback(async () => {
    try {
      setData(await loadAll(userId));
    } catch (e) {
      setError(`ماقدرناش نحمّل البيانات: ${e.message}`);
    }
  }, [userId]);

  useEffect(() => {
    let alive = true;
    setReady(false);
    loadAll(userId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(`ماقدرناش نحمّل البيانات: ${e.message}`))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Writes go to Supabase. On failure the error is shown and the data is reloaded from the server.
  const run = async (request, { reloadAfter = false } = {}) => {
    const { error: e } = await request;
    if (e) {
      setError(`ماتسجلش التغيير: ${e.message}`);
      await reload();
      return false;
    }
    if (reloadAfter) await reload();
    return true;
  };

  const actions = {
    saveBranch: (b) => {
      const item = { ...b, id: b.id || newId() };
      setData((d) => ({ ...d, branches: upsert(d.branches, item) }));
      return run(
        supabase.from('branches').upsert({
          id: item.id,
          user_id: userId,
          name: item.name,
          governorate: item.governorate,
          floor: item.floor || null,
          room: item.room || null,
          rack: item.rack || null,
          install_date: item.installDate || null,
          status: item.status,
        })
      );
    },
    deleteBranch: (id) => {
      setData((d) => ({ ...d, branches: d.branches.filter((x) => x.id !== id) }));
      return run(supabase.from('branches').delete().eq('id', id), { reloadAfter: true });
    },

    saveInstallation: (r) => {
      const item = { ...r, id: r.id || newId() };
      setData((d) => ({ ...d, installations: upsert(d.installations, item) }));
      return run(
        supabase.from('installations').upsert({
          id: item.id,
          user_id: userId,
          date: item.date,
          branch_id: item.branchId || null,
          printers: item.printers,
          rate: item.rate,
        })
      );
    },
    deleteInstallation: (id) => {
      setData((d) => ({ ...d, installations: d.installations.filter((x) => x.id !== id) }));
      return run(supabase.from('installations').delete().eq('id', id));
    },

    saveExpense: (r) => {
      const item = { ...r, id: r.id || newId() };
      setData((d) => ({ ...d, expenses: upsert(d.expenses, item) }));
      return run(
        supabase.from('expenses').upsert({
          id: item.id,
          user_id: userId,
          date: item.date,
          governorate: item.governorate,
          branch_id: item.branchId || null,
          place_visited: item.placeVisited || null,
          transport: item.transport || 0,
          tools: item.tools || [],
        })
      );
    },
    deleteExpense: (id) => {
      setData((d) => ({ ...d, expenses: d.expenses.filter((x) => x.id !== id) }));
      return run(supabase.from('expenses').delete().eq('id', id));
    },

    setSettings: (patch) => {
      setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
      const row = { user_id: userId };
      if (patch.dailyRate !== undefined) row.daily_rate = patch.dailyRate;
      if (patch.payPercent !== undefined) row.pay_percent = patch.payPercent;
      return run(supabase.from('settings').upsert(row, { onConflict: 'user_id' }));
    },

    toggleWeekPaid: (key) => {
      const next = !dataRef.current.payments.weeks[key];
      setData((d) => ({
        ...d,
        payments: { ...d.payments, weeks: { ...d.payments.weeks, [key]: next } },
      }));
      return run(
        supabase
          .from('payment_weeks')
          .upsert({ user_id: userId, week_start: key, paid: next }, { onConflict: 'user_id,week_start' })
      );
    },

    toggleMonthPaid: (key) => {
      const next = !dataRef.current.payments.months[key];
      setData((d) => ({
        ...d,
        payments: { ...d.payments, months: { ...d.payments.months, [key]: next } },
      }));
      return run(
        supabase
          .from('payment_months')
          .upsert({ user_id: userId, month_key: key, paid: next }, { onConflict: 'user_id,month_key' })
      );
    },

    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),

    resetAll: async () => {
      const tables = ['installations', 'expenses', 'branches', 'payment_weeks', 'payment_months', 'settings'];
      for (const t of tables) {
        const { error: e } = await supabase.from(t).delete().eq('user_id', userId);
        if (e) {
          setError(`ماقدرناش نمسح البيانات: ${e.message}`);
          break;
        }
      }
      await reload();
    },
  };

  const value = {
    state: { ...data, theme },
    loading: !ready,
    error,
    clearError: () => setError(''),
    ...actions,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
