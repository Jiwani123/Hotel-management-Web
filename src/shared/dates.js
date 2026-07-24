function isDateOnlyString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isValidDate(date) {
  return date instanceof Date && Number.isFinite(date.getTime());
}

/**
 * Parses either:
 * - YYYY-MM-DD (interpreted as LOCAL midnight)
 * - Any JS Date-parseable string (e.g., YYYY-MM-DDTHH:mm)
 */
export function parseDateInput(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (isDateOnlyString(raw)) {
    const [y, m, d] = raw.split("-").map((n) => Number(n));
    const dt = new Date(y, m - 1, d);
    return isValidDate(dt) ? dt : null;
  }

  const dt = new Date(raw);
  return isValidDate(dt) ? dt : null;
}

export function startOfLocalDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfTodayLocal() {
  return startOfLocalDay(new Date());
}
