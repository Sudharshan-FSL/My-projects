'use strict';

const express  = require('express');
const path     = require('path');
const reportRouter = require('./routes/report');

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MACHINE_NAME = process.env.COMPUTERNAME || 'localhost';

// ── Health check for deployment / monitoring ────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'claims-report' });
});

// ── Windows Authentication (NTLM / Kerberos via node-sspi) ──────────────────
let nodeSSPI = null;
try {
  const NodeSSPI = require('node-sspi');
  nodeSSPI = new NodeSSPI({
    retrieveGroups : false,
    offerBasic     : false,
    sspiPackagesUsed: ['NTLM'],
  });
  console.log('[Auth] Windows SSPI authentication enabled.');
} catch (err) {
  console.warn('[Auth] node-sspi unavailable – running without Windows auth:', err.message);
}

if (nodeSSPI) {
  app.use((req, res, next) => {
    nodeSSPI.authenticate(req, res, (err) => {
      if (err) return next(err);
      if (!res.finished) next();
    });
  });
}

// ── Body parsers & static files ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Logged-in user endpoint (used by the frontend navbar) ───────────────────
app.get('/api/user', (req, res) => {
  // node-sspi stores the authenticated user on the request object
  const user = (req.connection && req.connection.user)
    || req.headers['x-remote-user']   // IIS / reverse-proxy header
    || process.env.USERNAME
    || 'Unknown User';
  res.json({ user });
});

// ── Report API ───────────────────────────────────────────────────────────────
app.use('/api', reportRouter);

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err.stack || err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`Claims Report running at http://localhost:${PORT}`);
  console.log(`Claims Report network URL: http://${MACHINE_NAME}:${PORT}`);
  console.log('Press Ctrl+C to stop.');
});
