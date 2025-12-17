/**
 * PARHELION - Message System
 *
 * Handles communication between entities including personal messages,
 * broadcasts, faction communications, and system alerts.
 */

import { Components } from '../core/ECS.js';

export const MESSAGE_TYPES = {
  PERSONAL: 'personal',
  BROADCAST: 'broadcast',
  FACTION: 'faction',
  SYSTEM: 'system',
  INTEL: 'intel',
  DIPLOMATIC: 'diplomatic'
};

export class MessageSystem {
  constructor() {
    this.entities = null;
    this.engine = null;
    this.events = null;
    this.rng = null;
    this.messageCounter = 0;
  }

  initialize(engine) {
    this.engine = engine;
    this.entities = engine.getSystem('entities')?.entities || engine.entities;
    this.events = engine.events;

    // Subscribe to events that generate messages
    this.events?.on('order:completed', (data) => this.onOrderCompleted(data));
    this.events?.on('order:failed', (data) => this.onOrderFailed(data));
    this.events?.on('event:fired', (data) => this.onGameEvent(data));
    this.events?.on('diplomacy:changed', (data) => this.onDiplomacyChanged(data));
  }

  setRNG(rng) {
    this.rng = rng;
  }

  update(tickData) {
    this.processDelayedMessages(tickData);
    this.cleanupOldMessages(tickData);
  }

  /**
   * Send a message between entities
   */
  sendMessage(senderId, recipientId, content, options = {}) {
    // Get sender info
    const senderName = this.getEntityName(senderId);

    // Calculate delivery time based on distance
    const deliveryDelay = options.instant ? 0 : this.calculateDeliveryTime(senderId, recipientId);

    // Create message entity
    const messageId = this.entities.create();
    const message = Components.Message({
      id: `msg_${++this.messageCounter}`,
      senderId,
      senderName,
      recipientId,
      recipientName: this.getEntityName(recipientId),
      subject: options.subject || '',
      content,
      type: options.type || MESSAGE_TYPES.PERSONAL,
      priority: options.priority || 'normal',
      sentAt: this.engine.state.tick,
      receivedAt: deliveryDelay === 0 ? this.engine.state.tick : null,
      encrypted: options.encrypted || false,
      attachments: options.attachments || []
    });

    this.entities.addComponent(messageId, 'Message', message);

    // If instant delivery, add to inbox immediately
    if (deliveryDelay === 0) {
      this.deliverMessage(recipientId, message);
    } else {
      // Store pending delivery
      this.entities.addComponent(messageId, 'PendingDelivery', {
        recipientId,
        deliverAt: this.engine.state.tick + deliveryDelay
      });
    }

    this.events?.emit('message:sent', {
      messageId: message.id,
      senderId,
      recipientId,
      type: message.type
    });

    return {
      success: true,
      messageId: message.id,
      deliveryDelay,
      message: deliveryDelay > 0
        ? `Message will arrive in ${deliveryDelay} tick(s)`
        : 'Message sent'
    };
  }

  /**
   * Send a broadcast message to multiple recipients
   */
  broadcast(senderId, content, options = {}) {
    const recipients = options.recipients || this.getAllRecipients(senderId, options.scope);
    const results = [];

    for (const recipientId of recipients) {
      const result = this.sendMessage(senderId, recipientId, content, {
        ...options,
        type: MESSAGE_TYPES.BROADCAST
      });
      results.push({ recipientId, ...result });
    }

    this.events?.emit('message:broadcast', {
      senderId,
      recipientCount: recipients.length,
      scope: options.scope
    });

    return {
      success: true,
      sent: results.length,
      message: `Broadcast sent to ${results.length} recipient(s)`
    };
  }

  /**
   * Send a faction-wide message
   */
  sendFactionMessage(senderId, factionId, content, options = {}) {
    // Get all entities in the faction
    const recipients = [];

    for (const [entityId, components] of this.entities.query('FactionMember')) {
      if (components.FactionMember?.factionId === factionId && entityId !== senderId) {
        recipients.push(entityId);
      }
    }

    // Also check player faction
    for (const [entityId, components] of this.entities.query('Player')) {
      if (components.Player?.factionId === factionId && entityId !== senderId) {
        recipients.push(entityId);
      }
    }

    return this.broadcast(senderId, content, {
      ...options,
      recipients,
      type: MESSAGE_TYPES.FACTION
    });
  }

  /**
   * Send a system notification
   */
  systemMessage(recipientId, content, options = {}) {
    return this.sendMessage('SYSTEM', recipientId, content, {
      ...options,
      type: MESSAGE_TYPES.SYSTEM,
      instant: true,
      subject: options.subject || 'System Notification'
    });
  }

  /**
   * Deliver message to recipient's inbox
   */
  deliverMessage(recipientId, message) {
    let inbox = this.entities.getComponent(recipientId, 'Inbox');

    if (!inbox) {
      inbox = Components.Inbox({});
      this.entities.addComponent(recipientId, 'Inbox', inbox);
    }

    // Add message to inbox
    inbox.messages.unshift(message.id);
    inbox.unreadCount++;

    // Enforce max messages
    if (inbox.messages.length > inbox.maxMessages) {
      inbox.messages = inbox.messages.slice(0, inbox.maxMessages);
    }

    message.receivedAt = this.engine.state.tick;

    this.events?.emit('message:delivered', {
      messageId: message.id,
      recipientId
    });
  }

  /**
   * Process delayed message deliveries
   */
  processDelayedMessages(tickData) {
    for (const [entityId, components] of this.entities.query('Message', 'PendingDelivery')) {
      const pending = components.PendingDelivery;

      if (tickData.tick >= pending.deliverAt) {
        this.deliverMessage(pending.recipientId, components.Message);
        this.entities.removeComponent(entityId, 'PendingDelivery');
      }
    }
  }

  /**
   * Get messages for an entity
   */
  getMessages(entityId, options = {}) {
    const inbox = this.entities.getComponent(entityId, 'Inbox');
    if (!inbox) {
      return { messages: [], unreadCount: 0 };
    }

    const messages = [];
    for (const messageId of inbox.messages) {
      const message = this.getMessageById(messageId);
      if (message) {
        // Apply filters
        if (options.unreadOnly && message.read) continue;
        if (options.type && message.type !== options.type) continue;
        if (options.from && message.senderId !== options.from) continue;

        messages.push(message);
      }
    }

    // Sort by received time, newest first
    messages.sort((a, b) => (b.receivedAt || b.sentAt) - (a.receivedAt || a.sentAt));

    // Apply limit
    const limited = options.limit ? messages.slice(0, options.limit) : messages;

    return {
      messages: limited,
      unreadCount: inbox.unreadCount,
      total: messages.length
    };
  }

  /**
   * Read a specific message
   */
  readMessage(entityId, messageId) {
    const inbox = this.entities.getComponent(entityId, 'Inbox');
    if (!inbox || !inbox.messages.includes(messageId)) {
      return { success: false, error: 'Message not found' };
    }

    const message = this.getMessageById(messageId);
    if (!message) {
      return { success: false, error: 'Message data corrupted' };
    }

    if (!message.read) {
      message.read = true;
      inbox.unreadCount = Math.max(0, inbox.unreadCount - 1);
    }

    return {
      success: true,
      message
    };
  }

  /**
   * Delete a message
   */
  deleteMessage(entityId, messageId) {
    const inbox = this.entities.getComponent(entityId, 'Inbox');
    if (!inbox) {
      return { success: false, error: 'No inbox found' };
    }

    const index = inbox.messages.indexOf(messageId);
    if (index === -1) {
      return { success: false, error: 'Message not found' };
    }

    const message = this.getMessageById(messageId);
    if (message && !message.read) {
      inbox.unreadCount = Math.max(0, inbox.unreadCount - 1);
    }

    inbox.messages.splice(index, 1);

    return { success: true, message: 'Message deleted' };
  }

  /**
   * Get message by ID
   */
  getMessageById(messageId) {
    for (const [entityId, components] of this.entities.query('Message')) {
      if (components.Message.id === messageId) {
        return components.Message;
      }
    }
    return null;
  }

  /**
   * Calculate delivery time based on distance
   */
  calculateDeliveryTime(senderId, recipientId) {
    const senderPos = this.getEntityPosition(senderId);
    const recipientPos = this.getEntityPosition(recipientId);

    if (!senderPos || !recipientPos) {
      return 1;
    }

    const dx = senderPos.x - recipientPos.x;
    const dy = senderPos.y - recipientPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 1 tick per 30 LY
    return Math.max(1, Math.floor(distance / 30));
  }

  /**
   * Get entity position
   */
  getEntityPosition(entityId) {
    const playerLoc = this.entities.getComponent(entityId, 'PlayerLocation');
    if (playerLoc?.systemId) {
      return this.entities.getComponent(playerLoc.systemId, 'Position');
    }
    return this.entities.getComponent(entityId, 'Position');
  }

  /**
   * Get entity name
   */
  getEntityName(entityId) {
    if (entityId === 'SYSTEM') return 'System';

    const identity = this.entities.getComponent(entityId, 'Identity');
    if (identity) return identity.name;

    const player = this.entities.getComponent(entityId, 'Player');
    if (player) return player.name;

    return 'Unknown';
  }

  /**
   * Get all valid recipients for broadcast
   */
  getAllRecipients(excludeId, scope = 'local') {
    const recipients = [];

    // Get player's current location for local scope
    let localSystemId = null;
    if (scope === 'local') {
      const playerLoc = this.entities.getComponent(excludeId, 'PlayerLocation');
      localSystemId = playerLoc?.systemId;
    }

    // Find all commandable units
    for (const [entityId, components] of this.entities.query('Commandable')) {
      if (entityId === excludeId) continue;

      if (scope === 'local' && localSystemId) {
        const unitLoc = this.entities.getComponent(entityId, 'PlayerLocation');
        if (unitLoc?.systemId !== localSystemId) continue;
      }

      recipients.push(entityId);
    }

    return recipients;
  }

  /**
   * Event handlers for auto-generated messages
   */
  onOrderCompleted(data) {
    const order = this.entities.getComponent(data.entityId, 'Order');
    if (!order) return;

    this.systemMessage(order.issuerId,
      `Order completed: ${order.type} - ${data.result?.message || 'Success'}`, {
        subject: 'Order Complete',
        priority: 'normal'
      });
  }

  onOrderFailed(data) {
    const order = this.entities.getComponent(data.entityId, 'Order');
    if (!order) return;

    this.systemMessage(order.issuerId,
      `Order failed: ${order.type} - ${data.error || 'Unknown error'}`, {
        subject: 'Order Failed',
        priority: 'high'
      });
  }

  onGameEvent(data) {
    // Could generate news/intel messages based on events
  }

  onDiplomacyChanged(data) {
    // Generate diplomatic messages on status changes
  }

  /**
   * Clean up old messages
   */
  cleanupOldMessages(tickData) {
    const maxAge = 1000; // Messages expire after 1000 ticks

    for (const [entityId, components] of this.entities.query('Message')) {
      const message = components.Message;
      if (message.read && tickData.tick - message.sentAt > maxAge) {
        this.entities.destroy(entityId);
      }
    }
  }

  /**
   * Get system state
   */
  getState() {
    return {
      messageCounter: this.messageCounter
    };
  }

  /**
   * Load system state
   */
  loadState(state) {
    if (state.messageCounter) {
      this.messageCounter = state.messageCounter;
    }
  }
}

export default MessageSystem;
