import { supabase } from './supabase';

// Calls the admin-users Edge Function. The user's session token is sent automatically.
export async function adminCall(body) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    let message = error.message;
    try {
      const json = await error.context.json();
      message = json.error || message;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  return data;
}
