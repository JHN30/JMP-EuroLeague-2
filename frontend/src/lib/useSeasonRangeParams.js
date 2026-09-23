import { useSearchParams } from "react-router";

// A head-to-head season range lives in `from`/`through` URL search params,
// independent of the global `:seasonCode` route param, so it survives a
// refresh and can be shared. `seasons` must already be sorted ascending by
// start year. Falls back to the full available range.
export function useSeasonRangeParams(seasons) {
  const [searchParams, setSearchParams] = useSearchParams();
  const codes = seasons.map((season) => season.seasonCode);

  const requestedFrom = searchParams.get("from");
  const requestedThrough = searchParams.get("through");
  const from = codes.includes(requestedFrom) ? requestedFrom : codes[0];
  const through = codes.includes(requestedThrough) ? requestedThrough : codes[codes.length - 1];

  const fromIndex = codes.indexOf(from);
  const throughIndex = codes.indexOf(through);
  const clampedThrough = throughIndex < fromIndex ? from : through;

  function setRange(nextFrom, nextThrough) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (nextFrom) next.set("from", nextFrom); else next.delete("from");
      if (nextThrough) next.set("through", nextThrough); else next.delete("through");
      return next;
    });
  }

  function setFrom(code) {
    const nextFromIndex = codes.indexOf(code);
    const nextThrough = nextFromIndex > throughIndex ? code : through;
    setRange(code, nextThrough);
  }

  function setThrough(code) {
    const nextThroughIndex = codes.indexOf(code);
    const nextFrom = nextThroughIndex < fromIndex ? code : from;
    setRange(nextFrom, code);
  }

  return { from, through: clampedThrough, setFrom, setThrough };
}
