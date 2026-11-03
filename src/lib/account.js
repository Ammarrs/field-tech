export const USERNAME_DOMAIN = 'fieldtech.app';

// Users type a username. Internally Supabase Auth uses username@domain.
// If the input already contains "@" (old accounts), it's used as-is.
export const toLoginEmail = (value) => {
  const v = value.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${USERNAME_DOMAIN}`;
};