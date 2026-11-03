import { useState } from 'react';
import { useStore } from '../store';
import { Badge, Card, EmptyState, KpiCard, Modal, PageHeader } from '../components/ui';
import MonthBreakdown from '../components/MonthBreakdown';
import { PAY_STATUS, buildVisits, monthSummary, totalReceivedAllTime, weekSummary } from '../lib/calc';
import { formatDate, money, monthKey, monthLabel, today, weekLabel } from '../lib/format';

export default function Dashboard() {
  const { state } = useStore();
  const [showMonth, setShowMonth] = useState(false);

  const t = today();
  const mk = monthKey(t);
  const week = weekSummary(state, t);
  const month = monthSummary(state, mk);
  const balance = totalReceivedAllTime(state);
  const visits = buildVisits(state).slice(0, 6);
  const status = PAY_STATUS[week.status];

  return (
    <>
      <PageHeader title="نظرة عامة" subtitle={`أسبوع ${weekLabel(t)}`} />

      <div className="kpi-grid">
        <KpiCard label="الرصيد (اللي اتقبض من أول الشغل)" value={money(balance)} tone="success" />
        <div
          className="kpi-clickable"
          role="button"
          tabIndex={0}
          onClick={() => setShowMonth(true)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setShowMonth(true)}
          aria-label="تفاصيل المتبقي للشهر"
        >
          <KpiCard
            label="المتبقي للشهر"
            value={money(month.remaining)}
            hint="اضغط للتفاصيل"
            tone="warning"
          />
        </div>
        <KpiCard label="شغل الأسبوع" value={money(week.earned)} hint={`${week.printers} طابعة`} />
        <KpiCard label="اتقبض الأسبوع ده" value={money(week.received)} />
      </div>

      <div className="kpi-grid">
        <KpiCard label="أدوات الشركة (بتتضاف على المستحق)" value={money(month.companyAdd)} tone="success" />
        <KpiCard label="مصاريف شخصية (بتتخصم)" value={money(month.personalDeduct)} tone="warning" />
      </div>

      <div className="two-col">
        <Card
          title="حالة الأسبوع"
          action={<Badge tone={status.tone}>{status.label}</Badge>}
        >
          <p className="muted">
            الدفعة الأسبوعية {state.settings.payPercent}% = {money(week.advance)}.
            اتقبض {money(week.received)} من {money(week.earned)}.
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
            <EmptyState title="مفيش زيارات لسه" text="أول ما تسجل تركيب أو مصروف هيظهر هنا." />
          )}
        </Card>
      </div>

      <Modal
        open={showMonth}
        title={`تفاصيل المتبقي — ${monthLabel(mk)}`}
        onClose={() => setShowMonth(false)}
      >
        {showMonth && <MonthBreakdown state={state} mk={mk} />}
      </Modal>
    </>
  );
}