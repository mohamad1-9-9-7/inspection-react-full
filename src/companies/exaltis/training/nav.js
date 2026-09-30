// src/pages/sweets-training/nav.js
// The sweets training pages live INSIDE the company app (card "training"),
// not on /training/* routes — those belong to the other company. The copied
// pages still call navigate("/training/sessions") etc.; this drop-in
// useNavigate turns those paths into a hub page (?card=training&tp=sessions)
// and passes anything else (back, other routes) to the real router.
import { createContext, useCallback, useContext } from "react";
import { useNavigate as useRouterNavigate } from "react-router-dom";

export const TrainingNavContext = createContext(null);

/** "/training/annual-plan" → "annual-plan", "/training" → "home", else null. */
export function hubPageOf(to) {
  if (typeof to !== "string") return null;
  const m = to.match(/^\/(?:sweets-)?training(?:\/([a-z-]+))?\/?$/);
  if (!m) return null;
  return m[1] || "home";
}

export function useNavigate() {
  const hub = useContext(TrainingNavContext);
  const routerNavigate = useRouterNavigate();
  return useCallback(
    (to, opts) => {
      if (hub) {
        if (to === -1) return hub.back();
        const page = hubPageOf(to);
        if (page) return hub.go(page);
        // The meat dashboard is not this company's home.
        if (to === "/named-dashboard") return hub.exit();
      }
      return routerNavigate(to, opts);
    },
    [hub, routerNavigate]
  );
}
