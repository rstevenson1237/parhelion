import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { OrderSystem } from '../src/systems/OrderSystem.js';
import { EntityManager, Components } from '../src/core/ECS.js';
import { ORDER_STATUS } from '../src/data/orders.js';

describe('OrderSystem', () => {
  let orderSystem;
  let entities;
  let mockEngine;

  beforeEach(() => {
    entities = new EntityManager();
    orderSystem = new OrderSystem();

    mockEngine = {
      state: { tick: 0 },
      events: { emit: () => {} },
      getSystem: () => null
    };

    orderSystem.entities = entities;
    orderSystem.engine = mockEngine;
    orderSystem.events = mockEngine.events;
    orderSystem.setRNG(() => 0.5);

    // Create a commandable unit
    const unitId = entities.create();
    entities.addComponent(unitId, 'Identity', Components.Identity('Fleet Alpha', 'fleet'));
    entities.addComponent(unitId, 'Commandable', Components.Commandable({
      commanderId: 'player_1',
      competence: 0.9,
      loyalty: 1.0
    }));
    entities.addComponent(unitId, 'Position', Components.Position(10, 10));
  });

  describe('issueOrder', () => {
    it('should create and issue a valid order', () => {
      const unitId = Array.from(entities.query('Commandable'))[0][0];

      const result = orderSystem.issueOrder(
        'player_1',
        unitId,
        'MOVE',
        'star_1',
        { targetName: 'Alpha Centauri' }
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.orderId);
      assert.ok(result.message.includes('Move'));
    });

    it('should reject unknown order types', () => {
      const unitId = Array.from(entities.query('Commandable'))[0][0];

      const result = orderSystem.issueOrder(
        'player_1',
        unitId,
        'INVALID_ORDER',
        'star_1'
      );

      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('Unknown order type'));
    });

    it('should normalize natural language order types', () => {
      const unitId = Array.from(entities.query('Commandable'))[0][0];

      const result = orderSystem.issueOrder(
        'player_1',
        unitId,
        'goto',  // Natural language alias
        'star_1'
      );

      assert.strictEqual(result.success, true);
    });
  });

  describe('processTransmissions', () => {
    it('should advance order from pending to received', () => {
      const unitId = Array.from(entities.query('Commandable'))[0][0];
      orderSystem.issueOrder('player_1', unitId, 'MOVE', 'star_1');

      // Find the order
      const orders = orderSystem.getOrders({ issuerId: 'player_1' });
      assert.strictEqual(orders[0].status, ORDER_STATUS.PENDING);

      // Advance time past transmit time
      mockEngine.state.tick = 10;
      orderSystem.processTransmissions({ tick: 10 });

      const updatedOrders = orderSystem.getOrders({ issuerId: 'player_1' });
      assert.strictEqual(updatedOrders[0].status, ORDER_STATUS.EXECUTING);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a pending order', () => {
      const unitId = Array.from(entities.query('Commandable'))[0][0];
      const { orderId } = orderSystem.issueOrder('player_1', unitId, 'MOVE', 'star_1');

      const result = orderSystem.cancelOrder(orderId, 'player_1');

      assert.strictEqual(result.success, true);

      const order = orderSystem.getOrderById(orderId);
      assert.strictEqual(order.status, ORDER_STATUS.CANCELLED);
    });

    it('should reject cancellation by non-issuer', () => {
      const unitId = Array.from(entities.query('Commandable'))[0][0];
      const { orderId } = orderSystem.issueOrder('player_1', unitId, 'MOVE', 'star_1');

      const result = orderSystem.cancelOrder(orderId, 'player_2');

      assert.strictEqual(result.success, false);
    });
  });

  describe('getOrders', () => {
    it('should filter orders by status', () => {
      const unitId = Array.from(entities.query('Commandable'))[0][0];
      orderSystem.issueOrder('player_1', unitId, 'MOVE', 'star_1');
      orderSystem.issueOrder('player_1', unitId, 'PATROL', 'star_2');

      const pending = orderSystem.getOrders({ status: ORDER_STATUS.PENDING });
      assert.strictEqual(pending.length, 2);
    });
  });
});
