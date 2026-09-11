// Centralized order counter with persistence
// Ensures sequential and consistent order numbering across sessions.
// Format: ORD-YYYY-NNNN (e.g. ORD-2026-0047)

const ORDER_COUNTER_KEY = 'docufy_order_counter_v2';
const ORDER_PREFIX = 'ORD-';

// Regex to match the canonical ORD-YYYY-NNNN format
const CANONICAL_RE = /ORD-(\d{4})-(\d+)/;
// Legacy fallback: ORD-NNN (no year prefix)
const LEGACY_RE = /ORD-(\d+)/;

interface CounterState {
  year: number;
  seq: number;
}

class OrderCounter {
  private state: CounterState;

  constructor() {
    const stored = localStorage.getItem(ORDER_COUNTER_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CounterState;
        if (
          typeof parsed.year === 'number' &&
          typeof parsed.seq === 'number' &&
          parsed.seq >= 0
        ) {
          this.state = parsed;
          return;
        }
      } catch {
        // malformed – fall through
      }
    }
    this.state = { year: new Date().getFullYear(), seq: 0 };
  }

  /**
   * Initialize the counter based on existing orders.
   * Called once when the app starts to sync with existing data.
   */
  initializeFromOrders(orderIds: string[]): void {
    if (orderIds.length === 0) return;

    let maxSeq = 0;
    let maxYear = this.state.year;

    for (const id of orderIds) {
      const canonical = id.match(CANONICAL_RE);
      if (canonical) {
        const y = parseInt(canonical[1], 10);
        const s = parseInt(canonical[2], 10);
        if (!isNaN(y) && !isNaN(s)) {
          if (y > maxYear || (y === maxYear && s > maxSeq)) {
            maxYear = y;
            maxSeq = s;
          }
          continue;
        }
      }

      // Legacy ORD-NNN fallback
      const legacy = id.match(LEGACY_RE);
      if (legacy) {
        const n = parseInt(legacy[1], 10);
        if (!isNaN(n) && n > maxSeq) {
          maxSeq = n;
        }
      }
    }

    if (maxSeq > this.state.seq || maxYear > this.state.year) {
      this.state = {
        year: maxYear > this.state.year ? maxYear : this.state.year,
        seq: Math.max(this.state.seq, maxSeq),
      };
      this.persist();
    }
  }

  /**
   * Get the next sequential order ID and increment the counter.
   */
  getNextOrderId(): string {
    this.state.seq += 1;
    this.persist();
    return `${ORDER_PREFIX}${this.state.year}-${this.state.seq.toString().padStart(4, '0')}`;
  }

  /**
   * Get the current sequence value without incrementing.
   */
  getCurrentCounter(): number {
    return this.state.seq;
  }

  /**
   * Manually set the counter (use with caution).
   */
  setCounter(value: number): void {
    if (value >= 0) {
      this.state.seq = value;
      this.persist();
    }
  }

  private persist(): void {
    localStorage.setItem(ORDER_COUNTER_KEY, JSON.stringify(this.state));
  }

  /**
   * Reset the counter (use with extreme caution - only for testing/development).
   */
  reset(): void {
    this.state = { year: new Date().getFullYear(), seq: 0 };
    this.persist();
  }
}

// Export a singleton instance
export const orderCounter = new OrderCounter();

// Export the class for testing purposes
export { OrderCounter };
