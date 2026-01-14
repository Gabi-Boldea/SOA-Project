const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());

// Simple in-memory user store; you can swap this for a DB later
const users = [];
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// POST /register
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const existing = users.find(u => u.email === email);
  if (existing) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);
  users.push({ id: users.length + 1, email, passwordHash: hashed });
  res.status(201).json({ message: 'User registered' });
});

// POST /login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token });
});

// GET /me
app.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json({ userId: user.id, email: user.email });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Start the service
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Auth service listening on port ${port}`);
});
