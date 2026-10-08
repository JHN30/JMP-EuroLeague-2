import { createContext } from "react";

// The page layout's sticky bar listens here: a detail page that shows a back link also hands its target up, so on a phone the
// bar itself becomes the way back and stays reachable however far the page is scrolled.
export const BackTargetContext = createContext(() => {});
