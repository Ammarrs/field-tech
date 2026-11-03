import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { Badge, Card, DataTable, EmptyState, Field, KpiCard, Modal, PageHeader } from '../components/ui';
import { PAY_STATUS, monthSummary } from '../lib/calc';
import { money, monthKey, monthLabel, shiftMonth, today, weekLabel } from '../lib/format';

// Confirmation modal for recording a payment. Keyed by target so state resets per open.
function ReceiveModal({ title, due, entry, coverLabel, onSave, onClose }) {
  const [amount, setAmount] = useState(entry?.amount ? String(entry.amount) : '');
  const [covered, setCovered] = useState(!!entry?.covered);
  const [step, setStep] = useState('form');
  const [error, setError] = useState('');

  const next = () => {
    const n = Number(amount || 0);
    if (Number.isNaN(n) || n < 0) return setError('ادخل مبلغ صحيح');
    if (!covered && n <= 0) return setError('ادخل المبلغ اللي استلمته، أو علّم خانة التغطية');
    setError('');
    setStep('confirm');
  };

  const confirm = () => onSave({ amount: Number(amount) || 0, covered });
  const cancelReceipt = () => onSave({ amount: 0, covered: false });

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      footer={
        step === 'form' ? (
          <>
            {entry && (entry.amount > 0 || entry.covered) && (
              <button className="btn danger" onClick={cancelReceipt}>إلغاء الاستلام</button>
            )}
            <button className="btn ghost" onClick={onClose}>إلغاء</button>
            <button className="btn primary" onClick={next}>متابعة</button>
          </>
        ) : (
          <>
            <button className="btn ghost" onClick={() => setStep('form')}>رجوع</button>
            <button className="btn ghost" onClick={onClose}>إلغاء</button>
            <button className="btn primary" onClick={confirm}>تأكيد الاستلام</button>
          </>
        )
      }
    >
      {step === 'form' ? (
        <div className="stack">
          <p className="muted">المتبقي: {money(due)}</p>
          <Field label="المبلغ اللي استلمته (ج.م)" error={error}>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              className="input"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
            />
          </Field>
          <label className="check">
            <input type="checkbox" checked={covered} onChange={(e) => setCovered(e.target.checked)} />
            <span>{coverLabel}</span>
          </label>
        </div>
      ) : (
        <div className="stack">
          <p>متأكد إنك عايز تتمم الاستلام؟</p>
          <div className="line">
            <span>المبلغ</span>
            <span className="num">{money(Number(amount) || 0)}</span>
          </div>
          <div className="line">
            <span>غطى التكاليف؟</span>
            <span>{covered ? 'أيوه' : 'لأ'}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Payments() {
  const { state, setWeekPayment, setMonthPayment } = useStore();
  const [anchor, setAnchor] = useState(today());
  const [target, setTarget] = useState(null);

  const mk = monthKey(anchor);
  const ms = monthSummary(state, mk);
  const pct = state.settings.payPercent;
  const shift = (dir) => setAnchor(`${shiftMonth(mk, dir)}-01`);

  const COLUMNS = [
    { key: 'start', label: 'الأسبوع', render: (w) => weekLabel(w.start) },
    { key: 'printers', label: 'الطابعات' },
    { key: 'earned', label: 'الشغل', render: (w) => money(w.earned) },
    { key: 'advance', label: `الدفعة (${pct}%)`, render: (w) => money(w.advance) },
    { key: 'received', label: 'اتقبض', render: (w) => money(w.received) },
    {
      key: 'status',
      label: 'الحالة',
      render: (w) => <Badge tone={PAY_STATUS[w.status].tone}>{PAY_STATUS[w.status].label}</Badge>,
    },
    { key: 'remaining', label: 'المتبقي', render: (w) => money(w.remaining) },
  ];

  const openWeek = (w) =>
    setTarget({
      type: 'week',
      key: w.start,
      title: `استلام أسبوع ${weekLabel(w.start)}`,
      due: w.remaining,
      entry: w.entry,
      coverLabel: `ده غطى الدفعة الأسبوعية (${pct}%)`,
    });

  const openMonth = () =>
    setTarget({
      type: 'month',
      key: mk,
      title: `استلام آخر الشهر — ${monthLabel(mk)}`,
      due: Math.max(0, ms.pending),
      entry: ms.monthEntry,
      coverLabel: 'ده غطى باقي الشغل للشهر',
    });

  const onSave = (entry) => {
    if (target.type === 'week') setWeekPayment(target.key, entry);
    else setMonthPayment(target.key, entry);
    setTarget(null);
  };

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
        <KpiCard label="اتقبض" value={money(ms.received)} tone="success" />
        <KpiCard label="المتبقي للشهر" value={money(ms.remaining)} tone="warning" hint="بعد خصم وإضافة المصاريف" />
      </div>

      <Card title="الأسابيع">
        {ms.weeks.length ? (
          <DataTable
            columns={COLUMNS}
            rows={ms.weeks}
            rowKey={(w) => w.start}
            actions={(w) => (
              <button className="btn small" onClick={() => openWeek(w)}>
                {w.status === 'paid' ? 'تعديل' : 'تسجيل استلام'}
              </button>
            )}
          />
        ) : (
          <EmptyState
            title="مفيش شغل في الشهر ده"
            text="أول ما تسجل تركيبات في الشهر هتظهر الأسابيع هنا."
          />
        )}
      </Card>

      <Card
        title="آخر الشهر"
        action={<Badge tone={PAY_STATUS[ms.status].tone}>{PAY_STATUS[ms.status].label}</Badge>}
      >
        <div className="line">
          <span>الباقي من الشغل</span>
          <span className="num">{money(ms.pending)}</span>
        </div>
        <div className="line">
          <span>اتقبض آخر الشهر</span>
          <span className="num">{money(ms.monthEndReceived)}</span>
        </div>
        <div className="mt">
          <button className="btn primary" onClick={openMonth} disabled={ms.pending <= 0 && !ms.monthEntry}>
            {ms.monthEntry?.amount || ms.monthEntry?.covered ? 'تعديل الاستلام' : 'تسجيل استلام آخر الشهر'}
          </button>
        </div>
      </Card>

      {target && (
        <ReceiveModal
          key={`${target.type}-${target.key}`}
          title={target.title}
          due={target.due}
          entry={target.entry}
          coverLabel={target.coverLabel}
          onSave={onSave}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}