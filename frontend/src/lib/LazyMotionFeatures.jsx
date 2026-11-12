import { useState } from "react";
import { LazyMotion } from "motion/react";
import AsyncState from "./AsyncState";

// Set before a reload made to fetch the features again and kept until they load, so a failure after it shows the error
// instead of reloading again.
const RELOAD_KEY = "motion-features-reload";

function hasReloaded() {
  try {
    return window.sessionStorage.getItem(RELOAD_KEY) !== null;
  } catch {
    return true;
  }
}

function markReload() {
  try {
    window.sessionStorage.setItem(RELOAD_KEY, "1");
  } catch {
    // Without storage hasReloaded() already answers true, so this reload is the visitor's own Retry.
  }
}

function clearReload() {
  try {
    window.sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // Nothing was stored.
  }
}

// Until the features arrive every `m` element stays at its `initial` state, mostly `opacity: 0`, so a failed load would leave
// the page invisible. LazyMotion loads once and does not catch a rejection, so the failure is caught here and the promise it
// gets is left pending. A second import() in the same page does not help: the browser keeps the failed module for that address
// and rejects again without a request. Only a reload fetches it again, so the first failure reloads once quietly and a second
// one shows the error, whose Retry reloads.
export default function LazyMotionFeatures({ children }) {
  const [failed, setFailed] = useState(false);

  const retry = () => {
    markReload();
    window.location.reload();
  };

  const loadFeatures = () =>
    import("./motionFeatures.js").then(
      (module) => {
        clearReload();
        return module.default;
      },
      () => {
        if (hasReloaded()) {
          setFailed(true);
        } else {
          setTimeout(retry, 1000);
        }
        return new Promise(() => {});
      },
    );

  if (failed) {
    return (
      <AsyncState
        status="error"
        fullScreen
        message="Could not finish loading the page. Check your connection and try again."
        onRetry={retry}
      />
    );
  }

  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
