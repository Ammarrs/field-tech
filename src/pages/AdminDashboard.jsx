import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  Badge, Card, DataTable, EmptyState, KpiCard, PageHeader, SearchInput,
} from '../components/ui';
import { expenseTotal, installAmount } from '../lib/calc';
import { money } from '../lib/format';

async function fetchAll() {
  const [p, b, i, e] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, role, active, created_at'),
    supabase.from('branches').select('id, user_id, name, governorate, created_at'),
    supabase.from('installations').select('id, user_id, date, printers, rate, branch_id, created_at'),
    supabase.from('expenses').select('id, user_id, date, governorate, transport, tools, place_visited, created_at'),
  ]);
  for (const r of [p, b, i, e]) if (r.error) throw r.error;
  return { profiles: p.data, branches: b.data, installations: i.data, expenses: e.data };
}

const fmtTime = (iso) => new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

// Builds one row per user with totals and an activity log (newest first).
// "At" is the time the record was created.
function buildUserStats({ profiles, branches, installations, expenses }) {
  const branchById = Object.fromEntries(branches.map((b) => [b.id, b]));

  return profiles
    .map((p) => {
      const br = branches.filter((x) => x.user_id === p.id);
      const inst = installations.filter((x) => x.user_id === p.id);
      const exp = expenses.filter((x) => x.user_id === p.id);

      const activity = [
        ...inst.map((i) => ({
          id: `i-${i.id}`,
          at: i.created_at,
          kind: 'تركيب',
          text: `${branchById[i.branch_id]?.name ?? 'فرع محذوف'} · ${i.printers} طابعة · ${money(installAmount(i))}`,
        })),
        ...exp.map((e) => ({
          id: `e-${e.id}`,
          at: e.created_at,
          kind: 'مصروف',
          text: `${e.place_visited || e.governorate} · ${money(expenseTotal(e))}`,
        })),
        ...br.map((b) => ({
          id: `b-${b.id}`,
          at: b.created_at,
          kind: 'فرع جديد',
          text: `${b.name} · ${b.governorate}`,
        })),
      ].sort((a, b) => b.at.localeCompare(a.at));

      return {
        ...p,
        branchCount: br.length,
        printers: inst.reduce((s, x) => s + Number(x.printers), 0),
        earned: inst.reduce((s, x) => s + installAmount(x), 0),
        expenses: exp.reduce((s, x) => s + expenseTotal(x), 0),
        lastAt: activity[0]?.at ?? null,
        activity,
      };
    })
    .sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''));
}

export default function AdminDashboard() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(buildUserStats(await fetchAll()));
    } catch (e) {
      setError(`ماقدرناش نحمّل البيانات: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      (users || []).filter((u) =>
        `${u.full_name} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase())
      ),
    [users, q]
  );

  const totals = (users || []).reduce(
    (t, u) => ({
      active: t.active + (u.active ? 1 : 0),
      printers: t.printers + u.printers,
      earned: t.earned + u.earned,
      expenses: t.expenses + u.expenses,
    }),
    { active: 0, printers: 0, earned: 0, expenses: 0 }
  );

  const selected = users?.find((u) => u.id === selectedId);

  const COLUMNS = [
    {
      key: 'full_name',
      label: 'المستخدم',
      render: (u) => (
        <div>
          <strong>{u.full_name}</strong>
          <div className="meta">{u.email}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (u) => (
        <Badge tone={u.active ? 'success' : 'danger'}>{u.active ? 'نشط' : 'موقوف'}</Badge>
      ),
    },
    { key: 'branchCount', label: 'الفروع' },
    { key: 'printers', label: 'الطابعات' },
    { key: 'earned', label: 'الشغل', render: (u) => money(u.earned) },
    { key: 'expenses', label: 'المصاريف', render: (u) => money(u.expenses) },
    { key: 'lastAt', label: 'آخر نشاط', render: (u) => (u.lastAt ? fmtTime(u.lastAt) : '—') },
  ];

  return (
    <>
      <PageHeader
        title="نشاط المستخدمين"
        subtitle="كل فني وعمل إيه وإمتى"
        action={
          <button className="btn" onClick={load} disabled={loading}>
            <RefreshCw size={16} aria-hidden="true" /> تحديث
          </button>
        }
      />

      {error && <p className="alert alert-danger" role="alert">{error}</p>}

      <div className="kpi-grid">
        <KpiCard label="المستخدمين النشطين" value={`${totals.active} / ${users?.length ?? 0}`} />
        <KpiCard label="إجمالي الطابعات" value={totals.printers} />
        <KpiCard label="إجمالي الشغل" value={money(totals.earned)} />
        <KpiCard label="إجمالي المصاريف" value={money(totals.expenses)} />
      </div>

      <Card>
        <div className="toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="ابحث بالاسم أو الإيميل" />
        </div>
        {users && filtered.length ? (
          <DataTable
            columns={COLUMNS}
            rows={filtered}
            rowKey={(u) => u.id}
            actions={(u) => (
              <button
                className="btn small"
                onClick={() => setSelectedId(u.id)}
                aria-pressed={selectedId === u.id}
              >
                عرض النشاط
              </button>
            )}
          />
        ) : (
          <EmptyState
            title={loading ? 'جاري التحميل…' : 'مفيش مستخدمين'}
            text={loading ? '' : 'ضيف مستخدمين من صفحة إدارة المستخدمين.'}
          />
        )}
      </Card>

      {selected && (
        <Card
          title={`نشاط ${selected.full_name}`}
          action={
            <button className="btn ghost small" onClick={() => setSelectedId(null)}>إغلاق</button>
          }
        >
          {selected.activity.length ? (
            <ul className="timeline">
              {selected.activity.slice(0, 100).map((a) => (
                <li key={a.id}>
                  <div className="grow">
                    <strong>{a.text}</strong>
                    <div className="meta">{fmtTime(a.at)}</div>
                  </div>
                  <Badge tone={a.kind === 'تركيب' ? 'success' : a.kind === 'مصروف' ? 'warning' : 'neutral'}>
                    {a.kind}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="مفيش نشاط للمستخدم ده" text="أول ما يسجل تركيب أو مصروف هيظهر هنا." />
          )}
        </Card>
      )}
    </>
  );
}
