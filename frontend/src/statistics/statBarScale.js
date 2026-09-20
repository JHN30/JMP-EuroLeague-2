export function barWidthScale(values) {
  const finite = values.filter((value) => value !== null && value !== undefined && !Number.isNaN(value));
  if (finite.length === 0) return () => null;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  return (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    return max === min ? 100 : ((value - min) / (max - min)) * 100;
  };
}
