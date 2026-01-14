const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Middleware to verify JWTs on protected endpoints
function verifyJwt(req, res, next) {
  // Allow unauthenticated access to /api/auth/* (registration/login)
  if (
  req.path.startsWith("/api/auth") ||
  req.path.startsWith("/api/notifications/socket.io")
) {
    return next();
}


  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Attach user info to request and forward user ID downstream
    req.user = decoded;
    req.headers['x-user-id'] = decoded.userId;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

const analyticsProxy = createProxyMiddleware({
  target: process.env.ANALYTICS_SERVICE_URL || "http://localhost:3004",
  changeOrigin: true,
});


// Proxy for the Auth service
const authProxy = createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' },
});


// Proxy for the Task service
const taskProxy = createProxyMiddleware({
  target: process.env.TASK_SERVICE_URL || 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: (path) => {
    // Because we mounted at /api/tasks, the proxy only sees:
    //   "/" or "/<id>"
    // We need to map:
    //   "/"      -> "/tasks"
    //   "/123"   -> "/tasks/123"
    if (path === "/" || path === "") return "/tasks";
    return "/tasks" + path;
  },
});



const notificationProxy = createProxyMiddleware({
  target: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3003",
  changeOrigin: true,
  ws: true,
  pathRewrite: {
    "^/api/notifications": "",
  },
});




// Route definitions
// Auth routes go first — no token check
app.use('/api/auth', authProxy);

// JWT check for all other routes
app.use(verifyJwt);

app.use("/api/notifications", notificationProxy);

app.use("/api/analytics", analyticsProxy);

// Then proxy the other services
app.use('/api/tasks', taskProxy);


app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});
