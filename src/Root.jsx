import { useAuth } from './auth';
import { StoreProvider } from './store';
import App from './App';
import Login from './pages/Login';

export default function Root() {
  const { session, profile, loading } = useAuth();

  if (loading) return <div className="splash">جاري التحميل…</div>;
  if (!session || !profile) return <Login />;

  return (
    <StoreProvider userId={session.user.id}>
      <App profile={profile} />
    </StoreProvider>
  );
}
