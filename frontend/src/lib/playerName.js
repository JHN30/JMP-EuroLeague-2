// The feed writes names as "LAUVERGNE, JOFFREY" -> { last: "LAUVERGNE", first: "JOFFREY" }.
export function nameParts(fullName) {
  const [last = "", first = ""] = (fullName ?? "TBD").split(",").map((part) => part.trim());
  return { last, first };
}
