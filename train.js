const { NlpManager } = require('node-nlp');

const manager = new NlpManager({ languages: ['en'] });

// Adds the utterances and intents for the NLP
manager.addDocument('en', 'add %item% to my shopping list', 'shopping.add_item');
manager.addDocument('en', 'I want to buy %item%', 'shopping.add_item');
manager.addDocument('en', 'I like %item%', 'shopping.add_item_like');
manager.addDocument('en', 'remove %item% from my shopping list', 'shopping.remove_item');
manager.addDocument('en', 'delete %item%', 'shopping.remove_item');
manager.addDocument('en', 'remove that item', 'shopping.remove_item');

// Train the model
(async () => {
    await manager.train();
    
})();