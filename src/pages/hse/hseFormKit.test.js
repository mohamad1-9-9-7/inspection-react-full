// Rules engine behind every HSE input form — a value outside its limits must
// never pass validateHSE, because that is what blocks the save.
import { validateHSE, ruleAttrs } from "./hseFormKit";

const keys = (list) => list.map((e) => e.key);
const iso = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

describe("validateHSE", () => {
  test("required fields only count on save, not while typing", () => {
    const rules = [{ key: "name", label: "Name", required: true }];
    expect(validateHSE(rules, { name: "" }, "en", false)).toHaveLength(0);
    expect(keys(validateHSE(rules, { name: "  " }, "en", true))).toEqual(["name"]);
  });

  test("number range and whole numbers", () => {
    const rules = [{ key: "n", label: "N", type: "int", min: 1, max: 5 }];
    expect(validateHSE(rules, { n: "7" }, "en")).toHaveLength(1);
    expect(validateHSE(rules, { n: "0" }, "en")).toHaveLength(1);
    expect(validateHSE(rules, { n: "2.5" }, "en")).toHaveLength(1);
    expect(validateHSE(rules, { n: "3" }, "en")).toHaveLength(0);
  });

  test("dates: no future, window, and ordering against another field", () => {
    const rules = [
      { key: "from", label: "From", type: "date", notFuture: true, maxPastDays: 7 },
      { key: "to", label: "To", type: "date", after: "from" },
    ];
    expect(keys(validateHSE(rules, { from: iso(1) }, "en"))).toEqual(["from"]);
    expect(keys(validateHSE(rules, { from: iso(-8) }, "en"))).toEqual(["from"]);
    expect(keys(validateHSE(rules, { from: iso(-1), to: iso(-1) }, "en"))).toEqual(["to"]);
    expect(validateHSE(rules, { from: iso(-2), to: iso(-1) }, "en")).toHaveLength(0);
  });

  test("requiredIf, when and custom rules", () => {
    const rules = [
      { key: "action", label: "Action", requiredIf: (d) => d.result === "fail" },
      { key: "gas", label: "Gas", type: "number", min: 19.5, max: 23.5, when: (d) => d.cs },
      { key: "who", label: "Who", custom: (v, d) => (v === d.other ? { en: "same", ar: "نفس" } : null) },
    ];
    expect(keys(validateHSE(rules, { result: "fail" }, "en"))).toEqual(["action"]);
    expect(validateHSE(rules, { result: "pass" }, "en")).toHaveLength(0);
    expect(validateHSE(rules, { cs: false, gas: "5" }, "en")).toHaveLength(0);
    expect(keys(validateHSE(rules, { cs: true, gas: "5" }, "en"))).toEqual(["gas"]);
    expect(validateHSE(rules, { who: "A", other: "A" }, "ar")[0].message).toBe("نفس");
  });

  test("select values must come from the list; phone and time formats", () => {
    const rules = [
      { key: "s", label: "S", oneOf: ["a", "b"] },
      { key: "p", label: "P", type: "phone" },
      { key: "t", label: "T", type: "time" },
    ];
    expect(keys(validateHSE(rules, { s: "z", p: "05x", t: "25:00" }, "en"))).toEqual(["s", "p", "t"]);
    expect(validateHSE(rules, { s: "a", p: "0501234567", t: "09:30" }, "en")).toHaveLength(0);
  });
});

describe("ruleAttrs", () => {
  test("puts the limits on the input itself", () => {
    expect(ruleAttrs({ type: "int", min: 0, max: 20 })).toMatchObject({ min: 0, max: 20, step: 1 });
    expect(ruleAttrs({ type: "date", notFuture: true }).max).toBe(iso(0));
    expect(ruleAttrs({ type: "text", maxLength: 80 }).maxLength).toBe(80);
  });
});
