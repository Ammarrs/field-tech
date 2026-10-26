import { useState } from 'react';
import {
  LayoutDashboard, Printer, Receipt, Store, Wallet, History as HistoryIcon,
  Settings as SettingsIcon, Menu, Moon, Sun, LogOut, ShieldCheck, Users,
} from 'lucide-react';
import { useStore } from './store';
import { useAuth } from './auth';
import Dashboard from './pages/Dashboard';
import Installations from './pages/Installations';
import Expenses from './pages/Expenses';
import Branches from './pages/Branches';
import Payments from './pages/Payments';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';

const NAV = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard, page: Dashboard },
  { id: 'installations', label: 'تسجيل التركيبات', icon: Printer, page: Installations },
  { id: 'expenses', label: 'المصاريف', icon: Receipt, page: Expenses },
  { id: 'branches', label: 'الفروع والسويتشات', icon: Store, page: Branches },
  { id: 'payments', label: 'المدفوعات', icon: Wallet, page: Payments },
  { id: 'history', label: 'سجل الزيارات', icon: HistoryIcon, page: HistoryPage },
  { id: 'settings', label: 'الإعدادات', icon: SettingsIcon, page: SettingsPage },
];

const ADMIN_NAV = [
  { id: 'admin-dashboard', label: 'نشاط المستخدمين', icon: ShieldCheck, page: AdminDashboard },
  { id: 'admin-users', label: 'إدارة المستخدمين', icon: Users, page: AdminUsers },
];

export default function App({ profile }) {
  const { state, loading, error, clearError, toggleTheme } = useStore();
  const { signOut } = useAuth();
  const [active, setActive] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdmin = profile.role === 'admin';
  const allNav = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;
  const current = allNav.find((n) => n.id === active) ?? NAV[0];
  const Page = current.page;
  const isDark = state.theme === 'dark';

  const go = (id) => {
    setActive(id);
    setDrawerOpen(false);
  };

  const renderItem = (n) => (
    <button
      key={n.id}
      className={`nav-item ${active === n.id ? 'active' : ''}`}
      onClick={() => go(n.id)}
      aria-current={active === n.id ? 'page' : undefined}
    >
      <n.icon size={18} aria-hidden="true" />
      <span>{n.label}</span>
    </button>
  );

  if (loading) return <div className="splash">جاري تحميل بياناتك…</div>;

  return (
    <div className="app">
      <aside className={`sidebar ${drawerOpen ? 'open' : ''}`} aria-label="القائمة الرئيسية">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><Printer size={20} /></div>
          <div>
            <strong>متابعة الشغل</strong>
            <small>فني تركيب طابعات</small>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(renderItem)}
          {isAdmin && <span className="nav-group">الأدمن</span>}
          {isAdmin && ADMIN_NAV.map(renderItem)}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <strong>{profile.full_name}</strong>
            <div className="meta">{profile.email}</div>
          </div>
          <button className="btn ghost" onClick={toggleTheme}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
          </button>
          <button className="btn ghost" onClick={signOut}>
            <LogOut size={16} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {drawerOpen && <div className="scrim" onClick={() => setDrawerOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setDrawerOpen(true)} aria-label="فتح القائمة">
            <Menu size={20} />
          </button>
          <h1>{current.label}</h1>
        </header>
        <main className="content">
          {error && (
            <div className="alert alert-danger banner" role="alert">
              <span>{error}</span>
              <button className="btn ghost small" onClick={clearError}>إغلاق</button>
            </div>
          )}
          <Page />
        </main>
      </div>
    </div>
  );
}
