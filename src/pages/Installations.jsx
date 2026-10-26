import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import {
  Card, DataTable, EmptyState, Field, KpiCard, Modal, PageHeader, PeriodSelector, usePeriod,
} from '../components/ui';
import { installAmount, inRange, weekSummary } from '../lib/calc';
import { formatDate, money, periodRange, today } from '../lib/format';

const COLUMNS = [
  { key: 'date', label: 'التاريخ', render: (r) => formatDate(r.date) },
  { key: 'branchName', label: 'الفرع' },
  { key: 'governorate', label: 'المحافظة' },
  { key: 'printers', label: 'عدد الطابعات' },
  { key: 'rate', label: 'السعر', render: (r) => money(r.rate) },
  { key: 'total', label: 'الإجمالي', render: (r) => money(installAmount(r)) },
];

function validate(f) {
  const e = {};
  if (!f.date) e.date = 'اختار التاريخ';
  if (!f.branchId) e.branchId = 'اختار الفرع';
  const n = Number(f.printers);
  if (f.printers === '' || !Number.isInteger(n) || n < 1) e.printers = 'ادخل عدد صحيح أكبر من صفر';
  if (!(Number(f.rate) > 0)) e.rate = 'ادخل سعر أكبر من صفر';
  return e;
}

export default function Installations() {
  const { state, saveInstallation, deleteInstallation } = useStore();
  const period = usePeriod('week');
  const range = periodRange(period.mode, period.anchor);

  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  const rows = state.installations
    .filter((i) => inRange(i.date, range))
    .map((i) => {
      const b = state.branches.find((x) => x.id === i.branchId);
      return { ...i, branchName: b?.name ?? 'فرع محذوف', governorate: b?.governorate ?? '—' };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalPrinters = rows.reduce((s, r) => s + Number(r.printers), 0);
  const totalAmount = rows.reduce((s, r) => s + installAmount(r), 0);
  const week = period.mode === 'week' ? weekSummary(state, period.anchor) : null;

  const openNew = () => {
    setErrors({});
    setForm({ date: today(), branchId: '', printers: '', rate: String(state.settings.dailyRate) });
  };
  const openEdit = (r) => {
    setErrors({});
    setForm({ ...r, printers: String(r.printers), rate: String(r.rate) });
  };
  const close = () => setForm(null);
  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) return setErrors(errs);
    saveInstallation({
      id: form.id,
      date: form.date,
      branchId: form.branchId,
      printers: Number(form.printers),
      rate: Number(form.rate),
    });
    close();
  };

  const remove = (id) => {
    if (window.confirm('تحذف التسجيل ده؟')) deleteInstallation(id);
  };

  return (
    <>
      <PageHeader
        title="تسجيل التركيبات"
        subtitle="عدد الطابعات اللي اتركبت كل يوم"
        action={
          <button className="btn primary" onClick={openNew}>
            <Plus size={16} aria-hidden="true" /> تسجيل تركيب
          </button>
        }
      />

      <div className="toolbar">
        <PeriodSelector {...period} />
      </div>

      <div className="kpi-grid">
        <KpiCard label="عدد الطابعات" value={totalPrinters} />
        <KpiCard label="المستحق للفترة" value={money(totalAmount)} />
        {week && (
          <KpiCard
            label="الدفعة الأسبوعية"
            value={money(week.advance)}
            hint={`الباقي ${money(week.balance)} آخر الشهر`}
          />
        )}
      </div>

      <Card>
        {rows.length ? (
          <DataTable
            columns={COLUMNS}
            rows={rows}
            rowKey={(r) => r.id}
            actions={(r) => (
              <div className="row-actions">
                <button className="icon-btn" onClick={() => openEdit(r)} aria-label="تعديل">
                  <Pencil size={16} />
                </button>
                <button className="icon-btn danger" onClick={() => remove(r.id)} aria-label="حذف">
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          />
        ) : (
          <EmptyState
            title="مفيش تركيبات في الفترة دي"
            text="سجّل أول تركيب، والمبلغ هيتحسب تلقائي."
            action={<button className="btn primary" onClick={openNew}>تسجيل تركيب</button>}
          />
        )}
      </Card>

      <Modal
        open={!!form}
        title={form?.id ? 'تعديل التركيب' : 'تسجيل تركيب جديد'}
        onClose={close}
        footer={
          <>
            <button className="btn ghost" onClick={close}>إلغاء</button>
            <button className="btn primary" type="submit" form="install-form">حفظ</button>
          </>
        }
      >
        {form &&
          (state.branches.length ? (
            <form id="install-form" className="form-grid" onSubmit={submit} noValidate>
              <Field label="التاريخ" error={errors.date}>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={(e) => update('date', e.target.value)}
                  aria-invalid={!!errors.date}
                />
              </Field>
              <Field label="الفرع" error={errors.branchId}>
                <select
                  className="input"
                  value={form.branchId}
                  onChange={(e) => update('branchId', e.target.value)}
                  aria-invalid={!!errors.branchId}
                >
                  <option value="">اختار الفرع</option>
                  {state.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} - {b.governorate}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="عدد الطابعات" error={errors.printers}>
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  className="input"
                  value={form.printers}
                  onChange={(e) => update('printers', e.target.value)}
                  aria-invalid={!!errors.printers}
                />
              </Field>
              <Field label="سعر الطابعة (ج.م)" error={errors.rate}>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={form.rate}
                  onChange={(e) => update('rate', e.target.value)}
                  aria-invalid={!!errors.rate}
                />
              </Field>
              <div className="form-total">
                الإجمالي: {money((Number(form.printers) || 0) * (Number(form.rate) || 0))}
              </div>
            </form>
          ) : (
            <EmptyState
              title="أضف فرع الأول"
              text="لازم يكون فيه فرع مسجل قبل ما تسجل تركيب."
            />
          ))}
      </Modal>
    </>
  );
}
