// The season as it appears in an address: "E2026" is "2026". A code with no letters is already the year and is left alone.
export function seasonSlug(seasonCode) {
  const match = /^[A-Za-z]+(\d{4})$/.exec(seasonCode ?? "");
  return match ? match[1] : seasonCode;
}

export function isLegacySeasonCode(value) {
  return /^[A-Za-z]+\d{4}$/.test(value ?? "");
}
