export function fmt(n: number | string | null | undefined, dec = 2): string {
  if (n === null || n === undefined || n === '') return '–';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '–';
  return '$' + num.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '–';
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

export function fmtDateShort(s: string | null | undefined): string {
  if (!s) return '–';
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
}

export function plClass(v: number | string): string {
  return parseFloat(String(v)) >= 0 ? 'text-gain' : 'text-loss';
}

export function plSign(v: number): string {
  return v >= 0 ? '+' : '';
}
