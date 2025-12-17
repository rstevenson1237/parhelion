import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ORDER_TYPES, ORDER_STATUS, ORDER_ALIASES } from '../src/data/orders.js';
import { Components } from '../src/core/ECS.js';

describe('Order Data Definitions', () => {
  it('should have all order types defined', () => {
    assert.ok(ORDER_TYPES.MOVE);
    assert.ok(ORDER_TYPES.ATTACK);
    assert.ok(ORDER_TYPES.TRADE);
    assert.ok(ORDER_TYPES.SCOUT);
  });

  it('should have valid order status values', () => {
    assert.strictEqual(ORDER_STATUS.PENDING, 'pending');
    assert.strictEqual(ORDER_STATUS.COMPLETED, 'completed');
    assert.strictEqual(ORDER_STATUS.FAILED, 'failed');
  });

  it('should map aliases to order types', () => {
    assert.strictEqual(ORDER_ALIASES['goto'], 'MOVE');
    assert.strictEqual(ORDER_ALIASES['attack'], 'ATTACK');
    assert.strictEqual(ORDER_ALIASES['recon'], 'SCOUT');
  });
});

describe('Order Components', () => {
  it('should create Order component with defaults', () => {
    const order = Components.Order({});
    assert.ok(order.id.startsWith('order_'));
    assert.strictEqual(order.type, 'STANDBY');
    assert.strictEqual(order.status, 'pending');
  });

  it('should create OrderQueue component', () => {
    const queue = Components.OrderQueue({});
    assert.ok(Array.isArray(queue.orders));
    assert.strictEqual(queue.maxQueueSize, 5);
  });

  it('should create Message component with defaults', () => {
    const msg = Components.Message({
      senderId: 'player_1',
      content: 'Test message'
    });
    assert.ok(msg.id.startsWith('msg_'));
    assert.strictEqual(msg.senderId, 'player_1');
    assert.strictEqual(msg.read, false);
  });

  it('should create Commandable component', () => {
    const cmd = Components.Commandable({
      competence: 0.9,
      loyalty: 0.85
    });
    assert.strictEqual(cmd.competence, 0.9);
    assert.strictEqual(cmd.loyalty, 0.85);
  });
});
