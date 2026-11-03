// @ts-nocheck
// Edge Function: admin user management.
// Deploy: npx supabase functions deploy admin-users
import { createClient } from 'npm:@supabase/supabase-js@2';

const USERNAME_DOMAIN = 'fieldtech.app';

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
    const username = String(body.username || '').trim().toLowerCase();
    const fullName = String(body.fullName || '').trim();
    const password = String(body.password || '');

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      return json({ error: 'اسم المستخدم لازم يكون 3 لـ 30 حرف إنجليزي أو أرقام أو . _ -' }, 400);
    }
    if (!fullName) return json({ error: 'اكتب الاسم' }, 400);
    if (password.length < 8) return json({ error: 'الباسورد لازم تكون 8 حروف على الأقل' }, 400);

    const email = `${username}@${USERNAME_DOMAIN}`;

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (error) return json({ error: error.message }, 400);

    const { error: pErr } = await admin.from('profiles').insert({
      id: created.user.id,
      email,
      username,
      full_name: fullName,
      role: 'technician',
      active: true,
    });
    if (pErr) {
      // Roll back so we don't leave an auth user without a profile.
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: pErr.message.includes('duplicate') ? 'اسم المستخدم ده موجود' : pErr.message }, 400);
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