/** Accounts without a real mailbox (students, phone-only parents) sign in with school code + ID. */
export function loginEmail(schoolCode: string, id: string) {
  const clean = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${clean(id)}@${clean(schoolCode)}.login.portal`;
}
export const isRealEmail = (e?: string | null) => !!e && !e.endsWith('.login.portal');
