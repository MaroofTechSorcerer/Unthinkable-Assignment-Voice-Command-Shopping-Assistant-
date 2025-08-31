const { NlpManager } = require('node-nlp');
const { getDatabase } = require('../database/database');

// Initialize NLP with better multilingual support
const manager = new NlpManager({ 
  languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'],
  forceNER: true,
  modelFileName: './voice-model.nlp'
});

// Train the NLP model with comprehensive shopping-related intents
const trainNLP = async () => {
  // English training data
  const englishTraining = [
    // Add items intent - multiple variations
    { text: 'add milk', intent: 'shopping.add_item', language: 'en' },
    { text: 'add apples to my list', intent: 'shopping.add_item', language: 'en' },
    { text: 'I need bananas', intent: 'shopping.add_item', language: 'en' },
    { text: 'buy bread', intent: 'shopping.add_item', language: 'en' },
    { text: 'add 2 bottles of water', intent: 'shopping.add_item', language: 'en' },
    { text: 'I want to buy 5 oranges', intent: 'shopping.add_item', language: 'en' },
    { text: 'add organic milk', intent: 'shopping.add_item', language: 'en' },
    { text: 'need toothpaste', intent: 'shopping.add_item', language: 'en' },
    { text: 'add milk and bread', intent: 'shopping.add_item', language: 'en' },
    { text: 'I need apples, bananas, and oranges', intent: 'shopping.add_item', language: 'en' },
    { text: 'buy milk, bread, eggs', intent: 'shopping.add_item', language: 'en' },
    { text: 'add rice, beans, and tomatoes', intent: 'shopping.add_item', language: 'en' },
    
    // Remove items intent
    { text: 'remove milk from my list', intent: 'shopping.remove_item', language: 'en' },
    { text: 'delete apples', intent: 'shopping.remove_item', language: 'en' },
    { text: 'take off bread', intent: 'shopping.remove_item', language: 'en' },
    { text: 'remove that item', intent: 'shopping.remove_item', language: 'en' },
    
    // Search items intent
    { text: 'find me organic apples', intent: 'shopping.search_item', language: 'en' },
    { text: 'search for toothpaste under $5', intent: 'shopping.search_item', language: 'en' },
    { text: 'find cheap bread', intent: 'shopping.search_item', language: 'en' },
    { text: 'show me dairy products', intent: 'shopping.search_item', language: 'en' },
    
    // List management intent
    { text: 'show my shopping list', intent: 'shopping.show_list', language: 'en' },
    { text: 'what\'s on my list', intent: 'shopping.show_list', language: 'en' },
    { text: 'clear my list', intent: 'shopping.clear_list', language: 'en' },
    { text: 'remove everything', intent: 'shopping.clear_list', language: 'en' },
    { text: 'remove all', intent: 'shopping.clear_list', language: 'en' },
    { text: 'new shopping list', intent: 'shopping.new_list', language: 'en' },
    
    // Quantity management intent
    { text: 'change quantity to 3', intent: 'shopping.update_quantity', language: 'en' },
    { text: 'make it 2 bottles', intent: 'shopping.update_quantity', language: 'en' },
    { text: 'update quantity', intent: 'shopping.update_quantity', language: 'en' },
    
    // Category management intent
    { text: 'show dairy items', intent: 'shopping.filter_category', language: 'en' },
    { text: 'filter by produce', intent: 'shopping.filter_category', language: 'en' },
    { text: 'only show snacks', intent: 'shopping.filter_category', language: 'en' }
  ];

  // Spanish training data
  const spanishTraining = [
    { text: 'agregar leche', intent: 'shopping.add_item', language: 'es' },
    { text: 'añadir manzanas', intent: 'shopping.add_item', language: 'es' },
    { text: 'comprar pan', intent: 'shopping.add_item', language: 'es' },
    { text: 'necesito bananas', intent: 'shopping.add_item', language: 'es' },
    { text: 'agregar leche y pan', intent: 'shopping.add_item', language: 'es' },
    { text: 'comprar arroz, frijoles y tomates', intent: 'shopping.add_item', language: 'es' }
  ];

  // French training data
  const frenchTraining = [
    { text: 'ajouter du lait', intent: 'shopping.add_item', language: 'fr' },
    { text: 'acheter du pain', intent: 'shopping.add_item', language: 'fr' },
    { text: 'j\'ai besoin de bananes', intent: 'shopping.add_item', language: 'fr' },
    { text: 'ajouter du lait et du pain', intent: 'shopping.add_item', language: 'fr' }
  ];

  // German training data
  const germanTraining = [
    { text: 'milch hinzufügen', intent: 'shopping.add_item', language: 'de' },
    { text: 'brot kaufen', intent: 'shopping.add_item', language: 'de' },
    { text: 'ich brauche bananen', intent: 'shopping.add_item', language: 'de' },
    { text: 'milch und brot hinzufügen', intent: 'shopping.add_item', language: 'de' }
  ];

  // Add all training data
  [...englishTraining, ...spanishTraining, ...frenchTraining, ...germanTraining].forEach(item => {
    manager.addDocument(item.language, item.text, item.intent);
  });

  // Add responses in multiple languages
  const responses = [
    { language: 'en', intent: 'shopping.add_item', response: 'I\'ve added {{items}} to your shopping list.' },
    { language: 'en', intent: 'shopping.remove_item', response: 'I\'ve removed {{items}} from your shopping list.' },
    { language: 'en', intent: 'shopping.search_item', response: 'Here are the results for {{query}}.' },
    { language: 'en', intent: 'shopping.show_list', response: 'Here\'s your current shopping list.' },
    { language: 'en', intent: 'shopping.clear_list', response: 'I\'ve cleared your shopping list.' },
    { language: 'en', intent: 'shopping.new_list', response: 'I\'ve created a new shopping list for you.' },
    
    { language: 'es', intent: 'shopping.add_item', response: 'He agregado {{items}} a tu lista de compras.' },
    { language: 'es', intent: 'shopping.remove_item', response: 'He eliminado {{items}} de tu lista de compras.' },
    { language: 'es', intent: 'shopping.show_list', response: 'Aquí está tu lista de compras actual.' },
    
    { language: 'fr', intent: 'shopping.add_item', response: 'J\'ai ajouté {{items}} à votre liste de courses.' },
    { language: 'fr', intent: 'shopping.remove_item', response: 'J\'ai supprimé {{items}} de votre liste de courses.' },
    { language: 'fr', intent: 'shopping.show_list', response: 'Voici votre liste de courses actuelle.' },
    
    { language: 'de', intent: 'shopping.add_item', response: 'Ich habe {{items}} zu Ihrer Einkaufsliste hinzugefügt.' },
    { language: 'de', intent: 'shopping.remove_item', response: 'Ich habe {{items}} von Ihrer Einkaufsliste entfernt.' },
    { language: 'de', intent: 'shopping.show_list', response: 'Hier ist Ihre aktuelle Einkaufsliste.' }
  ];

  responses.forEach(item => {
    manager.addAnswer(item.language, item.intent, item.response);
  });

  // Train the model
  await manager.train();
  console.log('NLP model trained successfully');
};

// Initialize NLP training
trainNLP();

// Enhanced function to extract items from voice commands with better natural language processing
const extractItemsFromCommand = (command, language = 'en') => {
  const items = [];
  let cleanCommand = command.toLowerCase().trim();
  
  // Remove common phrases that indicate actions (longer phrases first to avoid partial matches)
  const phrasesToRemove = [
    'i like', 'i want', 'i need', 'i would like', 'i should get',
    'can you add', 'could you add', 'please add',
    'can you remove', 'could you remove', 'please remove',
    'can you find', 'could you find', 'please find',
    'i don\'t want', 'i don\'t need',
    'get rid of', 'throw away', 'pick up', 'look for', 'search for',
    'add to list', 'put on list', 'remember to buy'
  ];

  // Remove phrases
  phrasesToRemove.forEach(phrase => {
    cleanCommand = cleanCommand.replace(new RegExp(`\\b${phrase}\\b`, 'gi'), ' ');
  });

  // Remove single action words
  const actionWords = [
    'add', 'buy', 'get', 'need', 'want', 'like', 'put', 'include',
    'remember', 'forget', 'grab', 'fetch', 'purchase',
    'remove', 'delete', 'cancel', 'drop', 'skip', 'exclude',
    'find', 'search', 'locate', 'show', 'display', 'check',
    'please', 'thanks', 'thank'
  ];

  actionWords.forEach(word => {
    cleanCommand = cleanCommand.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
  });

  // Remove common stop words but keep potential item names
  const stopWords = [
    'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your',
    'the', 'a', 'an', 'and', 'or', 'but', 'for', 'of', 'to', 'from', 'at', 'by', 'with',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
    'will', 'would', 'should', 'could', 'might', 'may',
    'not', 'no', 'don\'t', 'doesn\'t', 'didn\'t',
    'that', 'this', 'these', 'those', 'some', 'any',
    'there', 'here', 'where', 'when', 'how', 'why', 'what', 'which', 'who', 'whom', 'whose'
  ];

  stopWords.forEach(word => {
    cleanCommand = cleanCommand.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
  });

  // Clean up punctuation and extra spaces
  cleanCommand = cleanCommand
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If nothing left, return empty
  if (!cleanCommand) {
    return items;
  }

  // Split by common separators for multiple items
  const separators = [',', ' and ', '&', ' plus ', '+'];
  let itemParts = [cleanCommand];
  
  separators.forEach(separator => {
    const newParts = [];
    itemParts.forEach(part => {
      if (part.includes(separator)) {
        newParts.push(...part.split(separator).map(p => p.trim()));
      } else {
        newParts.push(part);
      }
    });
    itemParts = newParts;
  });

  // Process each item part
  itemParts.forEach(part => {
    if (part && part.trim().length > 0) {
      const itemInfo = extractItemDetails(part.trim(), language);
      if (itemInfo.name && itemInfo.name.length > 0) {
        items.push(itemInfo);
      }
    }
  });

  return items;
};

// Enhanced function to extract detailed item information
const extractItemDetails = (itemText, language = 'en') => {
  const itemInfo = {
    name: '',
    quantity: 1,
    unit: '',
    category: '',
    organic: false,
    brand: '',
    priceRange: null,
    notes: ''
  };

  const lowerText = itemText.toLowerCase().trim();
  
  // Extract quantity and unit
  const quantityMatch = lowerText.match(/(\d+)\s*(bottles?|cans?|packs?|pieces?|items?|units?|lbs?|pounds?|kg|kilograms?|g|grams?|oz|ounces?|liters?|ml|milliliters?|dozen|pair|sets?)/);
  if (quantityMatch) {
    itemInfo.quantity = parseInt(quantityMatch[1]);
    itemInfo.unit = quantityMatch[2];
  } else {
    // Check for just numbers
    const justNumber = lowerText.match(/^(\d+)/);
    if (justNumber) {
      itemInfo.quantity = parseInt(justNumber[1]);
    }
  }

  // Extract organic indicator
  if (lowerText.includes('organic')) {
    itemInfo.organic = true;
  }

  // Extract price range
  const priceMatch = lowerText.match(/under\s*\$?(\d+)/);
  if (priceMatch) {
    itemInfo.priceRange = parseFloat(priceMatch[1]);
  }

  // Extract brand (common brands)
  const brands = ['nike', 'adidas', 'coca-cola', 'pepsi', 'kraft', 'nestle', 'unilever', 'apple', 'samsung', 'sony', 'lg', 'hp', 'dell', 'lenovo'];
  brands.forEach(brand => {
    if (lowerText.includes(brand)) {
      itemInfo.brand = brand;
    }
  });

  // Extract category based on keywords
  const categoryKeywords = {
    'dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'leche', 'queso', 'lait', 'fromage', 'milch', 'käse'],
    'produce': ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'carrot', 'manzana', 'banana', 'naranja', 'pomme', 'banane', 'orange', 'apfel', 'banane', 'orange'],
    'meat': ['chicken', 'beef', 'pork', 'fish', 'lamb', 'pollo', 'res', 'cerdo', 'poulet', 'boeuf', 'porc', 'huhn', 'rind', 'schwein'],
    'bakery': ['bread', 'cake', 'cookie', 'pastry', 'muffin', 'pan', 'pastel', 'galleta', 'pain', 'gâteau', 'brot', 'kuchen'],
    'pantry': ['rice', 'pasta', 'flour', 'sugar', 'oil', 'arroz', 'pasta', 'harina', 'riz', 'pâtes', 'farine', 'reis', 'nudeln', 'mehl'],
    'frozen': ['ice cream', 'frozen pizza', 'frozen vegetables', 'helado', 'pizza congelada', 'crème glacée', 'pizza surgelée', 'eis', 'gefrorene pizza'],
    'beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'agua', 'jugo', 'eau', 'jus', 'wasser', 'saft'],
    'snacks': ['chips', 'crackers', 'nuts', 'candy', 'papas', 'galletas', 'nueces', 'chips', 'crackers', 'noix', 'bonbons'],
    'household': ['soap', 'detergent', 'paper towel', 'toilet paper', 'jabón', 'detergente', 'toallas', 'savon', 'détergent', 'serviettes', 'seife', 'waschmittel', 'handtücher'],
    'personal care': ['toothpaste', 'shampoo', 'deodorant', 'lotion', 'pasta dental', 'champú', 'desodorante', 'dentifrice', 'shampooing', 'déodorant', 'zahnpasta', 'shampoo', 'deo'],
    'electronics': ['laptop', 'computer', 'phone', 'tablet', 'tv', 'television', 'headphones', 'earbuds', 'charger', 'cable', 'wire', 'battery']
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      itemInfo.category = category;
      break;
    }
  }

  // Clean up the item name by removing extracted information
  let cleanName = itemText;
  
  // Remove quantity and unit
  if (quantityMatch) {
    cleanName = cleanName.replace(quantityMatch[0], '');
  }
  
  // Remove other extracted information
  if (itemInfo.organic) {
    cleanName = cleanName.replace(/\borganic\b/gi, '');
  }
  if (itemInfo.brand) {
    cleanName = cleanName.replace(new RegExp(itemInfo.brand, 'gi'), '');
  }
  if (itemInfo.priceRange) {
    cleanName = cleanName.replace(/under\s*\$?\d+/gi, '');
  }

  // Remove articles from the beginning of the item name
  cleanName = cleanName.trim().replace(/^(a|an|the)\s+/i, '');

  // Clean up the item name
  itemInfo.name = cleanName.trim().replace(/\s+/g, ' ');

  return itemInfo;
};

// Process voice command with improved NLP and multilingual support
const processVoiceCommand = async (command, userId = null, language = 'en') => {
  try {
    // Process with NLP in the specified language
    const result = await manager.process(language, command);
    
    // Extract multiple items from the command
    const items = extractItemsFromCommand(command, language);
    
    // Log the command
    if (userId) {
      const db = getDatabase();
      db.run(
        'INSERT INTO voice_commands (user_id, command_text) VALUES (?, ?)',
        [userId, command]
      );
    }

    // Determine action based on intent
    let action = 'unknown';
    let response = 'I didn\'t understand that command. Please try again.';
    let itemInfo = {};

    if (result.intent) {
      action = result.intent;
      
      switch (result.intent) {
        case 'shopping.add_item':
          if (items.length > 0) {
            const itemNames = items.map(item => item.name).join(', ');
            response = `I've added ${itemNames} to your shopping list.`;
            itemInfo = { items, action: 'add_multiple' };
          } else {
            response = 'I couldn\'t identify any items to add. Please try again.';
          }
          break;
        case 'shopping.remove_item':
          if (items.length > 0) {
            const itemNames = items.map(item => item.name).join(', ');
            response = `I've removed ${itemNames} from your shopping list.`;
            itemInfo = { items, action: 'remove_multiple' };
          } else {
            response = 'I couldn\'t identify any items to remove. Please try again.';
          }
          break;
        case 'shopping.search_item':
          if (items.length > 0) {
            const itemNames = items.map(item => item.name).join(', ');
            response = `Here are the results for ${itemNames}.`;
            itemInfo = { items, action: 'search' };
          } else {
            response = 'I couldn\'t identify what to search for. Please try again.';
          }
          break;
        case 'shopping.show_list':
          response = 'Here\'s your current shopping list.';
          itemInfo = { action: 'show_list' };
          break;
        case 'shopping.clear_list':
          response = 'I\'ve cleared your shopping list.';
          itemInfo = { action: 'clear_list' };
          break;
        case 'shopping.new_list':
          response = 'I\'ve created a new shopping list for you.';
          itemInfo = { action: 'new_list' };
          break;
        case 'shopping.update_quantity':
          if (items.length > 0) {
            response = `I've updated the quantity to ${items[0].quantity}.`;
            itemInfo = { items: [items[0]], action: 'update_quantity' };
          } else {
            response = 'I couldn\'t identify the item to update. Please try again.';
          }
          break;
        case 'shopping.filter_category':
          if (items.length > 0 && items[0].category) {
            response = `Here are the items in the ${items[0].category} category.`;
            itemInfo = { items: [items[0]], action: 'filter_category' };
          } else {
            response = 'I couldn\'t identify the category to filter by. Please try again.';
          }
          break;
        default:
          response = 'I\'m not sure how to help with that.';
      }
    }

    return {
      success: true,
      action,
      itemInfo,
      response,
      confidence: result.score || 0,
      intent: result.intent,
      items: items,
      language: language
    };

  } catch (error) {
    console.error('Error processing voice command:', error);
    return {
      success: false,
      error: error.message,
      response: 'Sorry, I encountered an error processing your command.'
    };
  }
};

// Get shopping suggestions based on history
const getShoppingSuggestions = async (userId) => {
  try {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT item_name, COUNT(*) as frequency, AVG(price) as avg_price, category
         FROM shopping_history 
         WHERE user_id = ? 
         GROUP BY item_name 
         ORDER BY frequency DESC 
         LIMIT 10`,
        [userId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error getting shopping suggestions:', error);
    return [];
  }
};

// Get seasonal recommendations
const getSeasonalRecommendations = () => {
  const currentMonth = new Date().getMonth();
  const seasonalItems = {
    0: ['citrus fruits', 'winter vegetables', 'hot chocolate'], // January
    1: ['valentine chocolates', 'winter produce'], // February
    2: ['spring vegetables', 'easter candy', 'fresh herbs'], // March
    3: ['spring produce', 'easter ham', 'fresh flowers'], // April
    4: ['strawberries', 'spring vegetables', 'grilling items'], // May
    5: ['summer fruits', 'grilling meat', 'ice cream'], // June
    6: ['summer produce', 'bbq items', 'cold drinks'], // July
    7: ['back to school items', 'summer fruits', 'grilling'], // August
    8: ['fall vegetables', 'pumpkin items', 'apple cider'], // September
    9: ['halloween candy', 'pumpkin spice', 'fall produce'], // October
    10: ['thanksgiving items', 'fall vegetables', 'warm drinks'], // November
    11: ['christmas items', 'winter produce', 'holiday treats'] // December
  };

  return seasonalItems[currentMonth] || [];
};

module.exports = {
  processVoiceCommand,
  getShoppingSuggestions,
  getSeasonalRecommendations,
  extractItemsFromCommand
};
