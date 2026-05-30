const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'expense-tracker.db');

async function updateCurrency() {
  try {
    const SQL = await initSqlJs();
    
    // Load existing database
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      const db = new SQL.Database(fileBuffer);
      
      // Check current users
      const checkStmt = db.prepare('SELECT id, email, preferred_currency FROM users');
      console.log('Current users:');
      while (checkStmt.step()) {
        const user = checkStmt.getAsObject();
        console.log(`- ${user.email}: ${user.preferred_currency}`);
      }
      checkStmt.free();
      
      // Update all users with USD to INR
      const stmt = db.prepare('UPDATE users SET preferred_currency = ? WHERE preferred_currency = ?');
      stmt.bind(['INR', 'USD']);
      const changes = stmt.step();
      stmt.free();
      
      // Save database
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
      
      console.log(`Updated ${changes} users to INR`);
      
      // Verify update
      const verifyStmt = db.prepare('SELECT id, email, preferred_currency FROM users');
      console.log('Users after update:');
      while (verifyStmt.step()) {
        const user = verifyStmt.getAsObject();
        console.log(`- ${user.email}: ${user.preferred_currency}`);
      }
      verifyStmt.free();
    } else {
      console.log('Database file not found at:', dbPath);
    }
  } catch (error) {
    console.error('Error updating currency:', error);
  }
}

updateCurrency();
