// Edge Function: admin user management.
// Deploy: supabase functions deploy admin-users
// Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to functions automatically.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  // Service role client: bypasses RLS. Used only after the caller is verified as an admin.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
  const caller = userData.user;

  const { data: me } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', caller.id)
    .maybeSingle();
  if (!me || me.role !== 'admin' || !me.active) return json({ error: 'Forbidden' }, 403);

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === 'create') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.fullName || '').trim();
    if (!email.includes('@')) return json({ error: 'الإيميل مش صحيح' }, 400);
    if (!fullName) return json({ error: 'اكتب الاسم' }, 400);
    if (password.length < 8) return json({ error: 'الباسورد لازم تكون 8 حروف على الأقل' }, 400);

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return json({ error: error.message }, 400);

    const { error: pErr } = await admin.from('profiles').insert({
      id: created.user.id,
      email,
      full_name: fullName,
      role: 'technician',
      active: true,
    });
    if (pErr) {
      // Roll back so we don't leave an auth user without a profile.
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: pErr.message }, 400);
    }
    return json({ ok: true, id: created.user.id });
  }

  const userId = String(body.userId || '');
  if (!userId) return json({ error: 'userId مطلوب' }, 400);
  if (userId === caller.id) return json({ error: 'مينفعش تعدّل حسابك من هنا' }, 400);

  if (action === 'set_active') {
    const active = Boolean(body.active);
    const { error: pErr } = await admin.from('profiles').update({ active }).eq('id', userId);
    if (pErr) return json({ error: pErr.message }, 400);
    // A banned user cannot sign in or refresh their session.
    const { error } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: active ? 'none' : '876000h',
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (action === 'reset_password') {
    const password = String(body.password || '');
    if (password.length < 8) return json({ error: 'الباسورد لازم تكون 8 حروف على الأقل' }, 400);
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: 'action غير معروف' }, 400);
});
