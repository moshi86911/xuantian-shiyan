import type { Card as CardData, CardEffect } from './types';

export class Card {
  data: CardData;
  upgraded = false;

  constructor(data: CardData) {
    // Deep clone effects array to prevent shared references
    this.data = { ...data, effects: data.effects.map(e => ({ ...e })) };
  }

  get id(): string { return this.data.id; }
  get name(): string {
    return this.upgraded ? `${this.data.name}+` : this.data.name;
  }
  get description(): string {
    return this.upgraded ? this.upgradeText(this.data.description) : this.data.description;
  }
  get cost(): number { return this.data.cost; }
  get qiCost(): number { return this.data.qiCost ?? 0; }
  get type() { return this.data.type; }
  get rarity() { return this.data.rarity; }
  get targetType() { return this.data.targetType; }
  get characterId() { return this.data.characterId; }
  get effects(): CardEffect[] { return this.data.effects; }

  canPlay(energy: number, qi: number): boolean {
    return this.cost <= energy && this.qiCost <= qi;
  }

  upgrade(): void {
    if (this.upgraded) return;
    this.upgraded = true;
    this.data.effects = this.data.effects.map(eff => {
      if (eff.type === 'damage' || eff.type === 'block' || eff.type === 'heal') {
        return { ...eff, value: Math.floor(eff.value * 1.5) };
      }
      return eff;
    });
  }

  private upgradeText(text: string): string {
    return text.replace(/\d+/g, m => String(Math.floor(Number(m) * 1.5)));
  }
}
