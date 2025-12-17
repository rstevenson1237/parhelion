/**
 * PARHELION - Order System
 *
 * Manages order creation, transmission, execution, and completion.
 * Implements the "Orders, Not Actions" design philosophy.
 */

import { Components } from '../core/ECS.js';
import { ORDER_TYPES, ORDER_STATUS, ORDER_PRIORITIES, ORDER_RESULTS, ORDER_ALIASES } from '../data/orders.js';

export class OrderSystem {
  constructor() {
    this.entities = null;
    this.engine = null;
    this.events = null;
    this.rng = null;
    this.orderCounter = 0;
  }

  initialize(engine) {
    this.engine = engine;
    this.entities = engine.getSystem('entities')?.entities || engine.entities;
    this.events = engine.events;
  }

  setRNG(rng) {
    this.rng = rng;
  }

  /**
   * Main update loop - called each tick
   */
  update(tickData) {
    this.processTransmissions(tickData);
    this.processExecutions(tickData);
    this.checkOrderTimeouts(tickData);
  }

  /**
   * Issue a new order to a unit
   */
  issueOrder(issuerId, recipientId, orderType, targetId, options = {}) {
    // Validate order type
    const normalizedType = this.normalizeOrderType(orderType);
    const orderDef = ORDER_TYPES[normalizedType];

    if (!orderDef) {
      return {
        success: false,
        error: `Unknown order type: ${orderType}`
      };
    }

    // Check if recipient entity exists
    if (!this.entities.entities || !this.entities.entities.has(recipientId)) {
      return {
        success: false,
        error: `Unknown unit: ${recipientId}`
      };
    }

    // Check if recipient is commandable
    const commandable = this.entities.getComponent(recipientId, 'Commandable');
    if (!commandable) {
      return {
        success: false,
        error: 'Target unit cannot receive orders'
      };
    }

    // Check command authority
    if (commandable.commanderId && commandable.commanderId !== issuerId) {
      return {
        success: false,
        error: 'You do not have command authority over this unit'
      };
    }

    // Calculate transmission time based on distance and priority
    const transmitTime = this.calculateTransmitTime(issuerId, recipientId, options.priority);
    const executionTime = orderDef.baseDuration + (options.durationModifier || 0);

    // Get target name for display
    let targetName = options.targetName;
    if (!targetName && targetId) {
      const targetIdentity = this.entities.getComponent(targetId, 'Identity');
      targetName = targetIdentity?.name || targetId;
    }

    // Create order entity
    const orderId = this.entities.create();
    const order = Components.Order({
      id: `order_${++this.orderCounter}`,
      type: normalizedType,
      issuerId,
      recipientId,
      targetId,
      targetName,
      priority: options.priority || 'NORMAL',
      status: ORDER_STATUS.PENDING,
      parameters: options.parameters || {},
      issuedAt: this.engine.state.tick,
      transmitTime,
      executionTime
    });

    this.entities.addComponent(orderId, 'Order', order);

    // Add to recipient's order queue
    this.addToOrderQueue(recipientId, order.id);

    // Emit event
    this.events?.emit('order:issued', {
      orderId: order.id,
      entityId: orderId,
      type: normalizedType,
      issuerId,
      recipientId,
      targetId
    });

    return {
      success: true,
      orderId: order.id,
      entityId: orderId,
      transmitTime,
      message: `Order issued: ${orderDef.name} to ${this.getUnitName(recipientId)}`
    };
  }

  /**
   * Normalize order type from natural language
   */
  normalizeOrderType(input) {
    const upper = input.toUpperCase();
    if (ORDER_TYPES[upper]) {
      return upper;
    }
    const lower = input.toLowerCase();
    return ORDER_ALIASES[lower] || upper;
  }

  /**
   * Calculate transmission delay based on distance and priority
   */
  calculateTransmitTime(senderId, recipientId, priority = 'NORMAL') {
    const senderPos = this.getEntityPosition(senderId);
    const recipientPos = this.getEntityPosition(recipientId);

    if (!senderPos || !recipientPos) {
      return 1; // Default 1 tick if positions unknown
    }

    // Calculate distance
    const dx = senderPos.x - recipientPos.x;
    const dy = senderPos.y - recipientPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Base: 1 tick per 20 LY, minimum 1 tick
    let baseTicks = Math.max(1, Math.floor(distance / 20));

    // Apply priority modifier
    const priorityDef = ORDER_PRIORITIES[priority] || ORDER_PRIORITIES.NORMAL;
    baseTicks = Math.max(1, baseTicks + priorityDef.transmitBonus);

    return baseTicks;
  }

  /**
   * Get entity position from various component types
   */
  getEntityPosition(entityId) {
    // Check PlayerLocation
    const playerLoc = this.entities.getComponent(entityId, 'PlayerLocation');
    if (playerLoc?.systemId) {
      const starPos = this.entities.getComponent(playerLoc.systemId, 'Position');
      return starPos;
    }

    // Check Position component
    const pos = this.entities.getComponent(entityId, 'Position');
    if (pos) return pos;

    // Check Orbit component
    const orbit = this.entities.getComponent(entityId, 'Orbit');
    if (orbit?.parentId) {
      return this.entities.getComponent(orbit.parentId, 'Position');
    }

    return null;
  }

  /**
   * Add order to unit's queue
   */
  addToOrderQueue(unitId, orderId) {
    let queue = this.entities.getComponent(unitId, 'OrderQueue');

    if (!queue) {
      queue = Components.OrderQueue({});
      this.entities.addComponent(unitId, 'OrderQueue', queue);
    }

    if (queue.orders.length >= queue.maxQueueSize) {
      // Remove oldest completed/failed order
      const toRemove = queue.orders.find(id => {
        const order = this.getOrderById(id);
        return order && ['completed', 'failed', 'cancelled'].includes(order.status);
      });
      if (toRemove) {
        queue.orders = queue.orders.filter(id => id !== toRemove);
      } else {
        return false; // Queue full
      }
    }

    queue.orders.push(orderId);
    return true;
  }

  /**
   * Process order transmissions
   */
  processTransmissions(tickData) {
    for (const [entityId, components] of this.entities.query('Order')) {
      const order = components.Order;

      if (order.status === ORDER_STATUS.PENDING) {
        const ticksElapsed = tickData.tick - order.issuedAt;

        if (ticksElapsed >= order.transmitTime) {
          // Order has arrived at recipient
          order.status = ORDER_STATUS.RECEIVED;

          this.events?.emit('order:received', {
            orderId: order.id,
            recipientId: order.recipientId
          });

          // Check if unit will accept order (loyalty check)
          if (this.checkOrderAcceptance(order)) {
            order.status = ORDER_STATUS.EXECUTING;
            this.events?.emit('order:executing', {
              orderId: order.id,
              recipientId: order.recipientId,
              type: order.type
            });
          } else {
            order.status = ORDER_STATUS.REFUSED;
            order.result = ORDER_RESULTS.FAILURE;
            order.resultDetails = 'Order refused by unit';
            this.events?.emit('order:refused', {
              orderId: order.id,
              recipientId: order.recipientId
            });
          }
        }
      }
    }
  }

  /**
   * Check if unit will accept order based on loyalty
   */
  checkOrderAcceptance(order) {
    const commandable = this.entities.getComponent(order.recipientId, 'Commandable');
    if (!commandable) return true;

    // Loyalty check - lower loyalty = chance of refusal
    if (commandable.loyalty < 1.0) {
      const roll = this.rng ? this.rng() : Math.random();
      if (roll > commandable.loyalty) {
        return false;
      }
    }

    return true;
  }

  /**
   * Process order executions
   */
  processExecutions(tickData) {
    for (const [entityId, components] of this.entities.query('Order')) {
      const order = components.Order;

      if (order.status === ORDER_STATUS.EXECUTING) {
        const orderDef = ORDER_TYPES[order.type];

        // Check if execution time has elapsed
        const executionStart = order.issuedAt + order.transmitTime;
        const ticksExecuting = tickData.tick - executionStart;

        if (ticksExecuting >= order.executionTime) {
          // Execute the order
          const result = this.executeOrder(order, entityId);

          if (result.success) {
            order.status = ORDER_STATUS.COMPLETED;
            order.result = ORDER_RESULTS.SUCCESS;
            order.resultDetails = result.message;
            order.completedAt = tickData.tick;

            this.events?.emit('order:completed', {
              orderId: order.id,
              recipientId: order.recipientId,
              result
            });

            // Handle repeating orders
            if (orderDef.repeating && order.parameters.repeat !== false) {
              // Reset execution state
              order.status = ORDER_STATUS.EXECUTING;
              order.issuedAt = tickData.tick;
              order.completedAt = null;
            }
          } else {
            order.status = ORDER_STATUS.FAILED;
            order.result = ORDER_RESULTS.FAILURE;
            order.resultDetails = result.error;
            order.completedAt = tickData.tick;

            this.events?.emit('order:failed', {
              orderId: order.id,
              recipientId: order.recipientId,
              error: result.error
            });
          }
        }
      }
    }
  }

  /**
   * Execute a specific order
   */
  executeOrder(order, entityId) {
    const orderDef = ORDER_TYPES[order.type];
    const commandable = this.entities.getComponent(order.recipientId, 'Commandable');

    // Competence check - lower competence = chance of partial success or failure
    let successModifier = 1.0;
    if (commandable) {
      const competenceRoll = this.rng ? this.rng() : Math.random();
      if (competenceRoll > commandable.competence) {
        successModifier = 0.5; // Partial success
      }
    }

    // Execute based on order type
    switch (order.type) {
      case 'MOVE':
        return this.executeMoveOrder(order, successModifier);
      case 'PATROL':
        return this.executePatrolOrder(order, successModifier);
      case 'SCOUT':
        return this.executeScoutOrder(order, successModifier);
      case 'ATTACK':
        return this.executeAttackOrder(order, successModifier);
      case 'DEFEND':
        return this.executeDefendOrder(order, successModifier);
      case 'TRADE':
        return this.executeTradeOrder(order, successModifier);
      case 'TRANSPORT':
        return this.executeTransportOrder(order, successModifier);
      default:
        return this.executeGenericOrder(order, successModifier);
    }
  }

  /**
   * Execute movement order
   */
  executeMoveOrder(order, modifier) {
    // Move unit to target location
    if (!order.targetId) {
      return { success: false, error: 'No destination specified' };
    }

    // Update unit's location
    const position = this.entities.getComponent(order.recipientId, 'Position');
    const targetPos = this.entities.getComponent(order.targetId, 'Position');

    if (position && targetPos) {
      position.x = targetPos.x;
      position.y = targetPos.y;
      position.z = targetPos.z || 0;
    }

    // Update PlayerLocation if applicable
    const playerLoc = this.entities.getComponent(order.recipientId, 'PlayerLocation');
    if (playerLoc) {
      playerLoc.systemId = order.targetId;
    }

    return {
      success: true,
      message: `Arrived at ${order.targetName || order.targetId}`
    };
  }

  /**
   * Execute patrol order
   */
  executePatrolOrder(order, modifier) {
    // Patrol completes one cycle
    return {
      success: true,
      message: `Patrol cycle complete at ${order.targetName || 'patrol route'}`
    };
  }

  /**
   * Execute scout order
   */
  executeScoutOrder(order, modifier) {
    if (!order.targetId) {
      return { success: false, error: 'No target to scout' };
    }

    // Generate intel report
    const intelSystem = this.engine.getSystem('intel');
    if (intelSystem) {
      intelSystem.generateReport(order.targetId, order.issuerId, modifier);
    }

    return {
      success: true,
      message: `Reconnaissance of ${order.targetName || order.targetId} complete`
    };
  }

  /**
   * Execute attack order
   */
  executeAttackOrder(order, modifier) {
    // Placeholder - would integrate with combat system
    return {
      success: modifier >= 0.5,
      message: modifier >= 0.5
        ? `Attack on ${order.targetName || order.targetId} successful`
        : `Attack on ${order.targetName || order.targetId} repelled`
    };
  }

  /**
   * Execute defend order
   */
  executeDefendOrder(order, modifier) {
    return {
      success: true,
      message: `Defensive position established at ${order.targetName || 'location'}`
    };
  }

  /**
   * Execute trade order
   */
  executeTradeOrder(order, modifier) {
    // Would integrate with economy system
    return {
      success: true,
      message: `Trade completed at ${order.targetName || order.targetId}`
    };
  }

  /**
   * Execute transport order
   */
  executeTransportOrder(order, modifier) {
    return {
      success: true,
      message: `Cargo delivered to ${order.targetName || order.targetId}`
    };
  }

  /**
   * Generic order execution
   */
  executeGenericOrder(order, modifier) {
    return {
      success: true,
      message: `Order ${order.type} completed`
    };
  }

  /**
   * Check for timed out orders
   */
  checkOrderTimeouts(tickData) {
    const timeout = 100; // Orders timeout after 100 ticks if not completed

    for (const [entityId, components] of this.entities.query('Order')) {
      const order = components.Order;

      if (order.status === ORDER_STATUS.PENDING || order.status === ORDER_STATUS.TRANSMITTED) {
        if (tickData.tick - order.issuedAt > timeout) {
          order.status = ORDER_STATUS.FAILED;
          order.result = ORDER_RESULTS.FAILURE;
          order.resultDetails = 'Order timed out - failed to reach recipient';
          order.completedAt = tickData.tick;

          this.events?.emit('order:timeout', {
            orderId: order.id
          });
        }
      }
    }
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId, cancelerId) {
    const order = this.getOrderById(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const orderDef = ORDER_TYPES[order.type];
    if (!orderDef.canCancel) {
      return { success: false, error: 'This order type cannot be cancelled' };
    }

    if (order.issuerId !== cancelerId) {
      return { success: false, error: 'Only the issuer can cancel this order' };
    }

    if (['completed', 'failed', 'cancelled'].includes(order.status)) {
      return { success: false, error: `Order already ${order.status}` };
    }

    order.status = ORDER_STATUS.CANCELLED;
    order.completedAt = this.engine.state.tick;

    this.events?.emit('order:cancelled', {
      orderId: order.id,
      cancelerId
    });

    return {
      success: true,
      message: `Order ${orderId} cancelled`
    };
  }

  /**
   * Get orders for a specific unit or issuer
   */
  getOrders(filters = {}) {
    const results = [];

    for (const [entityId, components] of this.entities.query('Order')) {
      const order = components.Order;

      let matches = true;

      if (filters.issuerId && order.issuerId !== filters.issuerId) matches = false;
      if (filters.recipientId && order.recipientId !== filters.recipientId) matches = false;
      if (filters.status && order.status !== filters.status) matches = false;
      if (filters.type && order.type !== filters.type) matches = false;

      if (matches) {
        results.push({
          entityId,
          ...order,
          typeName: ORDER_TYPES[order.type]?.name || order.type,
          recipientName: this.getUnitName(order.recipientId)
        });
      }
    }

    // Sort by issued time, newest first
    results.sort((a, b) => b.issuedAt - a.issuedAt);

    return results;
  }

  /**
   * Get order by ID
   */
  getOrderById(orderId) {
    for (const [entityId, components] of this.entities.query('Order')) {
      if (components.Order.id === orderId) {
        return components.Order;
      }
    }
    return null;
  }

  /**
   * Get unit name from various component types
   */
  getUnitName(unitId) {
    const identity = this.entities.getComponent(unitId, 'Identity');
    if (identity) return identity.name;

    const player = this.entities.getComponent(unitId, 'Player');
    if (player) return player.name;

    return unitId;
  }

  /**
   * Get system state for serialization
   */
  getState() {
    return {
      orderCounter: this.orderCounter
    };
  }

  /**
   * Load system state
   */
  loadState(state) {
    if (state.orderCounter) {
      this.orderCounter = state.orderCounter;
    }
  }
}

export default OrderSystem;
