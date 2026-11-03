import { useState } from 'react';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import {
  Badge, Card, DataTable, EmptyState, Field, KpiCard, Modal, PageHeader, PeriodSelector, usePeriod,
} from '../components/ui';
import { categoryLabel, expenseAmount, expenseDetail, inRange } from '../lib/calc';
import { GOVERNORATES, formatDate, money, periodRange, today } from '../lib/format';

const BUILTIN = [
  { id: 'transport', name: 'مواصلات' },
  { id: 'tools', name: 'أدوات' },
];

const isBuiltin = (cat) => cat === 'transport' || cat === 'tools';

const emptyForm = () => ({
  id: undefined,
  date: today(),
  category: '',
  kind: '',
  governorate: '',
  branchId: '',
  fromPlace: '',
  toPlace: '',
  itemName: '',
  description: '',
  amount: '',
});

function validate(f) {
  const e = {};
  if (!f.category) e.category = 'اختار التصنيف الأول';
  if (!f.date) e.date = 'اختار التاريخ';
  if (!f.governorate) e.governorate = 'اختار المحافظة';
  if (!f.kind) e.kind = 'اختار نوع المصروف';
  if (f.category === 'transport') {
    if (!f.fromPlace.trim()) e.fromPlace = 'اكتب مكان البداية';
    if (!f.toPlace.trim()) e.toPlace = 'اكتب مكان الوصول';
  } else if (f.category === 'tools') {
    if (!f.itemName.trim()) e.itemName = 'اكتب اسم الأداة';
  } else if (f.category && !f.description.trim()) {
    e.description = 'اكتب وصف المصروف';
  }
  if (f.amount === '' || !(Number(f.amount) > 0)) e.amount = 'ادخل مبلغ أكبر من صفر';
  return e;
}

export default function Expenses() {
  const { state, saveExpense, deleteExpense, saveCategory, deleteCategory } = useStore();
  const period = usePeriod('month');
  const range = periodRange(period.mode, period.anchor);

  const [govFilter, setGovFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');

  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [catError, setCatError] = useState('');

  const categories = [...BUILTIN, ...state.categories];

  const rows = state.expenses
    .filter(
      (e) =>
        inRange(e.date, range) &&
        (!govFilter || e.governorate === govFilter) &&
        (!catFilter || e.category === catFilter) &&
        (!kindFilter || e.kind === kindFilter)
    )
    .map((e) => ({ ...e, branchName: state.branches.find((b) => b.id === e.branchId)?.name ?? '—' }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = rows.reduce((s, r) => s + expenseAmount(r), 0);
  const companyTotal = rows
    .filter((r) => r.kind === 'company')
    .reduce((s, r) => s + expenseAmount(r), 0);
  const personalTotal = total - companyTotal;

  const COLUMNS = [
    { key: 'date', label: 'التاريخ', render: (r) => formatDate(r.date) },
    { key: 'category', label: 'التصنيف', render: (r) => categoryLabel(state, r.category) },
    {
      key: 'kind',
      label: 'النوع',
      render: (r) => (
        <Badge tone={r.kind === 'company' ? 'success' : 'warning'}>
          {r.kind === 'company' ? 'على الشركة' : 'شخصي'}
        </Badge>
      ),
    },
    { key: 'details', label: 'التفاصيل', render: (r) => expenseDetail(state, r) },
    { key: 'governorate', label: 'المحافظة' },
    { key: 'branchName', label: 'الفرع' },
    { key: 'amount', label: 'المبلغ', render: (r) => money(expenseAmount(r)) },
  ];

  const openNew = () => {
    setErrors({});
    setForm(emptyForm());
  };
  const openEdit = (r) => {
    setErrors({});
    setForm({ ...emptyForm(), ...r, branchId: r.branchId || '', amount: String(r.amount) });
  };
  const close = () => setForm(null);

  const setField = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const setGov = (gov) => {
    setForm((f) => ({ ...f, governorate: gov, branchId: '' }));
    setErrors((e) => ({ ...e, governorate: undefined }));
  };

  // Tools have no default type, so the user must choose. Others default to personal.
  const pickCategory = (cat) => {
    setErrors((e) => ({ ...e, category: undefined }));
    setForm((f) => ({
      ...f,
      category: cat,
      kind: f.id ? f.kind : cat === 'tools' ? '' : 'personal',
    }));
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) return setErrors(errs);
    const cat = form.category;
    saveExpense({
      id: form.id,
      date: form.date,
      category: cat,
      kind: form.kind,
      governorate: form.governorate,
      branchId: form.branchId,
      fromPlace: cat === 'transport' ? form.fromPlace.trim() : '',
      toPlace: cat === 'transport' ? form.toPlace.trim() : '',
      itemName: cat === 'tools' ? form.itemName.trim() : '',
      description: !isBuiltin(cat) ? form.description.trim() : '',
      amount: Number(form.amount),
    });
    close();
  };

  const remove = (id) => {
    if (window.confirm('تحذف المصروف ده؟')) deleteExpense(id);
  };

  const addCategory = (e) => {
    e.preventDefault();
    const name = newCat.trim();
    if (!name) return setCatError('اكتب اسم التصنيف');
    if (categories.some((c) => c.name === name)) return setCatError('التصنيف ده موجود');
    saveCategory(name);
    setNewCat('');
    setCatError('');
  };

  const branchOptions = state.branches.filter(
    (b) => !form?.governorate || b.governorate === form.governorate
  );

  return (
    <>
      <PageHeader
        title="المصاريف"
        subtitle="مواصلات وأدوات وتصنيفات تانية"
        action={
          <div className="chip-row">
            <button className="btn" onClick={() => setCatOpen(true)}>
              <Tags size={16} aria-hidden="true" /> التصنيفات
            </button>
            <button className="btn primary" onClick={openNew}>
              <Plus size={16} aria-hidden="true" /> تسجيل مصروف
            </button>
          </div>
        }
      />

      <div className="toolbar">
        <PeriodSelector {...period} />
        <div className="chip-row">
          <select className="input filter-select" value={govFilter} onChange={(e) => setGovFilter(e.target.value)} aria-label="فلتر المحافظة">
            <option value="">كل المحافظات</option>
            {GOVERNORATES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select className="input filter-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="فلتر التصنيف">
            <option value="">كل التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="input filter-select" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label="فلتر النوع">
            <option value="">كل الأنواع</option>
            <option value="company">على الشركة</option>
            <option value="personal">شخصي</option>
          </select>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="إجمالي المصاريف" value={money(total)} />
        <KpiCard label="على الشركة (بتتضاف للمستحق)" value={money(companyTotal)} tone="success" />
        <KpiCard label="شخصي (بيتخصم من فلوسك)" value={money(personalTotal)} tone="warning" />
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
            text="سجّل مصروف، والمبالغ هتتحسب في الداشبورد والمدفوعات."
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
            <div className="full">
              <span className="field-label">التصنيف</span>
              <div className="chip-row">
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={`chip ${form.category === c.id ? 'on' : ''}`}
                    onClick={() => pickCategory(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              {errors.category && <span className="field-error" role="alert">{errors.category}</span>}
            </div>

            {form.category && (
              <>
                <Field label="التاريخ" error={errors.date}>
                  <input type="date" className="input" value={form.date} onChange={(e) => setField('date', e.target.value)} />
                </Field>

                <Field label="المحافظة" error={errors.governorate}>
                  <select className="input" value={form.governorate} onChange={(e) => setGov(e.target.value)}>
                    <option value="">اختار المحافظة</option>
                    {GOVERNORATES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </Field>

                <Field label="الفرع (اختياري)">
                  <select className="input" value={form.branchId} onChange={(e) => setField('branchId', e.target.value)}>
                    <option value="">بدون فرع</option>
                    {branchOptions.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </Field>

                <div className="full">
                  <span className="field-label">النوع</span>
                  <div className="chip-row">
                    <button
                      type="button"
                      className={`chip ${form.kind === 'company' ? 'on' : ''}`}
                      onClick={() => setField('kind', 'company')}
                    >
                      على الشركة (بتتضاف للمستحق)
                    </button>
                    <button
                      type="button"
                      className={`chip ${form.kind === 'personal' ? 'on' : ''}`}
                      onClick={() => setField('kind', 'personal')}
                    >
                      شخصي (بيتخصم من فلوسك)
                    </button>
                  </div>
                  {errors.kind && <span className="field-error" role="alert">{errors.kind}</span>}
                </div>

                {form.category === 'transport' && (
                  <>
                    <Field label="من" error={errors.fromPlace}>
                      <input className="input" value={form.fromPlace} onChange={(e) => setField('fromPlace', e.target.value)} placeholder="مثال: مطرية" />
                    </Field>
                    <Field label="إلى" error={errors.toPlace}>
                      <input className="input" value={form.toPlace} onChange={(e) => setField('toPlace', e.target.value)} placeholder="مثال: عبود" />
                    </Field>
                  </>
                )}

                {form.category === 'tools' && (
                  <Field label="اسم الأداة" error={errors.itemName} full>
                    <input className="input" value={form.itemName} onChange={(e) => setField('itemName', e.target.value)} />
                  </Field>
                )}

                {!isBuiltin(form.category) && (
                  <Field label="وصف المصروف" error={errors.description} full>
                    <input className="input" value={form.description} onChange={(e) => setField('description', e.target.value)} />
                  </Field>
                )}

                <Field label="السعر (ج.م)" error={errors.amount}>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    className="input"
                    value={form.amount}
                    onChange={(e) => setField('amount', e.target.value)}
                  />
                </Field>
              </>
            )}
          </form>
        )}
      </Modal>

      <Modal
        open={catOpen}
        title="التصنيفات"
        onClose={() => {
          setCatOpen(false);
          setCatError('');
        }}
        footer={
          <button className="btn primary" type="submit" form="cat-form">إضافة</button>
        }
      >
        <form id="cat-form" onSubmit={addCategory} noValidate>
          <Field label="اسم التصنيف الجديد" error={catError}>
            <input
              className="input"
              value={newCat}
              onChange={(e) => {
                setNewCat(e.target.value);
                setCatError('');
              }}
            />
          </Field>
        </form>

        {state.categories.length > 0 && (
          <div className="mt">
            <span className="field-label">التصنيفات المضافة</span>
            {state.categories.map((c) => (
              <div className="line" key={c.id}>
                <span>{c.name}</span>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => deleteCategory(c.id)}
                  aria-label="حذف التصنيف"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}