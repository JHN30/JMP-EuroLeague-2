const EM_DASH = "—";

export function formatMissing(value) {
  if (value === null || value === undefined) return EM_DASH;
  return value;
}

export function formatPerGame(value) {
  const missing = formatMissing(value);
  if (missing === EM_DASH) return missing;
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(1) : missing;
}

export function formatCount(value) {
  const missing = formatMissing(value);
  if (missing === EM_DASH) return missing;
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString() : missing;
}

export function formatSignedDiff(value) {
  const missing = formatMissing(value);
  if (missing === EM_DASH) return missing;
  const num = Number(value);
  if (!Number.isFinite(num)) return missing;
  return num > 0 ? `+${num}` : String(num);
}

export function formatPercentage(value) {
  const missing = formatMissing(value);
  if (missing === EM_DASH) return missing;
  const num = Number(value);
  return Number.isFinite(num) ? `${num.toFixed(1)}%` : missing;
}

// Advanced-stat values are numbers (or null); null is missing data and shows a dash, never 0.
export function formatDecimal(value, digits = 1) {
  if (value === null || value === undefined) return EM_DASH;
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : EM_DASH;
}

export function formatSignedDecimal(value, digits = 1) {
  const text = formatDecimal(value, digits);
  if (text === EM_DASH) return text;
  if (Number(text) === 0) return text.replace("-", "");
  return Number(text) > 0 ? `+${text}` : text;
}

// Shares such as eFG% arrive as fractions (0.565), not 0-100 values.
export function formatFractionPercent(value, digits = 1) {
  if (value === null || value === undefined) return EM_DASH;
  const num = Number(value);
  return Number.isFinite(num) ? `${(num * 100).toFixed(digits)}%` : EM_DASH;
}

export function formatMinutes(timePlayed) {
  const missing = formatMissing(timePlayed);
  if (missing === EM_DASH) return missing;
  const totalSeconds = Math.round(Number(timePlayed));
  if (!Number.isFinite(totalSeconds)) return missing;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDateTime(scheduledAt, { dateStyle = "medium" } = {}) {
  if (!scheduledAt) return "TBD";
  return new Date(scheduledAt).toLocaleString(undefined, {
    dateStyle,
    timeStyle: "short",
  });
}

export function formatDate(scheduledAt, { dateStyle = "medium" } = {}) {
  if (!scheduledAt) return "TBD";
  return new Date(scheduledAt).toLocaleDateString(undefined, { dateStyle });
}

export function formatShortDate(scheduledAt) {
  if (!scheduledAt) return "TBD";
  return new Date(scheduledAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function formatTimeOfDay(scheduledAt) {
  if (!scheduledAt) return "TBD";
  return new Date(scheduledAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatRound(roundNumber) {
  if (roundNumber === null || roundNumber === undefined) return EM_DASH;
  return `R${roundNumber}`;
}

export function formatSeasonLabel(seasonCode) {
  const match = /^[A-Za-z]+(\d{4})$/.exec(seasonCode ?? "");
  if (!match) return seasonCode ?? EM_DASH;
  const startYear = Number(match[1]);
  const endYearSuffix = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYearSuffix}`;
}

const PERIOD_LABELS = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4" };

export function formatPeriod(periodNumber) {
  if (periodNumber === null || periodNumber === undefined) return EM_DASH;
  if (PERIOD_LABELS[periodNumber]) return PERIOD_LABELS[periodNumber];
  const overtimeNumber = periodNumber - 4;
  return overtimeNumber > 0 ? `OT${overtimeNumber}` : String(periodNumber);
}

export function initialsFor(name) {
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
