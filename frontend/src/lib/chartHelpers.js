export function thinAxisLabels(labels, maxLabels) {
  if (!Array.isArray(labels) || labels.length <= maxLabels || maxLabels < 2) {
    return labels;
  }
  const lastIndex = labels.length - 1;
  const step = lastIndex / (maxLabels - 1);
  const keepIndexes = new Set();
  for (let i = 0; i < maxLabels; i += 1) {
    keepIndexes.add(Math.round(i * step));
  }
  keepIndexes.add(0);
  keepIndexes.add(lastIndex);
  return labels.map((label, index) => (keepIndexes.has(index) ? label : ""));
}

export function computeDomain(values, { paddingRatio = 0.1 } = {}) {
  const numeric = (values ?? []).filter((value) => typeof value === "number" && Number.isFinite(value));
  if (numeric.length === 0) return { min: undefined, max: undefined };

  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const range = max - min || Math.abs(max) || 1;
  const padding = range * paddingRatio;
  return { min: min - padding, max: max + padding };
}
