import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Configuration
let currentGatePassword = process.env.VAULT_ACCESS_PASSWORD || '1509';
const SESSION_SECRET = process.env.VAULT_SESSION_SECRET || 'forever-us-secret-salt-2026';
const LOCKOUT_THRESHOLD = 3;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// In-memory rate limiting and lockout state
interface ClientLockoutState {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}
const ipLockoutMap = new Map<string, ClientLockoutState>();

// Helper to get client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// Generate signed token for gate passed state
function generateGateToken(): string {
  const payload = `unlocked:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}::${signature}`).toString('base64');
}

// Verify signed token
function verifyGateToken(token?: string): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [payload, signature] = decoded.split('::');
    if (!payload || !signature) return false;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }
    const parts = payload.split(':');
    const issuedAt = parseInt(parts[1], 10);
    // Token valid for 7 days
    if (Date.now() - issuedAt > 7 * 24 * 60 * 60 * 1000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

app.use(express.json());
app.use(cookieParser());

// API: Check Gate Status
app.get('/api/auth/gate-status', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const state = ipLockoutMap.get(clientIp);
  const now = Date.now();

  const token = req.cookies['vault_gate_token'] || req.headers['x-vault-gate-token'];
  const isUnlocked = verifyGateToken(typeof token === 'string' ? token : undefined);

  if (state?.lockedUntil && state.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((state.lockedUntil - now) / 1000);
    return res.json({
      unlocked: false,
      locked: true,
      retryAfterSeconds,
      remainingAttempts: 0,
      lockoutMessage: "Our little universe is taking a tiny pause. 💗 Too many incorrect attempts. Please try again later."
    });
  }

  // Lock expired
  if (state && state.lockedUntil && state.lockedUntil <= now) {
    ipLockoutMap.delete(clientIp);
  }

  const failedAttempts = state?.failedAttempts || 0;
  return res.json({
    unlocked: isUnlocked,
    locked: false,
    remainingAttempts: Math.max(0, LOCKOUT_THRESHOLD - failedAttempts),
  });
});

// API: Verify Gate Password
app.post('/api/auth/verify-gate', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const now = Date.now();
  let state = ipLockoutMap.get(clientIp);

  if (!state) {
    state = { failedAttempts: 0, lockedUntil: null, lastAttemptAt: now };
    ipLockoutMap.set(clientIp, state);
  }

  // Check if currently locked out
  if (state.lockedUntil && state.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((state.lockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      locked: true,
      retryAfterSeconds,
      error: "Our little universe is taking a tiny pause. 💗 Too many incorrect attempts. Please try again later."
    });
  }

  // If lockout expired, reset
  if (state.lockedUntil && state.lockedUntil <= now) {
    state.failedAttempts = 0;
    state.lockedUntil = null;
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: "Please enter the password." });
  }

  // Constant-time comparison to prevent timing attacks
  const enteredBuffer = Buffer.from(password.trim());
  const actualBuffer = Buffer.from(currentGatePassword.trim());

  let isMatch = false;
  if (enteredBuffer.length === actualBuffer.length) {
    isMatch = crypto.timingSafeEqual(enteredBuffer, actualBuffer);
  }

  if (isMatch) {
    // Reset failed count
    ipLockoutMap.delete(clientIp);
    const token = generateGateToken();

    res.cookie('vault_gate_token', token, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Welcome home, my love! Opening our universe... 💖",
      token,
    });
  } else {
    state.failedAttempts += 1;
    state.lastAttemptAt = now;

    if (state.failedAttempts >= LOCKOUT_THRESHOLD) {
      state.lockedUntil = now + LOCKOUT_DURATION_MS;
      const retryAfterSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
      return res.status(429).json({
        success: false,
        locked: true,
        retryAfterSeconds,
        error: "Our little universe is taking a tiny pause. 💗 Too many incorrect attempts. Please try again later."
      });
    }

    const remaining = LOCKOUT_THRESHOLD - state.failedAttempts;
    return res.status(401).json({
      success: false,
      locked: false,
      remainingAttempts: remaining,
      error: `Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
    });
  }
});

// API: Update Gate Password (from Settings by authorized couple)
app.post('/api/auth/update-gate-password', (req: Request, res: Response) => {
  const token = req.cookies['vault_gate_token'] || req.headers['x-vault-gate-token'];
  if (!verifyGateToken(typeof token === 'string' ? token : undefined)) {
    return res.status(403).json({ error: "Access denied. Unlock the vault first." });
  }

  const { currentPassword, newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
    return res.status(400).json({ error: "New password must be at least 4 characters long." });
  }

  if (currentPassword !== currentGatePassword) {
    return res.status(401).json({ error: "Current password does not match." });
  }

  currentGatePassword = newPassword.trim();
  return res.json({ success: true, message: "Vault password successfully updated! 💕" });
});

// API: Gate Logout
app.post('/api/auth/gate-logout', (_req: Request, res: Response) => {
  res.clearCookie('vault_gate_token');
  return res.json({ success: true });
});

// API: Health & Config check
app.get('/api/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    appName: 'Forever Us',
    time: new Date().toISOString(),
  });
});

// Development or Production Frontend Mounting
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve('.', 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve('.', 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Forever Us Vault Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
