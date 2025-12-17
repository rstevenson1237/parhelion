import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MessageSystem, MESSAGE_TYPES } from '../src/systems/MessageSystem.js';
import { EntityManager, Components } from '../src/core/ECS.js';

describe('MessageSystem', () => {
  let messageSystem;
  let entities;
  let mockEngine;
  let playerId;

  beforeEach(() => {
    entities = new EntityManager();
    messageSystem = new MessageSystem();

    mockEngine = {
      state: { tick: 0 },
      events: { emit: () => {}, on: () => {} },
      getSystem: () => null
    };

    messageSystem.entities = entities;
    messageSystem.engine = mockEngine;
    messageSystem.events = mockEngine.events;

    // Create player entity
    playerId = entities.create();
    entities.addComponent(playerId, 'Player', { name: 'Commander Test' });
    entities.addComponent(playerId, 'Position', Components.Position(0, 0));
  });

  describe('sendMessage', () => {
    it('should send a message successfully', () => {
      const recipientId = entities.create();
      entities.addComponent(recipientId, 'Identity', Components.Identity('Admiral Chen', 'character'));
      entities.addComponent(recipientId, 'Position', Components.Position(10, 10));

      const result = messageSystem.sendMessage(
        playerId,
        recipientId,
        'Test message content',
        { subject: 'Test Subject' }
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it('should deliver instant messages immediately', () => {
      const recipientId = entities.create();
      entities.addComponent(recipientId, 'Identity', Components.Identity('Admiral Chen', 'character'));

      messageSystem.sendMessage(playerId, recipientId, 'Instant message', { instant: true });

      const inbox = entities.getComponent(recipientId, 'Inbox');
      assert.ok(inbox);
      assert.strictEqual(inbox.messages.length, 1);
      assert.strictEqual(inbox.unreadCount, 1);
    });
  });

  describe('getMessages', () => {
    it('should retrieve messages from inbox', () => {
      messageSystem.systemMessage(playerId, 'Test notification');

      const result = messageSystem.getMessages(playerId);

      assert.strictEqual(result.messages.length, 1);
      assert.strictEqual(result.unreadCount, 1);
    });

    it('should filter by unread only', () => {
      messageSystem.systemMessage(playerId, 'Message 1');
      messageSystem.systemMessage(playerId, 'Message 2');

      // Read one message
      const inbox = entities.getComponent(playerId, 'Inbox');
      messageSystem.readMessage(playerId, inbox.messages[0]);

      const unread = messageSystem.getMessages(playerId, { unreadOnly: true });
      assert.strictEqual(unread.messages.length, 1);
    });
  });

  describe('readMessage', () => {
    it('should mark message as read', () => {
      messageSystem.systemMessage(playerId, 'Test message');

      const inbox = entities.getComponent(playerId, 'Inbox');
      const messageId = inbox.messages[0];

      const result = messageSystem.readMessage(playerId, messageId);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.message.read, true);
      assert.strictEqual(inbox.unreadCount, 0);
    });
  });

  describe('broadcast', () => {
    it('should send to multiple recipients', () => {
      const recipients = [];
      for (let i = 0; i < 3; i++) {
        const id = entities.create();
        entities.addComponent(id, 'Commandable', Components.Commandable({}));
        entities.addComponent(id, 'Position', Components.Position(i * 10, 0));
        recipients.push(id);
      }

      const result = messageSystem.broadcast(playerId, 'Broadcast test', { recipients });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.sent, 3);
    });
  });
});
