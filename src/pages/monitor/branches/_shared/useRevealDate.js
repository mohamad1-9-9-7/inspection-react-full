import { useEffect } from "react";

/**
 * Open the year + month of the selected date in a view's hand-rolled date
 * tree ({ [year]: bool } / { "YYYY-MM": bool } state). Those trees started
 * fully collapsed, so a branch with a year of records looked empty until you
 * clicked twice. A node the user collapses by hand stays collapsed — it only
 * re-opens when the selected date moves into it.
 */
export default function useRevealDate(date, setYears, setMonths) {
  useEffect(() => {
    const m = String(date || "").match(/^(\d{4})-(\d{2})/);
    if (!m) return;
    const [, y, mo] = m;
    setYears((p) => (p[y] ? p : { ...p, [y]: true }));
    setMonths((p) => (p[`${y}-${mo}`] ? p : { ...p, [`${y}-${mo}`]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
}
