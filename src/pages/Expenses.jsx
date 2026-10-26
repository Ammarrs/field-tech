import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import {
  Card, DataTable, EmptyState, Field, KpiCard, Modal, PageHeader, PeriodSelector, usePeriod,
} from '../components/ui';
import { expenseTotal, inRange } from '../lib/calc';
import { GOVERNORATES, formatDate, money, periodRange, today, uid } from '../lib/format';

const emptyForm = () => ({
  date: today(),
  governorate: '',
  branchId: '',
  placeVisited: '',
  transport: '',
  tools: [],
});

function validate(f) {
  const e = {};
  if (!f.date) e.date = 'اختار التاريخ';
  if (!f.governorate) e.governorate = 'اختار المحافظة';
  if (f.transport !== '' && !(Number(f.transport) >= 0)) e.transport = 'ادخل مبلغ صحيح';
  const badTool = f.tools.some((t) => !t.name.trim() || t.price === '' || !(Number(t.price) >= 0));
  if (badTool) e.tools = 'كل أداة لازم يكون ليها اسم وسعر صحيح';
  return e;
}

export default function Expenses() {
  const { state, saveExpense, deleteExpense } = useStore();
  const period = usePeriod('month');
  const range = periodRange(period.mode, period.anchor);
  const [govFilter, setGovFilter] = useState('');

  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  const rows = state.expenses
    .filter((e) => inRange(e.date, range) && (!govFilter || e.governorate === govFilter))
    .map((e) => {
      const b = state.branches.find((x) => x.id === e.branchId);
      return { ...e, branchName: b?.name ?? '—', total: expenseTotal(e) };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const transportTotal = rows.reduce((s, r) => s + (Number(r.transport) || 0), 0);
  const toolsTotal = rows.reduce((s, r) => s + r.total - (Number(r.transport) || 0), 0);
  const grandTotal = transportTotal + toolsTotal;

  const COLUMNS = [
    { key: 'date', label: 'التاريخ', render: (r) => formatDate(r.date) },
    { key: 'governorate', label: 'المحافظة' },
    { key: 'branchName', label: 'الفرع' },
    { key: 'placeVisited', label: 'المكان', render: (r) => r.placeVisited || '—' },
    { key: 'transport', label: 'المواصلات', render: (r) => money(r.transport) },
    {
      key: 'tools',
      label: 'الأدوات',
      render: (r) =>
        r.tools?.length ? r.tools.map((t) => `${t.name} (${money(t.price)})`).join('، ') : '—',
    },
    { key: 'total', label: 'الإجمالي', render: (r) => money(r.total) },
  ];

  const openNew = () => {
    setErrors({});
    setForm(emptyForm());
  };
  const openEdit = (r) => {
    setErrors({});
    setForm({
      ...r,
      transport: r.transport === '' || r.transport == null ? '' : String(r.transport),
      tools: (r.tools || []).map((t) => ({ ...t, price: String(t.price) })),
    });
  };
  const close = () => setForm(null);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const setGov = (gov) => {
    setForm((f) => ({ ...f, governorate: gov, branchId: '' }));
    setErrors((e) => ({ ...e, governorate: undefined }));
  };

  const addTool = () =>
    setForm((f) => ({ ...f, tools: [...f.tools, { id: uid(), name: '', price: '' }] }));
  const setTool = (i, k, v) =>
    setForm((f) => ({
      ...f,
      tools: f.tools.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)),
    }));
  const removeTool = (i) =>
    setForm((f) => ({ ...f, tools: f.tools.filter((_, idx) => idx !== i) }));

  const submit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) return setErrors(errs);
    saveExpense({
      id: form.id,
      date: form.date,
      governorate: form.governorate,
      branchId: form.branchId,
      placeVisited: form.placeVisited.trim(),
      transport: Number(form.transport) || 0,
      tools: form.tools.map((t) => ({ id: t.id, name: t.name.trim(), price: Number(t.price) || 0 })),
    });
    close();
  };

  const remove = (id) => {
    if (window.confirm('تحذف المصروف ده؟')) deleteExpense(id);
  };

  const branchOptions = state.branches.filter((b) => !form?.governorate || b.governorate === form.governorate);

  return (
    <>
      <PageHeader
        title="المصاريف"
        subtitle="المواصلات والأماكن والأدوات اللي اشتريتها"
        action={
          <button className="btn primary" onClick={openNew}>
            <Plus size={16} aria-hidden="true" /> تسجيل مصروف
          </button>
        }
      />

      <div className="toolbar">
        <PeriodSelector {...period} />
        <select
          className="input filter-select"
          value={govFilter}
          onChange={(e) => setGovFilter(e.target.value)}
          aria-label="فلتر المحافظة"
        >
          <option value="">كل المحافظات</option>
          {GOVERNORATES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div className="kpi-grid">
        <KpiCard label="المواصلات" value={money(transportTotal)} />
        <KpiCard label="الأدوات" value={money(toolsTotal)} />
        <KpiCard label="الإجمالي" value={money(grandTotal)} tone="warning" />
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
            title="مفيش مصاريف في الفترة دي"
            text="سجّل المواصلات والأدوات عشان تحسب إجمالي المصاريف."
            action={<button className="btn primary" onClick={openNew}>تسجيل مصروف</button>}
          />
        )}
      </Card>

      <Modal
        open={!!form}
        title={form?.id ? 'تعديل المصروف' : 'تسجيل مصروف جديد'}
        onClose={close}
        footer={
          <>
            <button className="btn ghost" onClick={close}>إلغاء</button>
            <button className="btn primary" type="submit" form="expense-form">حفظ</button>
          </>
        }
      >
        {form && (
          <form id="expense-form" className="form-grid" onSubmit={submit} noValidate>
            <Field label="التاريخ" error={errors.date}>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
              />
            </Field>
            <Field label="المحافظة" error={errors.governorate}>
              <select
                className="input"
                value={form.governorate}
                onChange={(e) => setGov(e.target.value)}
              >
                <option value="">اختار المحافظة</option>
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="الفرع (اختياري)">
              <select
                className="input"
                value={form.branchId}
                onChange={(e) => update('branchId', e.target.value)}
              >
                <option value="">بدون فرع</option>
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label="المكان اللي روحته">
              <input
                className="input"
                value={form.placeVisited}
                onChange={(e) => update('placeVisited', e.target.value)}
                placeholder="مثال: محل الكابلات بشارع..."
              />
            </Field>
            <Field label="تكلفة المواصلات (ج.م)" error={errors.transport}>
              <input
                type="number"
                min="0"
                className="input"
                value={form.transport}
                onChange={(e) => update('transport', e.target.value)}
              />
            </Field>

            <div className="full tools-editor">
              <span className="field-label">الأدوات اللي اشتريتها</span>
              {form.tools.map((t, i) => (
                <div className="tool-row" key={t.id}>
                  <input
                    className="input"
                    placeholder="اسم الأداة"
                    value={t.name}
                    onChange={(e) => setTool(i, 'name', e.target.value)}
                    aria-label={`اسم الأداة ${i + 1}`}
                  />
                  <input
                    type="number"
                    min="0"
                    className="input"
                    placeholder="السعر"
                    value={t.price}
                    onChange={(e) => setTool(i, 'price', e.target.value)}
                    aria-label={`سعر الأداة ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => removeTool(i)}
                    aria-label="حذف الأداة"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn ghost small add-tool" onClick={addTool}>
                <Plus size={14} aria-hidden="true" /> إضافة أداة
              </button>
              {errors.tools && <span className="field-error" role="alert">{errors.tools}</span>}
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
