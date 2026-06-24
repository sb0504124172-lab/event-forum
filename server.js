require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// מסד נתונים
const db = new Database('forum.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT DEFAULT 'כללי',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS replies (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// הכנסת נתוני דמו
const count = db.prepare('SELECT COUNT(*) as c FROM posts').get();
if (count.c === 0) {
  db.prepare('INSERT INTO posts (id,title,content,author,category) VALUES (?,?,?,?,?)')
    .run('1','ברוכים הבאים!','זהו הפורום המקצועי שלנו.','מנהל','כללי');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API
app.get('/api/posts', (req, res) => {
  const posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
  const result = posts.map(p => ({
    ...p,
    replies_count: db.prepare('SELECT COUNT(*) as c FROM replies WHERE post_id=?').get(p.id).c
  }));
  res.json(result);
});

app.post('/api/posts', (req, res) => {
  const { title, content, author, category } = req.body;
  if (!title || !content || !author) return res.status(400).json({ error: 'חסרים שדות' });
  const id = uuidv4();
  db.prepare('INSERT INTO posts (id,title,content,author,category) VALUES (?,?,?,?,?)')
    .run(id, title, content, author, category || 'כללי');
  res.status(201).json(db.prepare('SELECT * FROM posts WHERE id=?').get(id));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`✅ שרת פועל על פורט ${PORT}`));