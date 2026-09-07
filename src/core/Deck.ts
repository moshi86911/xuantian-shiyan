import type { SeededRandom } from '../utils/rng';

export class Deck {
  drawPile: string[] = [];
  discardPile: string[] = [];
  exhaustPile: string[] = [];

  constructor(initialCards: string[], private rng: SeededRandom) {
    this.drawPile = this.rng.shuffle([...initialCards]);
  }

  get size(): number {
    return this.drawPile.length + this.discardPile.length + this.exhaustPile.length;
  }

  draw(count: number): string[] {
    const drawn: string[] = [];
    for (let i = 0; i < count; i++) {
      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) break;  // no cards left
        this.reshuffle();
      }
      const card = this.drawPile.pop();
      if (card !== undefined) drawn.push(card);
    }
    return drawn;
  }

  discard(cardId: string): void {
    this.discardPile.push(cardId);
  }

  exhaust(cardId: string): void {
    const drawIdx = this.drawPile.indexOf(cardId);
    if (drawIdx !== -1) {
      this.drawPile.splice(drawIdx, 1);
      return;
    }
    const discardIdx = this.discardPile.indexOf(cardId);
    if (discardIdx !== -1) {
      this.discardPile.splice(discardIdx, 1);
      return;
    }
    this.exhaustPile.push(cardId);
  }

  addCard(cardId: string, location: 'draw' | 'discard' = 'discard'): void {
    if (location === 'draw') {
      this.drawPile.push(cardId);
    } else {
      this.discardPile.push(cardId);
    }
  }

  private reshuffle(): void {
    this.drawPile = this.rng.shuffle(this.discardPile);
    this.discardPile = [];
  }
}