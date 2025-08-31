const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'shopping_assistant.db');
let db;

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    // Create database directory if it doesn't exist
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
      } else {
        console.log('Connected to SQLite database');
        createTables()
          .then(() => resolve())
          .catch(reject);
      }
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        language TEXT DEFAULT 'en-US',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Shopping lists table
      `CREATE TABLE IF NOT EXISTS shopping_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // Shopping items table
      `CREATE TABLE IF NOT EXISTS shopping_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER,
        name TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit TEXT,
        category TEXT,
        price REAL,
        brand TEXT,
        notes TEXT,
        is_completed BOOLEAN DEFAULT 0,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES shopping_lists (id)
      )`,
      
      // Shopping history table
      `CREATE TABLE IF NOT EXISTS shopping_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        item_name TEXT NOT NULL,
        quantity INTEGER,
        unit TEXT,
        category TEXT,
        price REAL,
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // Voice commands table
      `CREATE TABLE IF NOT EXISTS voice_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        command_text TEXT NOT NULL,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#007bff'
      )`
    ];

    let completedTables = 0;
    const totalTables = tables.length;

    const checkCompletion = () => {
      completedTables++;
      if (completedTables === totalTables) {
        // All tables created, now insert default categories
        insertDefaultCategories()
          .then(() => {
            console.log('Database tables created successfully');
            resolve();
          })
          .catch(reject);
      }
    };

    // Create all tables
    tables.forEach(tableSQL => {
      db.run(tableSQL, (err) => {
        if (err) {
          console.error('Error creating table:', err.message);
          reject(err);
        } else {
          checkCompletion();
        }
      });
    });
  });
};

const insertDefaultCategories = () => {
  return new Promise((resolve, reject) => {
    const defaultCategories = [
      'Dairy', 'Produce', 'Meat', 'Bakery', 'Pantry', 'Frozen',
      'Beverages', 'Snacks', 'Household', 'Personal Care'
    ];

    let completedInserts = 0;
    const totalInserts = defaultCategories.length;

    const checkInserts = () => {
      completedInserts++;
      if (completedInserts === totalInserts) {
        console.log('Default categories inserted successfully');
        // After categories are inserted, create default user and shopping list
        createDefaultUserAndList()
          .then(() => resolve())
          .catch(reject);
      }
    };

    defaultCategories.forEach(category => {
      db.run(`INSERT OR IGNORE INTO categories (name) VALUES (?)`, [category], (err) => {
        if (err) {
          console.error('Error inserting category:', err.message);
          reject(err);
        } else {
          checkInserts();
        }
      });
    });
  });
};

const createDefaultUserAndList = () => {
  return new Promise((resolve, reject) => {
    // Create default user (ID 1)
    db.run(`INSERT OR IGNORE INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)`, 
      [1, 'demo_user', 'demo@example.com', 'demo_hash'], (err) => {
        if (err) {
          console.error('Error creating default user:', err.message);
          reject(err);
        } else {
          // Create default shopping list
          db.run(`INSERT OR IGNORE INTO shopping_lists (id, user_id, name) VALUES (?, ?, ?)`,
            [1, 1, 'My Shopping List'], (err) => {
              if (err) {
                console.error('Error creating default shopping list:', err.message);
                reject(err);
              } else {
                console.log('Default user and shopping list created successfully');
                resolve();
              }
            });
        }
      });
  });
};

const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

const closeDatabase = () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
};

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};
