require('dotenv').config();
console.log('JWT_SECRET from test/api.test.js:', process.env.JWT_SECRET);
const request = require('supertest');
const { app, server, io } = require('../server');
const { initDatabase, closeDatabase } = require('../database/database');

describe('Shopping Assistant API', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
    await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => io.close(resolve));
  });

  describe('Shopping Lists', () => {
    test('should create a new shopping list', async () => {
      const res = await request(app)
        .post('/api/shopping/lists')
        .send({
          name: 'Test Shopping List'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.listId).toBeDefined();
    });

    test('should get shopping lists', async () => {
      const res = await request(app)
        .get('/api/shopping/lists/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.lists)).toBe(true);
    });
  });

  describe('Shopping Items', () => {
    let listId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/shopping/lists')
        .send({
          name: 'Test List for Items'
        });
      listId = res.body.listId;
    });

    test('should add item to shopping list', async () => {
      const res = await request(app)
        .post(`/api/shopping/lists/${listId}/items`)
        .send({
          name: 'Test Item',
          quantity: 2,
          category: 'Test'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should get items from shopping list', async () => {
      const res = await request(app)
        .get(`/api/shopping/lists/${listId}/items`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });

  describe('Voice Commands', () => {
    test('should process voice command', async () => {
      const res = await request(app)
        .post('/api/voice/process')
        .send({
          command: 'add milk to my list',
          language: 'en'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should get supported languages', async () => {
      const res = await request(app)
        .get('/api/voice/languages');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.languages)).toBe(true);
    });
  });

  describe('Suggestions', () => {
    test('should get shopping suggestions', async () => {
      const res = await request(app)
        .get('/api/suggestions/suggestions/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should get seasonal recommendations', async () => {
      const res = await request(app)
        .get('/api/suggestions/seasonal');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.seasonalItems)).toBe(true);
    });
  });
});
