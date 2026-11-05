/** 1234.5 -> "€ 1.234,50" ; -3 -> "-€ 3,00" */
export function formatEUR(value: number): string {
  const neg = value < 0;
  const [int, dec] = Math.abs(value).toFixed(2).split('.');
  return `${neg ? '-' : ''}€ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}

/** "1.250,00" / "1250,5" / "€ 12" -> numero (2 decimali) oppure null se non valido */
export function parseEUR(input: string): number | null {
  let s = input.trim().replace(/€|\s/g, '');
  if (!s) return null;
  if (s.includes(',') || /^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100) / 100;
}
