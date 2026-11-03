import { useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { monthSummary, categoryLabel, expenseDetail } from '../lib/calc';
import { money, formatDate } from '../lib/format';
import { buildMonthCsv, downloadCsv, shareOrDownloadCsv } from '../lib/report';

function Line({ label, value, strong }) {
  return (
    <div className={`line ${strong ? 'strong' : ''}`}>
      <span>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}

export default function MonthBreakdown({ state, mk }) {
  const m = monthSummary(state, mk);
  const [msg, setMsg] = useState('');
  const filename = `monthly-${mk}.csv`;

  const exportCsv = () => {
    downloadCsv(buildMonthCsv(state, mk), filename);
    setMsg('اتحمّل الملف. افتحه في Excel أو ارفعه على Google Sheets (File > Import).');
  };

  const share = async () => {
    const result = await shareOrDownloadCsv(buildMonthCsv(state, mk), filename);
    if (result === 'downloaded') setMsg('الجهاز ده مش بيدعم المشاركة المباشرة، الملف اتحمّل. ابعته على واتساب من عندك.');
    if (result === 'shared') setMsg('اتشارك الملف.');
  };

  const company = m.companyExpenses;
  const personal = m.personalExpenses;

  return (
    <div>
      <div className="section-title">الطابعات</div>
      {m.rateGroups.length ? (
        m.rateGroups.map((g) => (
          <Line key={g.rate} label={`${g.printers} طابعة × ${money(g.rate)}`} value={money(g.total)} />
        ))
      ) : (
        <p className="muted">مفيش تركيبات في الشهر ده.</p>
      )}
      <Line label="إجمالي الشغل" value={money(m.earned)} strong />

      <div className="section-title">الاستلام</div>
      <Line label="اتقبض" value={`- ${money(m.received)}`} />
      <Line label="الباقي من الشغل" value={money(m.pending)} strong />

      <div className="section-title">أدوات الشركة (بتتضاف)</div>
      {company.length ? (
        company.map((e) => (
          <Line
            key={e.id}
            label={`${formatDate(e.date)} · ${categoryLabel(state, e.category)} · ${expenseDetail(state, e)}`}
            value={`+ ${money(e.amount)}`}
          />
        ))
      ) : (
        <p className="muted">مفيش.</p>
      )}
      <Line label="الإجمالي المضاف" value={`+ ${money(m.companyAdd)}`} strong />

      <div className="section-title">مصاريف شخصية (بتتخصم)</div>
      {personal.length ? (
        personal.map((e) => (
          <Line
            key={e.id}
            label={`${formatDate(e.date)} · ${categoryLabel(state, e.category)} · ${expenseDetail(state, e)}`}
            value={`- ${money(e.amount)}`}
          />
        ))
      ) : (
        <p className="muted">مفيش.</p>
      )}
      <Line label="الإجمالي المخصوم" value={`- ${money(m.personalDeduct)}`} strong />

      <div className="result">
        <span>المتبقي للشهر</span>
        <span className="num">{money(m.remaining)}</span>
      </div>

      <div className="chip-row mt">
        <button className="btn" onClick={exportCsv}>
          <Download size={16} aria-hidden="true" /> تحميل Excel
        </button>
        <button className="btn primary" onClick={share}>
          <Share2 size={16} aria-hidden="true" /> مشاركة (واتساب)
        </button>
      </div>
      {msg && <p className="meta mt">{msg}</p>}
    </div>
  );
}