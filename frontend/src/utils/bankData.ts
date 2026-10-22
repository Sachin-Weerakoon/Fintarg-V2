export const SRI_LANKAN_BANKS = [
  'Commercial Bank of Ceylon',
  'Sampath Bank',
  'Bank of Ceylon (BOC)',
  'Hatton National Bank (HNB)',
  'People\'s Bank',
  'Nations Trust Bank (NTB)',
  'Seylan Bank',
  'National Development Bank (NDB)',
  'DFCC Bank',
  'Pan Asia Bank',
  'Union Bank of Colombo',
  'Amana Bank',
  'Cargills Bank',
  'Standard Chartered Bank',
  'HSBC Sri Lanka',
  'Other Bank',
];

export const SRI_LANKAN_BANK_DETAILS: Record<string, { swift: string; code: string }> = {
  'Commercial Bank of Ceylon': { swift: 'COMB-LK-LX', code: '7083' },
  'Sampath Bank': { swift: 'BSAM-LK-LX', code: '7278' },
  'Bank of Ceylon (BOC)': { swift: 'BCEY-LK-LX', code: '7010' },
  'Hatton National Bank (HNB)': { swift: 'HBLI-LK-LX', code: '7056' },
  'People\'s Bank': { swift: 'PSB-LK-LX', code: '7135' },
  'Nations Trust Bank (NTB)': { swift: 'NTBL-LK-LX', code: '7162' },
  'Seylan Bank': { swift: 'SEYB-LK-LX', code: '7287' },
  'National Development Bank (NDB)': { swift: 'NDBE-LK-LX', code: '7214' },
  'DFCC Bank': { swift: 'DFCC-LK-LX', code: '7461' },
  'Pan Asia Bank': { swift: 'PABC-LK-LX', code: '7302' },
  'Union Bank of Colombo': { swift: 'UBC-LK-LX', code: '7311' },
  'Amana Bank': { swift: 'AMNB-LK-LX', code: '7470' },
  'Cargills Bank': { swift: 'CAGB-LK-LX', code: '7489' },
  'Standard Chartered Bank': { swift: 'SCBL-LK-LX', code: '7038' },
  'HSBC Sri Lanka': { swift: 'HSBC-LK-LX', code: '7047' },
};

export function detectCardNetwork(numberStr: string): 'visa' | 'mastercard' | 'amex' | 'other' {
  const clean = numberStr.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
  if (/^3[47]/.test(clean)) return 'amex';
  return 'other';
}

export function formatCardNumberInput(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** Luhn checksum, which every real Visa, Mastercard and Amex number passes. */
export function isValidCardNumber(numberStr: string): boolean {
  const digits = numberStr.replace(/\s+/g, '');
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Amex prints a 4-digit security code; every other network uses 3. */
export function cvvLength(network?: string): 3 | 4 {
  return network === 'amex' ? 4 : 3;
}

/** 'MM/YY' -> null when valid and not expired, otherwise the reason. Cards stay valid through their expiry month. */
export function expiryProblem(expiry: string, now: Date = new Date()): string | null {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return 'Enter the expiry date as MM/YY.';
  const month = Number(match[1]);
  if (month < 1 || month > 12) return 'Expiry month must be from 01 to 12.';
  const year = 2000 + Number(match[2]);
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
    return 'This card has expired.';
  }
  return null;
}

export function formatExpiryInput(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

export const EXPENSE_CATS = ['Rent', 'Food', 'Transport', 'Utilities', 'Medical', 'Clothing', 'Personal', 'Other'];
