import type { SeededRandom } from '../utils/rng';

export class Deck {
  drawPile: string[] = [];
  discardPile: string[] = [];
  hand: string[] = [];
  exhaustPile: string[] = [];

  constructor(initialCards: string[], private rng: SeededRandom) {
    this.drawPile = this.rng.shuffle([...initialCards]);
  }

  get size(): number {
    return (
      this.drawPile.length +
      this.discardPile.length +
      this.hand.length +
      this.exhaustPile.length
    );
  }

  draw(count: number): string[] {
    const drawn: string[] = [];
    for (let i = 0; i < count; i++) {
      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) break;
        this.reshuffle();
      }
      const card = this.drawPile.pop();
      if (card !== undefined) {
        this.hand.push(card);
        drawn.push(card);
      }
    }
    return drawn;
  }

  discard(cardId: string): void {
    const idx = this.hand.indexOf(cardId);
    if (idx !== -1) {
      this.hand.splice(idx, 1);
      this.discardPile.push(cardId);
    } else {
      this.discardPile.push(cardId);
    }
  }

  exhaust(cardId: string): void {
    const idx = this.hand.indexOf(cardId);
    if (idx !== -1) {
      this.hand.splice(idx, 1);
      this.exhaustPile.push(cardId);
    } else {
      this.exhaustPile.push(cardId);
    }
  }

  addCard(cardId: string, location: 'draw' | 'discard' | 'hand' = 'discard'): void {
    if (location === 'draw') {
      this.drawPile.push(cardId);
    } else if (location === 'hand') {
      this.hand.push(cardId);
    } else {
      this.discardPile.push(cardId);
    }
  }

  getHand(): string[] {
    return [...this.hand];
  }

  clearHand(): void {
    this.discardPile.push(...this.hand);
    this.hand = [];
  }

  private reshuffle(): void {
    this.drawPile = this.rng.shuffle(this.discardPile);
    this.discardPile = [];
  }
}