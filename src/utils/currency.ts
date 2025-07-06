export function formatCurrency(amount: number, currency: string = 'USD') {
  // Use 'bn-BD' locale for BDT to get the correct symbol, but force
  // the numbering system to 'latn' (Latin/Arabic numerals) to keep English numbers.
  const locale = currency === 'BDT' ? 'bn-BD-u-nu-latn' : 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}