const express = require('express');
const router = express.Router();
const {
  getSmartSuggestions,
  getAIRecommendations,
  getSeasonalRecommendations,
  getPriceBasedSuggestions
} = require('../services/suggestionService');
const { getDatabase } = require('../database/database');

// Default user ID for demo purposes
const DEFAULT_USER_ID = 1;

router.post('/process', async (req, res) => {
  try {
    const { utterance, userId, listId } = req.body;
    const db = getDatabase();

    // This is a placeholder for where NLP processing would happen
    // For now, we'll just assume the intent is to add an item
    const intent = 'shopping.add_item';
    const entities = [{ entity: 'item', sourceText: utterance }];

    switch (intent) {
      case 'shopping.add_item':
        const addItem = entities.find(e => e.entity === 'item');
        if (addItem) {
          db.run(
            `INSERT INTO shopping_items (list_id, name) VALUES (?, ?)`,
            [listId, addItem.sourceText],
            function(err) {
              if (err) {
                res.status(500).json({ success: false, error: 'Database error' });
              } else {
                res.json({ success: true, message: 'Item added successfully' });
              }
            }
          );
        } else {
          res.status(400).json({ success: false, error: 'Item not found' });
        }
        break;
      default:
        res.status(400).json({ success: false, error: 'Unknown intent' });
    }
  } catch (error) {
    console.error('Error processing utterance:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get smart shopping suggestions
router.get('/suggestions/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || DEFAULT_USER_ID;
    const { category, budget } = req.query;
    
    let suggestions;
    
    if (budget) {
      suggestions = getPriceBasedSuggestions(parseFloat(budget), category);
    } else {
      suggestions = await getSmartSuggestions(userId, category);
    }
    
    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error getting smart suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get recommendations
router.post('/recommendations', async (req, res) => {
  try {
    const { userQuery, userId } = req.body;
    const finalUserId = userId || DEFAULT_USER_ID;
    
    if (!userQuery) {
      return res.status(400).json({
        success: false,
        error: 'User query is required'
      });
    }

    // Get user's shopping history for context
    let shoppingHistory = [];
    const db = getDatabase();
    shoppingHistory = await new Promise((resolve, reject) => {
      db.all(
        `SELECT item_name, category, price 
         FROM shopping_history 
         WHERE user_id = ? 
         ORDER BY purchased_at DESC 
         LIMIT 20`,
        [finalUserId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    const recommendations = await getRecommendations(userQuery, shoppingHistory);
    
    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get seasonal recommendations
router.get('/seasonal', (req, res) => {
  try {
    const seasonalItems = getSeasonalRecommendations();
    
    res.json({
      success: true,
      seasonalItems,
      currentMonth: new Date().toLocaleString('en-US', { month: 'long' })
    });
  } catch (error) {
    console.error('Error getting seasonal recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get price-based suggestions
router.get('/price-suggestions', (req, res) => {
  try {
    const { budget, category } = req.query;
    
    if (!budget) {
      return res.status(400).json({
        success: false,
        error: 'Budget is required'
      });
    }

    const suggestions = getPriceBasedSuggestions(parseFloat(budget), category);
    
    res.json({
      success: true,
      suggestions,
      budget: parseFloat(budget)
    });
  } catch (error) {
    console.error('Error getting price-based suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get substitute suggestions
router.get('/substitutes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { itemName } = req.query;
    
    if (!itemName) {
      return res.status(400).json({
        success: false,
        error: 'Item name is required'
      });
    }

    // Get user's shopping history
    const db = getDatabase();
    const history = await new Promise((resolve, reject) => {
      db.all(
        `SELECT item_name, category 
         FROM shopping_history 
         WHERE user_id = ? 
         ORDER BY purchased_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Find substitutes for the specified item
    const substitutes = [];
    const item = history.find(h => 
      h.item_name.toLowerCase().includes(itemName.toLowerCase())
    );

    if (item) {
      if (item.item_name.toLowerCase().includes('milk')) {
        substitutes.push({
          original: item.item_name,
          alternatives: ['Almond milk', 'Soy milk', 'Oat milk', 'Coconut milk'],
          reason: 'Dairy alternatives for lactose intolerance or preference'
        });
      } else if (item.item_name.toLowerCase().includes('bread')) {
        substitutes.push({
          original: item.item_name,
          alternatives: ['Gluten-free bread', 'Whole grain bread', 'Tortillas', 'Rice cakes'],
          reason: 'Alternative bread options'
        });
      } else if (item.item_name.toLowerCase().includes('meat')) {
        substitutes.push({
          original: item.item_name,
          alternatives: ['Tofu', 'Tempeh', 'Seitan', 'Legumes'],
          reason: 'Plant-based protein alternatives'
        });
      } else {
        // Generic substitutes
        substitutes.push({
          original: item.item_name,
          alternatives: ['Generic brand', 'Store brand', 'Different variety'],
          reason: 'Alternative options for cost or preference'
        });
      }
    }

    res.json({
      success: true,
      substitutes
    });
  } catch (error) {
    console.error('Error getting substitute suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get category-based suggestions
router.get('/category-suggestions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { category } = req.query;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category is required'
      });
    }

    const suggestions = await getSmartSuggestions(userId, category);
    
    res.json({
      success: true,
      category,
      suggestions: suggestions.categorySpecific || []
    });
  } catch (error) {
    console.error('Error getting category suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get personalized recommendations based on shopping patterns
router.get('/personalized/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    const db = getDatabase();
    
    // Get user's shopping patterns
    const patterns = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           item_name,
           category,
           COUNT(*) as frequency,
           AVG(price) as avg_price,
           MAX(purchased_at) as last_purchased
         FROM shopping_history 
         WHERE user_id = ? 
         GROUP BY item_name, category 
         ORDER BY frequency DESC, last_purchased DESC 
         LIMIT ?`,
        [userId, parseInt(limit)],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Get seasonal items
    const seasonalItems = getSeasonalRecommendations();
    
    // Combine patterns with seasonal recommendations
    const personalizedSuggestions = {
      frequentlyBought: patterns.slice(0, 5),
      seasonalRecommendations: seasonalItems.slice(0, 3),
      categoryPreferences: patterns.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {}),
      estimatedNextPurchase: patterns
        .filter(item => {
          const daysSinceLastPurchase = Math.floor(
            (new Date() - new Date(item.last_purchased)) / (1000 * 60 * 60 * 24)
          );
          return daysSinceLastPurchase > 7; // Suggest items not bought recently
        })
        .slice(0, 3)
    };

    res.json({
      success: true,
      personalizedSuggestions
    });
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Test suggestion service status
router.get('/status', (req, res) => {
  const status = {
    suggestionService: 'operational',
    suggestionEngine: process.env.SUGGESTION_ENGINE || 'default',
    fallbackEngine: 'active',
    timestamp: new Date().toISOString()
  };
  
  res.json({
    success: true,
    status
  });
});

module.exports = router;