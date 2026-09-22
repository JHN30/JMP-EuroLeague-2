import { useSearchParams } from "react-router";

// Archive-level phase selection lives in the `phase` URL search param so it
// survives a refresh and can be shared. Falls back to the RS-or-first phase
// once the phases list has loaded.
export function usePhaseParam(phases) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("phase");
  const isValid = phases.some((phase) => phase.code === requested);
  const phaseCode = isValid ? requested : (phases.find((phase) => phase.code === "RS")?.code ?? phases[0]?.code);

  function setPhaseCode(code) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (code) {
        next.set("phase", code);
      } else {
        next.delete("phase");
      }
      return next;
    });
  }

  return [phaseCode, setPhaseCode];
}
