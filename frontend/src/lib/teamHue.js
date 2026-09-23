// Golden-angle rotation guarantees adjacent indexes never share a hue.
export function teamHue(index) {
  return `hsl(${(index * 137.5 + 12) % 360}, 72%, 58%)`;
}
