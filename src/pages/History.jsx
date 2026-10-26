import { useState } from 'react';
import { useStore } from '../store';
import { Badge, Card, EmptyState, PageHeader } from '../components/ui';
import { buildVisits } from '../lib/calc';
import { GOVERNORATES, formatDate, monthKey, monthLabel } from '../lib/format';

export default function HistoryPage() {
  const { state } = useStore();
  const [gov, setGov] = useState('');

  const visits = buildVisits(state).filter((v) => !gov || v.governorate === gov);
  const groups = visits.reduce((acc, v) => {
    const k = monthKey(v.date);
    (acc[k] ||= []).push(v);
    return acc;
  }, {});

  return (
    <>
      <PageHeader title="سجل الزيارات" subtitle="كل التركيبات والمصاريف بالترتيب الزمني" />

      <div className="toolbar">
        <select className="input filter-select" value={gov} onChange={(e) => setGov(e.target.value)} aria-label="فلتر المحافظة">
          <option value="">كل المحافظات</option>
          {GOVERNORATES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {Object.keys(groups).length ? (
        Object.entries(groups).map(([mk, items]) => (
          <Card key={mk} title={monthLabel(mk)}>
            <ul className="timeline">
              {items.map((v) => (
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
          </Card>
        ))
      ) : (
        <EmptyState title="مفيش زيارات مسجلة" text="الزيارات بتتسجل تلقائي مع التركيبات والمصاريف." />
      )}
    </>
  );
}
