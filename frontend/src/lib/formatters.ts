/**
 * Shared formatting utilities used across pages.
 */

export const formatCurrency = (amount: number | string | null | undefined, currency: string = 'USD') => {
  if (amount === null || amount === undefined || amount === '') return '\u2014';
  let numericAmount: number;
  if (typeof amount === 'string') {
    const cleaned = amount.replace(/[^0-9.-]/g, '');
    numericAmount = parseFloat(cleaned);
  } else {
    numericAmount = amount;
  }
  if (isNaN(numericAmount)) return '\u2014';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${currency} ${numericAmount.toFixed(2)}`;
  }
};

export const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '\u2014';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
};

export const formatETDate = (dateString: string | null | undefined) => {
  if (!dateString) return '\u2014';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '\u2014';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const mmddyyyy = `${get('month')}-${get('day')}-${get('year')}`;
    return `${mmddyyyy} ${get('hour')}:${get('minute')} ${get('dayPeriod')} ET`;
  } catch {
    return dateString;
  }
};

export const getImageUrl = (path: string | null | undefined) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const apiBase = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1';
  const host = apiBase.replace('/api/v1', '');
  return `${host}${path}`;
};
