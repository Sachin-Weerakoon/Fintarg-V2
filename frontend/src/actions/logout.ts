export async function logout() {
  return fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
}
