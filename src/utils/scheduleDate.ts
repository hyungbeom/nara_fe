export function parseScheduleDateKey(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const isoMatch = normalized.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const compactMatch = normalized.match(/(\d{4})(\d{2})(\d{2})/);
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatScheduleDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  const dateKey = parseScheduleDateKey(value);
  if (!dateKey) {
    return value;
  }
  const timeMatch = value.match(/(\d{2}:\d{2})/);
  return timeMatch ? `${dateKey} ${timeMatch[1]}` : dateKey;
}
