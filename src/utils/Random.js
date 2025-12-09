/**
 * NEXUS PROTOCOL - Seeded Random Number Generator
 * 
 * Provides deterministic random numbers for reproducible universe generation.
 * Based on a simple but effective mulberry32 algorithm.
 */

/**
 * Create a seeded random function using mulberry32
 * @param {number|string} seed - Initial seed
 * @returns {function} Random function returning 0-1
 */
export function createRNG(seed) {
  // Convert string seeds to numbers
  let numSeed;
  if (typeof seed === 'string') {
    numSeed = hashString(seed);
  } else {
    numSeed = seed >>> 0; // Ensure 32-bit unsigned
  }

  // mulberry32 PRNG
  return function() {
    numSeed |= 0;
    numSeed = numSeed + 0x6D2B79F5 | 0;
    let t = Math.imul(numSeed ^ numSeed >>> 15, 1 | numSeed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Hash a string to a number
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash >>> 0;
}

/**
 * Seeded random class with utility methods
 */
export class Random {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.rng = createRNG(seed);
    this.calls = 0;
  }

  /**
   * Get next random number (0-1)
   */
  next() {
    this.calls++;
    return this.rng();
  }

  /**
   * Random integer in range [min, max]
   */
  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Random float in range [min, max)
   */
  float(min, max) {
    return this.next() * (max - min) + min;
  }

  /**
   * Random boolean with optional probability
   */
  bool(probability = 0.5) {
    return this.next() < probability;
  }

  /**
   * Pick random element from array
   */
  pick(array) {
    if (!array || array.length === 0) return undefined;
    return array[Math.floor(this.next() * array.length)];
  }

  /**
   * Pick multiple unique elements from array
   */
  pickMultiple(array, count) {
    if (!array || array.length === 0) return [];
    const available = [...array];
    const result = [];
    const n = Math.min(count, available.length);
    
    for (let i = 0; i < n; i++) {
      const index = Math.floor(this.next() * available.length);
      result.push(available.splice(index, 1)[0]);
    }
    
    return result;
  }

  /**
   * Shuffle array in place
   */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Weighted random selection
   * @param {Array} items - Array of { value, weight } objects
   */
  weighted(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = this.next() * totalWeight;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) return item.value;
    }
    
    return items[items.length - 1].value;
  }

  /**
   * Gaussian (normal) distribution using Box-Muller transform
   * @param {number} mean - Mean of distribution
   * @param {number} stdDev - Standard deviation
   */
  gaussian(mean = 0, stdDev = 1) {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }

  /**
   * Random point on unit sphere
   */
  pointOnSphere() {
    const theta = this.next() * 2 * Math.PI;
    const phi = Math.acos(2 * this.next() - 1);
    return {
      x: Math.sin(phi) * Math.cos(theta),
      y: Math.sin(phi) * Math.sin(theta),
      z: Math.cos(phi)
    };
  }

  /**
   * Random point in unit cube
   */
  pointInCube() {
    return {
      x: this.next(),
      y: this.next(),
      z: this.next()
    };
  }

  /**
   * Create a child RNG with derived seed
   */
  child(modifier = '') {
    const childSeed = hashString(`${this.seed}-${this.calls}-${modifier}`);
    return new Random(childSeed);
  }

  /**
   * Reset to initial seed
   */
  reset() {
    this.rng = createRNG(this.seed);
    this.calls = 0;
    return this;
  }

  /**
   * Get state for serialization
   */
  getState() {
    return {
      seed: this.seed,
      calls: this.calls
    };
  }

  /**
   * Restore state (approximate - replays calls)
   */
  loadState(state) {
    this.seed = state.seed;
    this.rng = createRNG(this.seed);
    this.calls = 0;
    
    // Replay calls to reach same position
    for (let i = 0; i < state.calls; i++) {
      this.rng();
    }
    this.calls = state.calls;
    
    return this;
  }
}

export default Random;
