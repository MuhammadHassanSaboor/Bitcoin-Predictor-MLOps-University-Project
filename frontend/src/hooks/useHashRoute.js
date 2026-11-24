import { useEffect, useState } from "react";

// Tiny hash router: #/ , #/model , #/scenario , #/api
export const ROUTES = ["terminal", "model", "scenario", "api"];

function current() {
  const r = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return ROUTES.includes(r) ? r : "terminal";
}

export function useHashRoute() {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const onChange = () => {
      setRoute(current());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
