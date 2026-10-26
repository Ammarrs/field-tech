import { useState } from 'react';
import { useStore } from '../store';
import { Card, Field, PageHeader, Switch } from '../components/ui';

export default function SettingsPage() {
  const { state, setSettings, toggleTheme, resetAll } = useStore();
  const [form, setForm] = useState({
    dailyRate: String(state.settings.dailyRate),
    payPercent: String(state.settings.payPercent),
  });
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setSaved(false);
  };

  const save = (e) => {
    e.preventDefault();
    const rate = Number(form.dailyRate);
    const pct = Number(form.payPercent);
    const errs = {};
    if (!(rate > 0)) errs.dailyRate = 'ادخل سعر أكبر من صفر';
    if (form.payPercent === '' || !(pct >= 0 && pct <= 100)) errs.payPercent = 'النسبة لازم تكون بين 0 و 100';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSettings({ dailyRate: rate, payPercent: pct });
    setSaved(true);
  };

  const reset = () => {
    if (window.confirm('متأكد؟ كل البيانات هتتمسح ومينفعش ترجع.')) resetAll();
  };

  return (
    <>
      <PageHeader title="الإعدادات" subtitle="الأسعار ونسبة الدفع والعرض" />

      <Card title="الأسعار والدفع">
        <form onSubmit={save} noValidate className="form-grid">
          <Field label="سعر الطابعة في اليوم (ج.م)" error={errors.dailyRate}>
            <input
              type="number"
              min="1"
              className="input"
              value={form.dailyRate}
              onChange={(e) => update('dailyRate', e.target.value)}
              aria-invalid={!!errors.dailyRate}
            />
          </Field>
          <Field label="نسبة الدفعة الأسبوعية (%)" error={errors.payPercent}>
            <input
              type="number"
              min="0"
              max="100"
              className="input"
              value={form.payPercent}
              onChange={(e) => update('payPercent', e.target.value)}
              aria-invalid={!!errors.payPercent}
            />
          </Field>
          <p className="muted full">
            التغيير في السعر بيطبق على التركيبات الجديدة بس. التركيبات القديمة بتفضل بالسعر اللي اتسجلت بيه.
          </p>
          <div className="full row-actions-left">
            <button className="btn primary" type="submit">حفظ الإعدادات</button>
            {saved && <span className="badge badge-success">اتحفظ</span>}
          </div>
        </form>
      </Card>

      <Card title="المظهر">
        <Switch checked={state.theme === 'dark'} onChange={toggleTheme} label="الوضع الداكن" />
      </Card>

      <Card title="بيانات التطبيق">
        <p className="muted">كل البيانات محفوظة على الجهاز ده بس.</p>
        <div className="mt">
          <button className="btn danger" onClick={reset}>مسح كل البيانات</button>
        </div>
      </Card>
    </>
  );
}
