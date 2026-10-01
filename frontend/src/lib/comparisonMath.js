export function winnerSide(rawA, rawB, direction) {
  if (direction === "neutral" || !direction) return null;
  const a = Number(rawA);
  const b = Number(rawB);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
  if (direction === "higher") return a > b ? "a" : "b";
  return a < b ? "a" : "b";
}

function toNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

const BAND_MIN = 35;

export function comparisonBand(rawA, rawB) {
  const a = toNumber(rawA);
  const b = toNumber(rawB);
  if (a === null || b === null) {
    return { widthA: a === null ? 0 : 100, widthB: b === null ? 0 : 100 };
  }
  const magA = Math.abs(a);
  const magB = Math.abs(b);
  const maxMag = Math.max(magA, magB);
  if (maxMag === 0) return { widthA: 100, widthB: 100 };
  return {
    widthA: magA === maxMag ? 100 : BAND_MIN + (magA / maxMag) * (100 - BAND_MIN),
    widthB: magB === maxMag ? 100 : BAND_MIN + (magB / maxMag) * (100 - BAND_MIN),
  };
}
