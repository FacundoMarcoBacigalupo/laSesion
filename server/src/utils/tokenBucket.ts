export class TokenBucket {
  private tokens: number;
  private last: number;
  constructor(private capacity: number, private refillPerSec: number) {
    this.tokens = capacity;
    this.last = Date.now();
  }
  tryConsume(n = 1): boolean {
    const now = Date.now();
    const elapsed = (now - this.last) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);
    this.last = now;
    if (this.tokens >= n) { this.tokens -= n; return true; }
    return false;
  }
  reset() { this.tokens = this.capacity; this.last = Date.now(); }
}