/**
 * Rules for choosing a new password; mirrors newPasswordSchema in backend/src/validations/auth.ts.
 * Sign-in does not apply them, so accounts created before the rule keep working.
 */
export const PASSWORD_RULES: { id: string; label: string; message: string; test: (pw: string) => boolean }[] = [
  { id: 'length', label: '8+ characters', message: 'Password must be at least 8 characters.', test: pw => pw.length >= 8 },
  { id: 'letter', label: 'A letter', message: 'Password must include a letter.', test: pw => /[A-Za-z]/.test(pw) },
  { id: 'number', label: 'A number', message: 'Password must include a number.', test: pw => /\d/.test(pw) },
  { id: 'special', label: 'A special character', message: 'Password must include a special character.', test: pw => /[^A-Za-z0-9]/.test(pw) },
];

/** The first rule a new password breaks, or null when it is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length > 128) return 'Password must be at most 128 characters.';
  return PASSWORD_RULES.find(rule => !rule.test(password))?.message ?? null;
}
