import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import {
  Badge, Card, DataTable, EmptyState, KpiCard, PageHeader, Switch,
} from '../components/ui';
import { monthSummary, weekSummary } from '../lib/calc';
import { money, monthKey, monthLabel, shiftMonth, today, weekLabel } from '../lib/format';

export default function Payments() {
  const { state, toggleWeekPaid, toggleMonthPaid } = useStore();
  const [anchor, setAnchor] = useState(today());
  const mk = monthKey(anchor);
  const ms = monthSummary(state, mk);
  const weeks = ms.weeks.map((s) => weekSummary(state, s));
  const pct = state.settings.payPercent;

  const shift = (dir) => setAnchor(`${shiftMonth(mk, dir)}-01`);

  const COLUMNS = [
    { key: 'start', label: 'الأسبوع', render: (w) => weekLabel(w.start) },
    { key: 'printers', label: 'الطابعات' },
    { key: 'earned', label: 'الشغل', render: (w) => money(w.earned) },
    { key: 'advance', label: `الدفعة (${pct}%)`, render: (w) => money(w.advance) },
    {
      key: 'paid',
      label: 'الحالة',
      render: (w) => (
        <Switch
          checked={w.paid}
          onChange={() => toggleWeekPaid(w.start)}
          label={w.paid ? 'تم الاستلام' : 'لم يُستلم'}
        />
      ),
    },
    { key: 'balance', label: 'الباقي للشهر', render: (w) => money(w.balance) },
  ];

  return (
    <>
      <PageHeader title="المدفوعات" subtitle={`${pct}% كل أسبوع، والباقي آخر الشهر`} />

      <div className="toolbar">
        <div className="period-nav">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="الشهر السابق">
            <ChevronRight size={18} />
          </button>
          <span className="period-label">{monthLabel(mk)}</span>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="الشهر التالي">
            <ChevronLeft size={18} />
          </button>
          <button className="btn ghost small" onClick={() => setAnchor(today())}>الشهر ده</button>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="إجمالي الشغل" value={money(ms.earned)} />
        <KpiCard label="اتقبض لحد دلوقتي" value={money(ms.received)} tone="success" />
        <KpiCard label="المتبقي" value={money(ms.remaining)} tone="warning" />
      </div>

      <Card title="الأسابيع">
        {weeks.length ? (
          <DataTable columns={COLUMNS} rows={weeks} rowKey={(w) => w.start} />
        ) : (
          <EmptyState
            title="مفيش شغل في الشهر ده"
            text="أول ما تسجل تركيبات في الشهر هتظهر الأسابيع هنا."
          />
        )}
      </Card>

      <Card
        title="الباقي آخر الشهر"
        action={
          <Badge tone={ms.monthPaid ? 'success' : 'warning'}>
            {ms.monthPaid ? 'تم الاستلام' : 'لم يُستلم'}
          </Badge>
        }
      >
        <p className="muted">المبلغ المستحق آخر الشهر: {money(ms.balances)}</p>
        <div className="mt">
          <Switch
            checked={ms.monthPaid}
            onChange={() => toggleMonthPaid(mk)}
            label={ms.monthPaid ? 'اتقبض الباقي' : 'علّم الباقي كمستلم'}
          />
        </div>
      </Card>
    </>
  );
}
