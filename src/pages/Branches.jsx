import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import {
  Badge, EmptyState, Field, Modal, PageHeader, SearchInput,
} from '../components/ui';
import { GOVERNORATES, formatDate, today } from '../lib/format';

const STATUS = {
  installed: { label: 'تم التركيب', tone: 'success' },
  pending: { label: 'في الانتظار', tone: 'warning' },
  issue: { label: 'بها مشكلة', tone: 'danger' },
};

const emptyForm = () => ({
  name: '', governorate: '', floor: '', room: '', rack: '', installDate: today(), status: 'installed',
});

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'اكتب اسم الفرع';
  if (!f.governorate) e.governorate = 'اختار المحافظة';
  return e;
}

export default function Branches() {
  const { state, saveBranch, deleteBranch } = useStore();
  const [q, setQ] = useState('');
  const [gov, setGov] = useState('');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  const branches = useMemo(
    () =>
      state.branches
        .filter((b) => (!gov || b.governorate === gov) && b.name.includes(q.trim()))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [state.branches, q, gov]
  );

  const openNew = () => {
    setErrors({});
    setForm(emptyForm());
  };
  const openEdit = (b) => {
    setErrors({});
    setForm({ ...b });
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
    saveBranch({ ...form, name: form.name.trim() });
    close();
  };

  const remove = (id) => {
    if (window.confirm('تحذف الفرع ده؟')) deleteBranch(id);
  };

  return (
    <>
      <PageHeader
        title="الفروع والسويتشات"
        subtitle="مكان السويتش في كل فرع وحالة التركيب"
        action={
          <button className="btn primary" onClick={openNew}>
            <Plus size={16} aria-hidden="true" /> إضافة فرع
          </button>
        }
      />

      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="ابحث باسم الفرع" />
        <select className="input filter-select" value={gov} onChange={(e) => setGov(e.target.value)} aria-label="فلتر المحافظة">
          <option value="">كل المحافظات</option>
          {GOVERNORATES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {branches.length ? (
        <div className="branch-grid">
          {branches.map((b) => {
            const st = STATUS[b.status] || STATUS.pending;
            return (
              <article className="branch-card" key={b.id}>
                <header className="row-between">
                  <h3>{b.name}</h3>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </header>
                <p className="muted">{b.governorate}</p>
                <dl>
                  <dt>الدور</dt>
                  <dd>{b.floor || '—'}</dd>
                  <dt>الغرفة</dt>
                  <dd>{b.room || '—'}</dd>
                  <dt>الرف</dt>
                  <dd>{b.rack || '—'}</dd>
                  <dt>تاريخ التركيب</dt>
                  <dd>{b.installDate ? formatDate(b.installDate) : '—'}</dd>
                </dl>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => openEdit(b)} aria-label="تعديل الفرع">
                    <Pencil size={16} />
                  </button>
                  <button className="icon-btn danger" onClick={() => remove(b.id)} aria-label="حذف الفرع">
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={state.branches.length ? 'مفيش فروع بالفلتر ده' : 'لسه مفيش فروع'}
          text={state.branches.length ? 'جرّب تغيّر البحث أو المحافظة.' : 'ضيف أول فرع وحدد مكان السويتش فيه.'}
          action={!state.branches.length && <button className="btn primary" onClick={openNew}>إضافة فرع</button>}
        />
      )}

      <Modal
        open={!!form}
        title={form?.id ? 'تعديل الفرع' : 'إضافة فرع'}
        onClose={close}
        footer={
          <>
            <button className="btn ghost" onClick={close}>إلغاء</button>
            <button className="btn primary" type="submit" form="branch-form">حفظ</button>
          </>
        }
      >
        {form && (
          <form id="branch-form" className="form-grid" onSubmit={submit} noValidate>
            <Field label="اسم الفرع" error={errors.name} full>
              <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} aria-invalid={!!errors.name} />
            </Field>
            <Field label="المحافظة" error={errors.governorate}>
              <select className="input" value={form.governorate} onChange={(e) => update('governorate', e.target.value)} aria-invalid={!!errors.governorate}>
                <option value="">اختار المحافظة</option>
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="الحالة">
              <select className="input" value={form.status} onChange={(e) => update('status', e.target.value)}>
                {Object.entries(STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Field>
            <Field label="الدور">
              <input className="input" value={form.floor} onChange={(e) => update('floor', e.target.value)} />
            </Field>
            <Field label="الغرفة">
              <input className="input" value={form.room} onChange={(e) => update('room', e.target.value)} />
            </Field>
            <Field label="الرف (Rack)">
              <input className="input" value={form.rack} onChange={(e) => update('rack', e.target.value)} />
            </Field>
            <Field label="تاريخ التركيب">
              <input type="date" className="input" value={form.installDate} onChange={(e) => update('installDate', e.target.value)} />
            </Field>
          </form>
        )}
      </Modal>
    </>
  );
}
