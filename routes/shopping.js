const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/database');
const { getSmartSuggestions } = require('../services/suggestionService');

// Default user ID for demo purposes
const DEFAULT_USER_ID = 1;

// Get all shopping lists for a user
router.get('/lists/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || DEFAULT_USER_ID;
    const db = getDatabase();
    
    db.all(
      `SELECT id, name, created_at, 
              (SELECT COUNT(*) FROM shopping_items WHERE list_id = shopping_lists.id) as item_count
       FROM shopping_lists 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId],
      (err, lists) => {
        if (err) {
          res.status(500).json({ 
            success: false, 
            error: 'Database error' 
          });
        } else {
          res.json({ 
            success: true, 
            lists: lists || [] 
          });
        }
      }
    );
  } catch (error) {
    console.error('Error getting shopping lists:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Create a new shopping list
router.post('/lists', async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.body.userId || DEFAULT_USER_ID;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'List name is required' 
      });
    }

    const db = getDatabase();
    db.run(
      'INSERT INTO shopping_lists (user_id, name) VALUES (?, ?)',
      [userId, name],
      function(err) {
        if (err) {
          res.status(500).json({ 
            success: false, 
            error: 'Database error' 
          });
        } else {
          res.json({ 
            success: true, 
            listId: this.lastID,
            message: 'Shopping list created successfully' 
          });
        }
      }
    );
  } catch (error) {
    console.error('Error creating shopping list:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get items in a shopping list
router.get('/lists/:listId/items', async (req, res) => {
  try {
    const { listId } = req.params;
    const db = getDatabase();
    
    db.all(
      `SELECT id, name, quantity, unit, category, price, brand, notes, is_completed, added_at
       FROM shopping_items 
       WHERE list_id = ? 
       ORDER BY is_completed ASC, added_at DESC`,
      [listId],
      (err, items) => {
        if (err) {
          res.status(500).json({ 
            success: false, 
            error: 'Database error' 
          });
        } else {
          res.json({ 
            success: true, 
            items: items || [] 
          });
        }
      }
    );
  } catch (error) {
    console.error('Error getting shopping list items:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Add item to shopping list
router.post('/lists/:listId/items', async (req, res) => {
  try {
    const { listId } = req.params;
    const { name, quantity, unit, category, price, brand, notes } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Item name is required' 
      });
    }

    const db = getDatabase();
    db.run(
      `INSERT INTO shopping_items (list_id, name, quantity, unit, category, price, brand, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [listId, name, quantity || 1, unit || '', category || '', price || null, brand || '', notes || ''],
      function(err) {
        if (err) {
          res.status(500).json({ 
            success: false, 
            error: 'Database error' 
          });
        } else {
          res.json({ 
            success: true, 
            itemId: this.lastID,
            message: 'Item added successfully' 
          });
        }
      }
    );
  } catch (error) {
    console.error('Error adding item to shopping list:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Update shopping list item
router.put('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, quantity, unit, category, price, brand, notes, is_completed } = req.body;
    
    const db = getDatabase();
    db.run(
      `UPDATE shopping_items 
       SET name = ?, quantity = ?, unit = ?, category = ?, price = ?, brand = ?, notes = ?, is_completed = ?
       WHERE id = ?`,
      [name, quantity, unit, category, price, brand, notes, is_completed ? 1 : 0, itemId],
      function(err) {
        if (err) {
          res.status(500).json({ 
            success: false, 
            error: 'Database error' 
          });
        } else if (this.changes === 0) {
          res.status(404).json({ 
            success: false, 
            error: 'Item not found' 
          });
        } else {
          res.json({ 
            success: true, 
            message: 'Item updated successfully' 
          });
        }
      }
    );
  } catch (error) {
    console.error('Error updating shopping list item:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Remove item from shopping list
router.delete('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const db = getDatabase();
    
    console.log(`Attempting to delete item with ID: ${itemId}`); // Added log
    db.run(
      'DELETE FROM shopping_items WHERE id = ?',
      [itemId],
      function(err) {
        if (err) {
          console.error(`Database error deleting item ${itemId}:`, err); // Added log
          res.status(500).json({ 
            success: false, 
            error: 'Database error' 
          });
        } else if (this.changes === 0) {
          console.log(`Item with ID ${itemId} not found.`); // Added log
          res.status(404).json({ 
            success: false, 
            error: 'Item not found' 
          });
        } else {
          console.log(`Successfully removed item with ID: ${itemId}. Changes: ${this.changes}`); // Added log
          res.json({ 
            success: true, 
            message: 'Item removed successfully' 
          });
        }
      }
    );
  } catch (error) {
    console.error('Error removing item from shopping list:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Mark item as completed
router.patch('/items/:itemId/complete', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { is_completed } = req.body;
    
    const db = getDatabase();
    db.run(
      'UPDATE shopping_items SET is_completed = ? WHERE id = ?',
      [is_completed ? 1 : 0, itemId],
      function(err) {
        if (err) {
          res.status(500).json({ 
            success: false, 
            error: 'Database error' 
          });
        } else if (this.changes === 0) {
          res.status(404).json({ 
            success: false, 
            error: 'Item not found' 
          });
        } else {
          res.json({ 
            success: true, 
            message: `Item marked as ${is_completed ? 'completed' : 'incomplete'}` 
          });
        }
      }
    );
  } catch (error) {
    console.error('Error updating item completion status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Clear all items from a list
router.delete('/lists/:listId/items', async (req, res) => {
  try {
    const { listId } = req.params;
    const db = getDatabase();
    
    db.run(
      'DELETE FROM shopping_items WHERE list_id = ?',
      [listId],
      function(err) {
        if (err) {
          res.status(500).json({ 
            success: false, 
            error: 'Database error' 
          });
        } else {
          res.json({ 
            success: true, 
            message: `Removed ${this.changes} items from the list`
          });
        }
      }
    );
  } catch (error) {
    console.error('Error clearing all items:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Clear completed items from a list
router.delete('/lists/:listId/items/completed', async (req, res) => {
  try {
    const { listId } = req.params;
    const db = getDatabase();
    
    db.run(
      'DELETE FROM shopping_items WHERE list_id = ? AND is_completed = 1',
      [listId],
      function(err) {
        if (err) {
          res.status(500).json({ 
            success: false, 
            error: 'Database error' 
          });
        } else {
          res.json({ 
            success: true, 
            message: `Removed ${this.changes} completed items` 
          });
        }
      }
    );
  } catch (error) {
    console.error('Error clearing completed items:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get shopping suggestions
router.get('/suggestions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { category } = req.query;
    
    const suggestions = await getSmartSuggestions(userId, category);
    
    res.json({ 
      success: true, 
      suggestions 
    });
  } catch (error) {
    console.error('Error getting shopping suggestions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Search items in shopping list
router.get('/lists/:listId/search', async (req, res) => {
  try {
    const { listId } = req.params;
    const { query, category, priceRange } = req.query;
    
    let sql = 'SELECT * FROM shopping_items WHERE list_id = ?';
    const params = [listId];
    
    if (query) {
      sql += ' AND name LIKE ?';
      params.push(`%${query}%`);
    }
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    if (priceRange) {
      sql += ' AND price <= ?';
      params.push(parseFloat(priceRange));
    }
    
    sql += ' ORDER BY added_at DESC';
    
    const db = getDatabase();
    db.all(sql, params, (err, items) => {
      if (err) {
        res.status(500).json({ 
          success: false, 
          error: 'Database error' 
        });
      } else {
        res.json({ 
          success: true, 
          items: items || [] 
        });
      }
    });
  } catch (error) {
    console.error('Error searching shopping list:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get shopping list statistics
router.get('/lists/:listId/stats', async (req, res) => {
  try {
    const { listId } = req.params;
    const db = getDatabase();
    
    db.get(
      `SELECT 
         COUNT(*) as total_items,
         COUNT(CASE WHEN is_completed = 1 THEN 1 END) as completed_items,
         COUNT(CASE WHEN is_completed = 0 THEN 1 END) as pending_items,
         SUM(price) as total_estimated_cost,
         AVG(price) as average_item_price
       FROM shopping_items 
       WHERE list_id = ?`,
      [listId],
      (err, stats) => {
        if (err) {
          res.status(500).json({ 
            success: false, 
            error: 'Database error' 
          });
        } else {
          res.json({ 
            success: true, 
            stats: {
              ...stats,
              completion_rate: stats.total_items > 0 ? 
                Math.round((stats.completed_items / stats.total_items) * 100) : 0
            }
          });
        }
      }
    );
  } catch (error) {
    console.error('Error getting shopping list stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;
