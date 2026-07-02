export const UNION_COOP_CUSTOMERS = [
  "UNION COOP - AL BARSHA MALL",
  "UNION COOP - AL AWEER",
  "UNION COOP - UMM SUQEIM",
  "UNION COOP - AL WARQA",
  "UNION COOP - AL WASL",
  "UNION COOP - MOTOR CITY",
  "UNION COOP - AL NAHDA",
  "UNION COOP - MIRDIF",
  "UNION COOP - JUMEIRAH",
  "UNION COOP - RASHIDIYA",
  "UNION COOP - NAD AL HAMAR",
  "UNION COOP - AL TWAR",
  "UNION COOP - AL KHABAISI",
  "UNION COOP - AL MIZHAR",
  "UNION COOP - AL SATWA",
  "UNION COOP - ETIHAD MALL",
  "UNION COOP - DUBAI",
];

function customerOptionKey(name) {
  return (name || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function mergeCustomerOptions(options = []) {
  const seen = new Set();
  return [...UNION_COOP_CUSTOMERS, ...options]
    .map((name) => (name || "").trim())
    .filter(Boolean)
    .filter((name) => {
      const key = customerOptionKey(name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
