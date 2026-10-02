// Resets the browser-tab title to "InspectPro" whenever an in-app route is
// opened (see config/pageTitles.js). Mounted in App.jsx BEFORE <Routes>, so
// its effect runs before the page's own — a page that sets a title of its
// own (urgent count, print file name) is never overwritten.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { APP_TITLE, isPublicPath } from "../config/pageTitles";

export default function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!isPublicPath(pathname)) document.title = APP_TITLE;
  }, [pathname]);
  return null;
}
