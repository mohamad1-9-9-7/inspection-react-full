// Registry contract: every company module loads its manifest, exposes the
// same cards the company used before the registry existed, and keys its
// permissions "<industry>:<card>" (what accounts already store).
import { MODULES, defaultModuleFor, moduleOf, loadManifest, permissionSectionsOf, moduleOptions } from "./index";
import { getIndustryTemplate, permissionSectionsFor } from "../industries";

describe("company registry", () => {
  test("every industry has a default module that exists", () => {
    for (const industry of ["meat", "sweets", "restaurant", "retail", "warehouse", "factory"]) {
      expect(MODULES[defaultModuleFor(industry)]).toBeTruthy();
    }
    expect(defaultModuleFor(undefined)).toBe("almawashi");
  });

  test("unknown or empty module falls back to the industry's default", () => {
    expect(moduleOf("", "sweets").id).toBe("exaltis");
    expect(moduleOf("does-not-exist", "restaurant").id).toBe("restaurant");
    expect(moduleOf("exaltis", "meat").id).toBe("exaltis");
  });

  test("the meat system has no manifest (classic dashboard)", async () => {
    expect(await loadManifest("almawashi", "meat")).toBeNull();
    expect(permissionSectionsOf(null, "meat")).toBeNull();
  });

  test.each(["exaltis", "restaurant", "retail", "warehouse", "factory"])(
    "%s loads the same cards and permission rows as before",
    async (id) => {
      const m = MODULES[id];
      const manifest = await loadManifest(id, m.industry);
      const before = getIndustryTemplate(m.industry);
      expect(manifest).toBeTruthy();
      expect(manifest.cards.map((c) => c.id)).toEqual(before.cards.map((c) => c.id));
      expect(permissionSectionsOf(manifest, m.industry)).toEqual(permissionSectionsFor(m.industry));
    }
  );

  test("options list every module once", () => {
    const ids = moduleOptions().map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(Object.keys(MODULES));
  });
});
