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
  'Other / Custom Bank',
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

export function formatExpiryInput(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

export const EXPENSE_CATS = ['Rent', 'Food', 'Transport', 'Utilities', 'Medical', 'Clothing', 'Personal', 'Other'];
