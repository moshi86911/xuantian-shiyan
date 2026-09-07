import { describe, it, expect, beforeEach } from 'vitest';
import { ComboTracker } from '../../src/core/ComboTracker';

describe('ComboTracker', () => {
  let combo: ComboTracker;

  beforeEach(() => {
    combo = new ComboTracker();
  });

  it('starts at 0 combo', () => {
    const s = combo.getState();
    expect(s.count).toBe(0);
    expect(s.multiplier).toBe(1.0);
  });

  it('addCombo increments by 1 by default', () => {
    const c = combo.addCombo();
    expect(c).toBe(1);
    expect(combo.getState().count).toBe(1);
  });

  it('addCombo increments by specified gain', () => {
    combo.addCombo(3);
    expect(combo.getState().count).toBe(3);
  });

  it('multiplier grows with combo count', () => {
    combo.addCombo(5);
    expect(combo.getState().multiplier).toBeCloseTo(1.5, 1);  // 1 + 5*0.1
  });

  it('multiplier caps at 3.0', () => {
    combo.addCombo(100);
    expect(combo.getState().multiplier).toBe(3.0);
  });

  it('peak tracks highest combo', () => {
    combo.addCombo(5);  // peak=5
    combo.reset();
    combo.addCombo(2);  // peak still 5
    expect(combo.getState().peak).toBe(5);
  });

  it('reset clears count but keeps multiplier at 1.0', () => {
    combo.addCombo(10);
    combo.reset();
    expect(combo.getState().count).toBe(0);
    expect(combo.getState().multiplier).toBe(1.0);
  });

  it('damageBonus returns extra damage', () => {
    combo.addCombo(5);
    const bonus = combo.damageBonus(10);  // multiplier=1.5
    expect(bonus).toBeCloseTo(5, 1);
  });

  it('applyToDamage returns boosted damage', () => {
    combo.addCombo(5);
    const dmg = combo.applyToDamage(10);  // 10 * 1.5
    expect(dmg).toBe(15);
  });

  it('applyToDamage floors non-integer results', () => {
    combo.addCombo(3);  // multiplier=1.3
    expect(combo.applyToDamage(7)).toBe(9);  // 7 * 1.3 = 9.1 → 9
  });

  it('applyToDamage at cap (combo=20+) floors cleanly', () => {
    combo.addCombo(20);
    expect(combo.applyToDamage(10)).toBe(30);  // 10 * 3.0
  });

  it('clear resets to initial state', () => {
    combo.addCombo(8);
    combo.clear();
    const s = combo.getState();
    expect(s.count).toBe(0);
    expect(s.peak).toBe(0);
    expect(s.multiplier).toBe(1.0);
  });

  it('multiple addCombo calls accumulate', () => {
    combo.addCombo();  // 1
    combo.addCombo();  // 2
    combo.addCombo(3); // 5
    expect(combo.getState().count).toBe(5);
  });
});