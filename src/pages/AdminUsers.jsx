import { useEffect, useState } from 'react';
import { KeyRound, Power, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { adminCall } from '../lib/adminApi';
import { useAuth } from '../auth';
import { Badge, Card, DataTable, Field, Modal, PageHeader } from '../components/ui';

const fmtDate = (iso) => new Date(iso).toLocaleDateString('ar-EG', { dateStyle: 'medium' });
const emptyForm = { email: '', fullName: '', password: '' };

export default function AdminUsers() {
  const { profile: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetFor, setResetFor] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const load = async () => {
    const { data, error: e } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (e) setError(e.message);
    else setUsers(data);
  };

  useEffect(() => {
    load();
  }, []);

  // Runs an admin action, then reloads the list.
  const run = async (fn, okMessage) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(okMessage);
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    if (!form.email.includes('@')) return setError('اكتب إيميل صحيح');
    if (!form.fullName.trim()) return setError('اكتب اسم الفني');
    if (form.password.length < 8) return setError('الباسورد لازم تكون 8 حروف على الأقل');
    const ok = await run(
      () => adminCall({ action: 'create', ...form }),
      'اتضاف المستخدم. ابعتله الإيميل والباسورد.'
    );
    if (ok) setForm(emptyForm);
  };

  const toggleActive = (u) =>
    run(
      () => adminCall({ action: 'set_active', userId: u.id, active: !u.active }),
      u.active ? 'الحساب اتوقف' : 'الحساب اتفعّل'
    );

  const resetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) return setError('الباسورد لازم تكون 8 حروف على الأقل');
    const ok = await run(
      () => adminCall({ action: 'reset_password', userId: resetFor.id, password: newPassword }),
      'اتغيرت الباسورد'
    );
    if (ok) {
      setResetFor(null);
      setNewPassword('');
    }
  };

  const closeReset = () => {
    setResetFor(null);
    setNewPassword('');
    setError('');
  };

  const COLUMNS = [
    {
      key: 'full_name',
      label: 'الاسم',
      render: (u) => (
        <div>
          <strong>{u.full_name}</strong>
          <div className="meta">{u.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'الدور',
      render: (u) => <Badge tone={u.role === 'admin' ? 'warning' : 'neutral'}>{u.role === 'admin' ? 'أدمن' : 'فني'}</Badge>,
    },
    {
      key: 'active',
      label: 'الحالة',
      render: (u) => <Badge tone={u.active ? 'success' : 'danger'}>{u.active ? 'نشط' : 'موقوف'}</Badge>,
    },
    { key: 'created_at', label: 'تاريخ الإضافة', render: (u) => fmtDate(u.created_at) },
  ];

  return (
    <>
      <PageHeader title="إدارة المستخدمين" subtitle="إضافة الفنيين وإيقاف الحسابات وتغيير الباسورد" />

      {(error || notice) && (
        <p className={`alert ${error ? 'alert-danger' : ''}`} role={error ? 'alert' : 'status'}>
          {error || notice}
        </p>
      )}

      <Card title="إضافة مستخدم جديد">
        <form className="form-grid" onSubmit={create} noValidate>
          <Field label="الاسم">
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </Field>
          <Field label="الإيميل">
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="الباسورد المبدئية (8 حروف على الأقل)" full>
            <input type="text" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          </Field>
          <div className="full">
            <button className="btn primary" type="submit" disabled={busy}>
              <UserPlus size={16} aria-hidden="true" /> إضافة المستخدم
            </button>
          </div>
        </form>
      </Card>

      <Card title="المستخدمين">
        <DataTable
          columns={COLUMNS}
          rows={users}
          rowKey={(u) => u.id}
          actions={(u) => {
            const self = u.id === me.id;
            return (
              <div className="row-actions">
                <button
                  className="icon-btn"
                  onClick={() => toggleActive(u)}
                  disabled={self || busy}
                  aria-label={u.active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                  title={self ? 'مينفعش تعدّل حسابك' : u.active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                >
                  <Power size={16} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => { setResetFor(u); setError(''); }}
                  disabled={self || busy}
                  aria-label="تغيير الباسورد"
                  title="تغيير الباسورد"
                >
                  <KeyRound size={16} />
                </button>
              </div>
            );
          }}
        />
      </Card>

      <Modal
        open={!!resetFor}
        title={`تغيير باسورد ${resetFor?.full_name ?? ''}`}
        onClose={closeReset}
        footer={
          <>
            <button className="btn ghost" onClick={closeReset}>إلغاء</button>
            <button className="btn primary" type="submit" form="reset-form" disabled={busy}>حفظ</button>
          </>
        }
      >
        {error && <p className="alert alert-danger" role="alert">{error}</p>}
        <form id="reset-form" onSubmit={resetPassword} noValidate>
          <Field label="الباسورد الجديدة (8 حروف على الأقل)">
            <input type="text" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </Field>
        </form>
      </Modal>
    </>
  );
}
