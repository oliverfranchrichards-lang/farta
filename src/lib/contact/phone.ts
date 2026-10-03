export function normalizeBrazilPhone(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return null;
}

export function formatBrazilPhone(value: string | null | undefined) {
  const digits = normalizeBrazilPhone(value);
  if (!digits) return null;
  const local = digits.slice(2);
  const area = local.slice(0, 2);
  const number = local.slice(2);
  return number.length === 9
    ? `(${area}) ${number.slice(0, 5)}-${number.slice(5)}`
    : `(${area}) ${number.slice(0, 4)}-${number.slice(4)}`;
}

export function whatsappUrl(value: string | null | undefined) {
  const digits = normalizeBrazilPhone(value);
  return digits ? `https://wa.me/${digits}` : null;
}
