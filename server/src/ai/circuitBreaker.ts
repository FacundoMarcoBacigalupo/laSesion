export class CircuitBreaker {
  fails = 0;
  openUntil = 0;
  constructor(private threshold: number, private openMs: number) {}
  isOpen(): boolean { return Date.now() < this.openUntil; }
  recordSuccess() { this.fails = 0; }
  recordFail() {
    this.fails++;
    if (this.fails >= this.threshold) this.openUntil = Date.now() + this.openMs;
  }
  forceOpen() { this.openUntil = Date.now() + this.openMs; }
  reset() { this.fails = 0; this.openUntil = 0; }
}