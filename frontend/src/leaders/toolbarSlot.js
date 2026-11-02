import { createContext } from "react";

// Where the page puts the toolbar: a node beside the scope tabs (LeadersPage), so from lg the tabs and the choices share one row and the
// choices do not fade in with the scope's panel. Null until that node is on the page; without the page (undefined) the toolbar stays inline.
export const ToolbarSlot = createContext(undefined);
