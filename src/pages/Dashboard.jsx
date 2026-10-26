import { useStore } from '../store';
import { Badge, Card, EmptyState, KpiCard, PageHeader } from '../components/ui';
import { buildVisits, expenseTotal, monthSummary, weekSummary } from '../lib/calc';
import { formatDate, money, monthKey, today, weekLabel } from '../lib/format';

export default function Dashboard() {
  const { state } = useStore();
  const t = today();
  const week = weekSummary(state, t);
  const month = monthSummary(state, monthKey(t));
  const monthExpenses = state.expenses
    .filter((e) => monthKey(e.date) === monthKey(t))
    .reduce((s, e) => s + expenseTotal(e), 0);
  const visits = buildVisits(state).slice(0, 6);

  return (
    <>
      <PageHeader title="نظرة عامة" subtitle={`أسبوع ${weekLabel(t)}`} />

      <div className="kpi-grid">
        <KpiCard label="شغل الأسبوع" value={money(week.earned)} hint={`${week.printers} طابعة`} />
        <KpiCard label="اتقبض الأسبوع ده" value={money(week.received)} tone="success" />
        <KpiCard label="المتبقي للشهر" value={money(month.remaining)} tone="warning" />
        <KpiCard label="مصاريف الشهر" value={money(monthExpenses)} />
      </div>

      <Card
        title="حالة قبض الأسبوع"
        action={
          <Badge tone={week.paid ? 'success' : 'warning'}>
            {week.paid ? 'تم الاستلام' : 'لم يتم الاستلام بعد'}
          </Badge>
        }
      >
        <p className="muted">
          الدفعة الأسبوعية {state.settings.payPercent}% وقيمتها {money(week.advance)}. الباقي{' '}
          {money(week.balance)} يتقبض آخر الشهر.
        </p>
      </Card>

      <Card title="آخر الزيارات">
        {visits.length ? (
          <ul className="timeline">
            {visits.map((v) => (
              <li key={v.id}>
                <div className="grow">
                  <strong>{v.branch}</strong>
                  <div className="meta">
                    {v.governorate} · {formatDate(v.date)} · {v.detail}
                  </div>
                </div>
                <Badge tone={v.kind === 'install' ? 'success' : 'neutral'}>
                  {v.kind === 'install' ? 'تركيب' : 'مصروف'}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="مفيش زيارات لسه"
            text="أول ما تسجل تركيب أو مصروف هيظهر هنا."
          />
        )}
      </Card>
    </>
  );
}
