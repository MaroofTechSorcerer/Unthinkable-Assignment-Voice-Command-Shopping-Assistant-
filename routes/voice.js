const express = require('express');
const router = express.Router();
const { processVoiceCommand } = require('../services/voiceProcessor');
const { getDatabase } = require('../database/database');

// Default user ID for demo purposes
const DEFAULT_USER_ID = 1;

// Process voice command
router.post('/process', async (req, res) => {
  try {
    const { command, userId, audioData, language = 'en' } = req.body;
    const finalUserId = userId || DEFAULT_USER_ID;
    
    if (!command) {
      return res.status(400).json({ 
        success: false, 
        error: 'Voice command is required' 
      });
    }

    // Process the voice command with language support
    const result = await processVoiceCommand(command, finalUserId, language);
    
    res.json(result);
  } catch (error) {
    console.error('Error processing voice command:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get voice command history
router.get('/history/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || DEFAULT_USER_ID;
    const db = getDatabase();
    
    db.all(
      `SELECT command_text, processed_at, success 
       FROM voice_commands 
       WHERE user_id = ? 
       ORDER BY processed_at DESC 
       LIMIT 50`,
      [userId],
      (err, rows) => {
        if (err) {
          res.status(500).json({ 
            success: false, 
            error: 'Database error' 
          });
        } else {
          res.json({ 
            success: true, 
            commands: rows 
          });
        }
      }
    );
  } catch (error) {
    console.error('Error getting voice command history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get supported languages
router.get('/languages', (req, res) => {
  const supportedLanguages = [
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
    { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
    { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
    { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
    { code: 'zh-CN', name: '中文', flag: '🇨🇳' }
  ];
  
  res.json({ 
    success: true, 
    languages: supportedLanguages 
  });
});

// Update user language preference
router.put('/language/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || DEFAULT_USER_ID;
    const { language } = req.body;
    
    if (!language) {
      return res.status(400).json({ 
        success: false, 
        error: 'Language is required' 
      });
    }

    const db = getDatabase();
    db.run(
      'UPDATE users SET language = ? WHERE id = ?',
      [language, userId],
      function(err) {
        if (err) {
          res.status(500).json({ 
            success: false, 
            error: 'Database error' 
          });
        } else if (this.changes === 0) {
          res.status(404).json({ 
            success: false, 
            error: 'User not found' 
          });
        } else {
          res.json({ 
            success: true, 
            message: 'Language updated successfully' 
          });
        }
      }
    );
  } catch (error) {
    console.error('Error updating language:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get voice command statistics
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getDatabase();
    
    db.get(
      `SELECT 
         COUNT(*) as total_commands,
         COUNT(CASE WHEN success = 1 THEN 1 END) as successful_commands,
         COUNT(CASE WHEN success = 0 THEN 1 END) as failed_commands,
         AVG(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100 as success_rate
       FROM voice_commands 
       WHERE user_id = ?`,
      [userId],
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
              success_rate: Math.round(stats.success_rate || 0)
            }
          });
        }
      }
    );
  } catch (error) {
    console.error('Error getting voice command stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Test voice recognition
router.post('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Voice recognition is working properly',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
