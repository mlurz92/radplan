import { test, describe } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import {
  AUTO_PLAN_WEIGHT_PROFILES,
  weightProfileFromMix,
  resolveWeightProfile,
} from "../js/autoplan.js";

describe("weightProfileFromMix (kontinuierlicher Fairness/Wunsch-Regler)", () => {
  test("reproduziert die drei benannten Presets exakt an ihren Ankerpositionen", () => {
    const at0 = weightProfileFromMix(0);
    const at50 = weightProfileFromMix(50);
    const at100 = weightProfileFromMix(100);

    assert.equal(at0.wish, AUTO_PLAN_WEIGHT_PROFILES.fairness.wish);
    assert.equal(at0.fairness, AUTO_PLAN_WEIGHT_PROFILES.fairness.fairness);

    assert.equal(at50.wish, AUTO_PLAN_WEIGHT_PROFILES.standard.wish);
    assert.equal(at50.fairness, AUTO_PLAN_WEIGHT_PROFILES.standard.fairness);

    assert.equal(at100.wish, AUTO_PLAN_WEIGHT_PROFILES.wish.wish);
    assert.equal(at100.fairness, AUTO_PLAN_WEIGHT_PROFILES.wish.fairness);
  });

  test("interpoliert stetig zwischen den Ankerpunkten (monoton steigendes wish, fallendes fairness)", () => {
    const samples = [0, 10, 25, 40, 50, 60, 75, 90, 100].map(weightProfileFromMix);
    for (let i = 1; i < samples.length; i++) {
      assert.ok(samples[i].wish >= samples[i - 1].wish - 1e-9, "wish-Gewicht steigt monoton mit der Reglerposition");
      assert.ok(samples[i].fairness <= samples[i - 1].fairness + 1e-9, "fairness-Gewicht fällt monoton mit der Reglerposition");
    }
  });

  test("kappt Werte außerhalb von [0,100]", () => {
    assert.deepEqual(weightProfileFromMix(-20).mixPct, 0);
    assert.deepEqual(weightProfileFromMix(150).mixPct, 100);
  });

  test("rundet auf ganze Prozentpunkte", () => {
    assert.equal(weightProfileFromMix(33.7).mixPct, 34);
  });
});

describe("resolveWeightProfile", () => {
  test("löst bekannte String-Keys wie bisher auf", () => {
    assert.equal(resolveWeightProfile("fairness"), AUTO_PLAN_WEIGHT_PROFILES.fairness);
    assert.equal(resolveWeightProfile("wish"), AUTO_PLAN_WEIGHT_PROFILES.wish);
  });

  test("fällt bei unbekanntem/fehlendem Key auf 'standard' zurück", () => {
    assert.equal(resolveWeightProfile("nicht-existent"), AUTO_PLAN_WEIGHT_PROFILES.standard);
    assert.equal(resolveWeightProfile(undefined), AUTO_PLAN_WEIGHT_PROFILES.standard);
  });

  test("akzeptiert ein fertiges {wish,fairness}-Objekt direkt (Regler-Ausgabe)", () => {
    const custom = weightProfileFromMix(77);
    assert.equal(resolveWeightProfile(custom), custom);
  });

  test("ignoriert ein Objekt ohne gültige wish/fairness-Felder und fällt auf standard zurück", () => {
    assert.equal(resolveWeightProfile({ label: "kaputt" }), AUTO_PLAN_WEIGHT_PROFILES.standard);
  });
});
