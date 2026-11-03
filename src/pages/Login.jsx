import { useState } from 'react';
import { Printer } from 'lucide-react';
import { useAuth } from '../auth';
import { Field } from '../components/ui';
import { toLoginEmail } from '../lib/account';

export default function Login() {
  const { signIn, notice } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return setError('اكتب اسم المستخدم والباسورد');
    setBusy(true);
    setError('');
    const err = await signIn(toLoginEmail(username), password);
    setBusy(false);
    if (err) {
      setError(
        /invalid/i.test(err.message)
          ? 'اسم المستخدم أو الباسورد غلط'
          : 'حصلت مشكلة في تسجيل الدخول، حاول تاني'
      );
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><Printer size={20} /></div>
          <div>
            <strong>متابعة الشغل</strong>
            <small>سجّل دخول عشان تكمّل</small>
          </div>
        </div>

        {notice && <p className="alert alert-danger">{notice}</p>}

        <Field label="اسم المستخدم">
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        <Field label="كلمة السر">
          <input
            type="password"
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && <p className="alert alert-danger" role="alert">{error}</p>}

        <button className="btn primary block" type="submit" disabled={busy}>
          {busy ? 'جاري الدخول…' : 'دخول'}
        </button>
        <p className="meta">الحسابات بيضيفها الأدمن. مفيش تسجيل جديد من هنا.</p>
      </form>
    </div>
  );
}