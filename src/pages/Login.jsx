import { useState } from 'react';
import { Printer } from 'lucide-react';
import { useAuth } from '../auth';
import { Field } from '../components/ui';

export default function Login() {
  const { signIn, notice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError('اكتب الإيميل والباسورد');
    setBusy(true);
    setError('');
    const err = await signIn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(
        /invalid/i.test(err.message)
          ? 'الإيميل أو الباسورد غلط'
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

        <Field label="الإيميل">
          <input
            type="email"
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
