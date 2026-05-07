/**
 * Returns true when the app is running on localhost (dev / local testing).
 * Safe to call in client components — always returns false during SSR.
 */
export function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}
