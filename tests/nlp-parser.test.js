import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { NLPUtils, CommandParser } from '../src/core/CommandParser.js';

describe('NLP Utilities', () => {
  describe('levenshtein', () => {
    it('should calculate correct distance', () => {
      assert.strictEqual(NLPUtils.levenshtein('cat', 'cat'), 0);
      assert.strictEqual(NLPUtils.levenshtein('cat', 'bat'), 1);
      assert.strictEqual(NLPUtils.levenshtein('saturday', 'sunday'), 3);
    });
  });

  describe('similarity', () => {
    it('should return 1.0 for identical strings', () => {
      assert.strictEqual(NLPUtils.similarity('test', 'test'), 1.0);
    });

    it('should return high score for similar strings', () => {
      const score = NLPUtils.similarity('status', 'statsu');
      assert.ok(score > 0.6);
      assert.ok(score < 1.0);
    });
  });

  describe('findBestMatch', () => {
    it('should find close matches', () => {
      const result = NLPUtils.findBestMatch('statsu', ['status', 'help', 'quit']);
      assert.strictEqual(result.match, 'status');
    });

    it('should return null for no good matches', () => {
      const result = NLPUtils.findBestMatch('xyz', ['status', 'help', 'quit'], 0.8);
      assert.strictEqual(result, null);
    });
  });

  describe('extractIntent', () => {
    it('should extract move intent', () => {
      const result = NLPUtils.extractIntent('go to Sol');
      assert.strictEqual(result.intent, 'move');
      assert.ok(result.confidence > 0.8);
    });

    it('should extract attack intent', () => {
      const result = NLPUtils.extractIntent('attack the enemy fleet');
      assert.strictEqual(result.intent, 'attack');
    });

    it('should extract scout intent', () => {
      const result = NLPUtils.extractIntent('scout the Proxima system');
      assert.strictEqual(result.intent, 'scout');
    });
  });

  describe('extractTarget', () => {
    it('should extract target from natural language', () => {
      const result = NLPUtils.extractTarget('go to Alpha Centauri');
      assert.strictEqual(result, 'alpha centauri');
    });
  });
});

describe('CommandParser Natural Language', () => {
  let parser;

  beforeEach(() => {
    parser = new CommandParser();
    parser.register('status', {
      description: 'Show status',
      handler: async () => ({ success: true })
    });
    parser.register('goto', {
      description: 'Go to location',
      args: [{ name: 'destination', required: true }],
      handler: async () => ({ success: true })
    });
  });

  describe('parseNatural', () => {
    it('should handle typos with fuzzy matching', () => {
      const result = parser.parseNatural('statsu');

      assert.ok(result);
      assert.strictEqual(result.fuzzyMatched, true);
      assert.strictEqual(result.correctedTo, 'status');
    });

    it('should parse exact commands normally', () => {
      const result = parser.parseNatural('status');

      assert.ok(result);
      assert.ok(!result.fuzzyMatched);
    });
  });
});
