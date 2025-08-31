const OpenAI = require('openai');
const { getDatabase } = require('../database/database');

// Initialize OpenAI (optional - can work without API key)
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} catch (error) {
  console.log('OpenAI not configured, using fallback suggestions');
}

// Fallback suggestion engine
const fallbackSuggestions = {
  'dairy': [
    { name: 'Milk', alternatives: ['Almond milk', 'Soy milk', 'Oat milk'], reason: 'Essential dairy item' },
    { name: 'Cheese', alternatives: ['Vegan cheese', 'Goat cheese', 'Cottage cheese'], reason: 'Versatile protein source' },
    { name: 'Yogurt', alternatives: ['Greek yogurt', 'Plant-based yogurt', 'Kefir'], reason: 'Good for gut health' },
    { name: 'Butter', alternatives: ['Margarine', 'Ghee', 'Avocado oil'], reason: 'For cooking and baking' },
    { name: 'Eggs', alternatives: ['Tofu scramble', 'Flax eggs'], reason: 'A breakfast staple' },
  ],
  'produce': [
    { name: 'Bananas', alternatives: ['Apples', 'Oranges', 'Berries'], reason: 'Great source of potassium' },
    { name: 'Spinach', alternatives: ['Kale', 'Arugula', 'Mixed greens'], reason: 'Rich in iron and vitamins' },
    { name: 'Tomatoes', alternatives: ['Bell peppers', 'Cucumbers', 'Carrots'], reason: 'High in antioxidants' },
    { name: 'Avocado', alternatives: ['Guacamole', 'Hummus'], reason: 'Healthy fats' },
    { name: 'Onions', alternatives: ['Garlic', 'Shallots', 'Leeks'], reason: 'A base for many recipes' },
  ],
  'pantry': [
    { name: 'Rice', alternatives: ['Quinoa', 'Couscous', 'Barley'], reason: 'Staple grain' },
    { name: 'Pasta', alternatives: ['Zucchini noodles', 'Brown rice pasta', 'Chickpea pasta'], reason: 'Quick meal base' },
    { name: 'Olive oil', alternatives: ['Avocado oil', 'Coconut oil', 'Grapeseed oil'], reason: 'Healthy cooking oil' },
    { name: 'Canned tomatoes', alternatives: ['Tomato paste', 'Fresh tomatoes'], reason: 'For sauces and soups' },
    { name: 'Lentils', alternatives: ['Chickpeas', 'Black beans', 'Kidney beans'], reason: 'Plant-based protein' },
  ],
  'bakery': [
      { name: 'Bread', alternatives: ['Sourdough', 'Whole wheat', 'Gluten-free bread'], reason: 'For sandwiches and toast' },
      { name: 'Bagels', alternatives: ['English muffins', 'Croissants'], reason: 'A breakfast favorite' },
      { name: 'Muffins', alternatives: ['Scones', 'Danishes'], reason: 'A sweet treat' },
  ],
  'meat': [
      { name: 'Chicken breast', alternatives: ['Chicken thighs', 'Tofu', 'Tempeh'], reason: 'Lean protein' },
      { name: 'Ground beef', alternatives: ['Ground turkey', 'Lentils', 'Mushrooms'], reason: 'For burgers and sauces' },
      { name: 'Salmon', alternatives: ['Tuna', 'Cod', 'Shrimp'], reason: 'Rich in omega-3s' },
  ],
  'beverages': [
        { name: 'Coffee', alternatives: ['Tea', 'Chicory coffee'], reason: 'Morning pick-me-up' },
        { name: 'Orange juice', alternatives: ['Apple juice', 'Grapefruit juice'], reason: 'Vitamin C boost' },
        { name: 'Water', alternatives: ['Sparkling water', 'Coconut water'], reason: 'Stay hydrated' },
  ],
  'frozen': [
      { name: 'Pizza', alternatives: ['Cauliflower crust pizza', 'Frozen calzones'], reason: 'Quick and easy meal' },
      { name: 'Vegetables', alternatives: ['Peas', 'Corn', 'Broccoli'], reason: 'Convenient and long-lasting' },
      { name: 'Ice cream', alternatives: ['Sorbet', 'Gelato', 'Frozen yogurt'], reason: 'A classic dessert' },
  ],
    'snacks': [
        { name: 'Chips', alternatives: ['Pretzels', 'Popcorn', 'Veggie straws'], reason: 'For movie night' },
        { name: 'Crackers', alternatives: ['Rice cakes', 'Crispbreads'], reason: 'Goes well with cheese' },
        { name: 'Nuts', alternatives: ['Almonds', 'Walnuts', 'Cashews'], reason: 'Healthy and filling' },
    ],
    'household': [
        { name: 'Paper towels', alternatives: ['Reusable cloths', 'Sponges'], reason: 'For cleaning up spills' },
        { name: 'Trash bags', alternatives: ['Compostable bags', 'Biodegradable bags'], reason: 'A household essential' },
        { name: 'Dish soap', alternatives: ['Dishwasher pods', 'Eco-friendly dish soap'], reason: 'For sparkling clean dishes' },
    ],
    'personal-care': [
        { name: 'Shampoo', alternatives: ['Conditioner', 'Dry shampoo', 'Shampoo bar'], reason: 'For healthy hair' },
        { name: 'Soap', alternatives: ['Body wash', 'Hand soap'], reason: 'For clean hands and body' },
        { name: 'Toothpaste', alternatives: ['Mouthwash', 'Floss'], reason: 'For good oral hygiene' },
    ]
};

// Get smart suggestions based on shopping history and preferences
const getSmartSuggestions = async (userId, category = null) => {
  try {
    const db = getDatabase();
    
    // Get user's shopping history
    const history = await new Promise((resolve, reject) => {
      db.all(
        `SELECT item_name, category, COUNT(*) as frequency, AVG(price) as avg_price
         FROM shopping_history 
         WHERE user_id = ? 
         GROUP BY item_name, category 
         ORDER BY frequency DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get seasonal recommendations
    const seasonalItems = getSeasonalRecommendations();
    
    // Get category-specific suggestions
    const categorySuggestions = category ? 
      getCategorySuggestions(category, history) : 
      getGeneralSuggestions(history);

    // Combine all suggestions
    const suggestions = {
      basedOnHistory: history.slice(0, 5).map(item => ({
        name: item.item_name,
        reason: `You buy this frequently (${item.frequency} times)`,
        category: item.category,
        avgPrice: item.avg_price
      })),
      seasonal: seasonalItems.map(item => ({
        name: item,
        reason: 'Currently in season',
        category: 'Seasonal'
      })),
      categorySpecific: categorySuggestions,
      substitutes: getSubstituteSuggestions(history)
    };

    return suggestions;

  } catch (error) {
    console.error('Error getting smart suggestions:', error);
    return getFallbackSuggestions(category);
  }
};

// Get category-specific suggestions
const getCategorySuggestions = (category, history) => {
  const categoryItems = fallbackSuggestions[category.toLowerCase()] || [];
  
  // Filter history by category
  const categoryHistory = history.filter(item => 
    item.category && item.category.toLowerCase() === category.toLowerCase()
  );

  // Combine fallback and history-based suggestions
  const suggestions = [...categoryItems];
  
  categoryHistory.forEach(item => {
    if (!suggestions.find(s => s.name.toLowerCase() === item.item_name.toLowerCase())) {
      suggestions.push({
        name: item.item_name,
        reason: `Based on your ${category} shopping history`,
        category: item.category
      });
    }
  });

  return suggestions;
};

// Get general suggestions when no category is specified
const getGeneralSuggestions = (history) => {
    const allSuggestions = Object.values(fallbackSuggestions).flat();
    const generalSuggestions = [];
    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * allSuggestions.length);
        generalSuggestions.push(allSuggestions[randomIndex]);
        allSuggestions.splice(randomIndex, 1);
    }

  // Add history-based suggestions
  if (history.length > 0) {
    const historySuggestions = history.slice(0, 3).map(item => ({
      name: item.item_name,
      category: item.category,
      reason: `You buy this frequently (${item.frequency} times)`
    }));
    generalSuggestions.unshift(...historySuggestions);
  }

  return generalSuggestions;
};

// Get substitute suggestions
const getSubstituteSuggestions = (history) => {
  const substitutes = [];
  
  // Check for items that might need substitutes
  const itemsNeedingSubstitutes = history.filter(item => 
    item.item_name.toLowerCase().includes('milk') ||
    item.item_name.toLowerCase().includes('bread') ||
    item.item_name.toLowerCase().includes('meat') ||
    item.item_name.toLowerCase().includes('sugar') ||
    item.item_name.toLowerCase().includes('flour') ||
    item.item_name.toLowerCase().includes('butter')
  );

  itemsNeedingSubstitutes.forEach(item => {
    if (item.item_name.toLowerCase().includes('milk')) {
      substitutes.push({
        original: item.item_name,
        alternatives: ['Almond milk', 'Soy milk', 'Oat milk'],
        reason: 'Dairy alternatives for lactose intolerance or preference'
      });
    }
    
    if (item.item_name.toLowerCase().includes('bread')) {
      substitutes.push({
        original: item.item_name,
        alternatives: ['Gluten-free bread', 'Whole grain bread', 'Tortillas'],
        reason: 'Alternative bread options'
      });
    }

    if (item.item_name.toLowerCase().includes('sugar')) {
        substitutes.push({
            original: item.item_name,
            alternatives: ['Honey', 'Maple syrup', 'Stevia'],
            reason: 'Natural sweetener alternatives'
        });
    }

    if (item.item_name.toLowerCase().includes('flour')) {
        substitutes.push({
            original: item.item_name,
            alternatives: ['Whole wheat flour', 'Almond flour', 'Coconut flour'],
            reason: 'Different types of flour for baking'
        });
    }

    if (item.item_name.toLowerCase().includes('butter')) {
        substitutes.push({
            original: item.item_name,
            alternatives: ['Margarine', 'Ghee', 'Avocado oil'],
            reason: 'Alternatives for cooking and baking'
        });
    }
  });

  return substitutes;
};

// Get fallback suggestions when database is not available
const getFallbackSuggestions = (category = null) => {
  if (category && fallbackSuggestions[category.toLowerCase()]) {
    return fallbackSuggestions[category.toLowerCase()];
  }

  return {
    basedOnHistory: [
      { name: 'Milk', category: 'Dairy', reason: 'You buy this weekly' },
      { name: 'Bread', category: 'Bakery', reason: 'Frequently purchased item' },
      { name: 'Bananas', category: 'Produce', reason: 'Your favorite fruit' },
      { name: 'Eggs', category: 'Dairy', reason: 'Regular breakfast item' },
      { name: 'Chicken Breast', category: 'Meat', reason: 'Weekly protein source' }
    ],
    seasonal: [
      { name: 'Pumpkin Spice', category: 'Pantry', reason: 'Perfect for fall recipes' },
      { name: 'Fresh Herbs', category: 'Produce', reason: 'Great for seasonal cooking' },
      { name: 'Citrus Fruits', category: 'Produce', reason: 'Winter vitamin boost' },
      { name: 'Hot Chocolate', category: 'Beverages', reason: 'Warm winter drink' },
      { name: 'Root Vegetables', category: 'Produce', reason: 'Seasonal comfort food' }
    ],
    substitutes: [
      {
        original: 'Milk',
        reason: 'Lactose intolerant or vegan alternatives',
        alternatives: ['Almond Milk', 'Soy Milk', 'Oat Milk', 'Coconut Milk']
      },
      {
        original: 'Butter',
        reason: 'Healthier alternatives',
        alternatives: ['Olive Oil', 'Coconut Oil', 'Avocado', 'Greek Yogurt']
      },
      {
        original: 'White Rice',
        reason: 'More nutritious alternatives',
        alternatives: ['Brown Rice', 'Quinoa', 'Cauliflower Rice', 'Wild Rice']
      }
    ]
  };
};

// Get seasonal recommendations
const getSeasonalRecommendations = () => {
  const currentMonth = new Date().getMonth();
  const seasonalItems = {
    0: ['Citrus fruits', 'Winter vegetables', 'Hot chocolate'], // January
    1: ['Valentine chocolates', 'Winter produce'], // February
    2: ['Spring vegetables', 'Easter candy', 'Fresh herbs'], // March
    3: ['Spring produce', 'Easter ham', 'Fresh flowers'], // April
    4: ['Strawberries', 'Spring vegetables', 'Grilling items'], // May
    5: ['Summer fruits', 'Grilling meat', 'Ice cream'], // June
    6: ['Summer produce', 'BBQ items', 'Cold drinks'], // July
    7: ['Back to school items', 'Summer fruits', 'Grilling'], // August
    8: ['Fall vegetables', 'Pumpkin items', 'Apple cider'], // September
    9: ['Halloween candy', 'Pumpkin spice', 'Fall produce'], // October
    10: ['Thanksgiving items', 'Fall vegetables', 'Warm drinks'], // November
    11: ['Christmas items', 'Winter produce', 'Holiday treats'] // December
  };

  return seasonalItems[currentMonth] || [];
};

// Get product recommendations (if OpenAI is available)
const getRecommendations = async (userQuery, shoppingHistory) => {
  if (!openai || !process.env.OPENAI_API_KEY) {
    return getFallbackSuggestions();
  }

  try {
    const prompt = `Based on this shopping history: ${JSON.stringify(shoppingHistory.slice(0, 10))}
    
    User query: ${userQuery}
    
    Please suggest 5 relevant shopping items with reasons why they might be useful. 
    Format as JSON array with objects containing: name, reason, category, estimatedPrice.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful shopping assistant. Provide relevant, practical shopping suggestions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;
    
    try {
      return JSON.parse(response);
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      return getFallbackSuggestions();
    }

  } catch (error) {
    console.error('Error getting recommendations:', error);
    return getFallbackSuggestions();
  }
};

// Get price-based suggestions
const getPriceBasedSuggestions = (budget, category = null) => {
  const suggestions = [];
  
  if (budget < 20) {
    suggestions.push(
      { name: 'Rice', reason: 'Affordable staple', category: 'Pantry', estimatedPrice: 2.99 },
      { name: 'Pasta', reason: 'Budget-friendly meal base', category: 'Pantry', estimatedPrice: 1.99 },
      { name: 'Bananas', reason: 'Nutritious and cheap', category: 'Produce', estimatedPrice: 0.59 },
      { name: 'Eggs', reason: 'Affordable protein', category: 'Dairy', estimatedPrice: 3.99 }
    );
  } else if (budget < 50) {
    suggestions.push(
      { name: 'Chicken breast', reason: 'Good protein value', category: 'Meat', estimatedPrice: 8.99 },
      { name: 'Mixed vegetables', reason: 'Nutritious variety', category: 'Frozen', estimatedPrice: 2.99 },
      { name: 'Greek yogurt', reason: 'Protein-rich dairy', category: 'Dairy', estimatedPrice: 4.99 }
    );
  }

  return suggestions.filter(s => !category || s.category.toLowerCase() === category.toLowerCase());
};

module.exports = {
  getSmartSuggestions,
  getRecommendations,
  getSeasonalRecommendations,
  getPriceBasedSuggestions,
  getCategorySuggestions,
  getSubstituteSuggestions
};

