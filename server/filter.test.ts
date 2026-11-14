import { test } from "node:test";
import assert from "node:assert/strict";
import { containsProfanity } from "../shared/filter";

test("catches insults, including suffixes, caps, leetspeak and spacing", () => {
  for (const t of ["sen aptal mısın", "APTAL!", "s.i.k.t.i.r git", "s1kt1r", "orospuçocuğu", "salaaaak", "şerefsizin teki", "amk ya"]) {
    assert.equal(containsProfanity(t), true, t);
  }
});

test("lets everyday words through", () => {
  for (const t of ["Menemen derim, soğanlı", "şikayet etmiyorum", "götürür müsün?", "mal mülk", "sikke koleksiyonu", "fizik dersi", "Ankara'ya gidiyorum", "ibadethane"]) {
    assert.equal(containsProfanity(t), false, t);
  }
});
