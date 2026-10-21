import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

const ALLOWED_DOMAIN = 'students.unilorin.edu.ng';
const STUDENT_USERNAME_REGEX = /^[a-z0-9-]+$/i;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_24H = 5;
const OTP_EXPIRY_MS = 10 * 60 * 1000;

interface OtpRecord {
  emailHash: string;
  normalizedEmail: string;
  hashedOtp: string;
  salt: string;
  plainOtpForDev?: string;
  attemptsLeft: number;
  createdAt: number;
  expiresAt: number;
  lastRequestedAt: number;
  dailyCount: number;
  dailyWindowStart: number;
}

// In-memory backing store for OTP verifications and accounts
const otpStore = new Map<string, OtpRecord>();
const devSentEmails: Array<{ to: string; subject: string; otp: string; html?: string; timestamp: string }> = [];

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email).digest('hex');
}

function hashOtp(otp: string, salt: string): string {
  return crypto.scryptSync(otp, salt, 64).toString('hex');
}

function verifyTimingSafe(expectedHash: string, providedOtp: string, salt: string): boolean {
  const computedHash = hashOtp(providedOtp, salt);
  const a = Buffer.from(expectedHash, 'hex');
  const b = Buffer.from(computedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function unilorinAuthPlugin(): Plugin {
  return {
    name: 'unilorin-auth-service',
    configureServer(server) {
      server.middlewares.use('/api/auth/unilorin', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || '';

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        // POST /api/auth/unilorin/send-otp
        if (req.method === 'POST' && url.startsWith('/send-otp')) {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const rawEmail = typeof data.email === 'string' ? data.email : '';
              const normalizedEmail = rawEmail.trim().toLowerCase();

              if (!normalizedEmail || !normalizedEmail.includes('@')) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Please provide a valid University of Ilorin student email address.' }));
                return;
              }

              const parts = normalizedEmail.split('@');
              if (parts.length !== 2) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Malformed email address provided.' }));
                return;
              }

              const [username, domain] = parts;

              // Strict Match Check: Require domain === 'students.unilorin.edu.ng'
              if (domain !== ALLOWED_DOMAIN) {
                res.statusCode = 403;
                res.end(JSON.stringify({
                  error: `Access restricted exclusively to UNILORIN students (@${ALLOWED_DOMAIN}). Non-student domains like '${domain}' are rejected.`
                }));
                return;
              }

              // Validate username/matriculation format
              if (!STUDENT_USERNAME_REGEX.test(username)) {
                res.statusCode = 400;
                res.end(JSON.stringify({
                  error: 'Invalid student email prefix. Student email must contain valid matriculation format (e.g. 25-31qq023@students.unilorin.edu.ng).'
                }));
                return;
              }

              const emailHash = hashEmail(normalizedEmail);
              const now = Date.now();
              const existing = otpStore.get(emailHash);

              let dailyCount = 0;
              let windowStart = now;

              if (existing) {
                // Cooldown check: 60s
                if (now - existing.lastRequestedAt < RATE_LIMIT_WINDOW_MS) {
                  const remainingSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - existing.lastRequestedAt)) / 1000);
                  res.statusCode = 429;
                  res.end(JSON.stringify({
                    error: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
                    retryAfterSeconds: remainingSeconds
                  }));
                  return;
                }

                // 24-hour rate limit: max 5
                windowStart = existing.dailyWindowStart;
                if (now - windowStart < 24 * 60 * 60 * 1000) {
                  dailyCount = existing.dailyCount;
                  if (dailyCount >= MAX_REQUESTS_PER_24H) {
                    res.statusCode = 429;
                    res.end(JSON.stringify({
                      error: 'Daily verification limit exceeded (5 requests per 24 hours). Please contact student affairs or try again tomorrow.'
                    }));
                    return;
                  }
                } else {
                  dailyCount = 0;
                  windowStart = now;
                }
              }

              // Cryptographically strong 6-digit OTP
              const rawOtp = crypto.randomInt(100000, 1000000).toString();
              const salt = crypto.randomBytes(16).toString('hex');
              const hashedOtp = hashOtp(rawOtp, salt);

              otpStore.set(emailHash, {
                emailHash,
                normalizedEmail,
                hashedOtp,
                salt,
                plainOtpForDev: rawOtp,
                attemptsLeft: 5,
                createdAt: now,
                expiresAt: now + OTP_EXPIRY_MS,
                lastRequestedAt: now,
                dailyCount: dailyCount + 1,
                dailyWindowStart: windowStart,
              });

              // Log to dev email queue with HTML body
              const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Verify Your Student Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #2d3748;">
    <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #0f172a; padding: 28px 36px; text-align: center; border-bottom: 4px solid #002b49;">
            <div style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 700; font-size: 12px; padding: 4px 14px; border-radius: 20px; letter-spacing: 0.5px; margin-bottom: 8px;">UNIVERSITY OF ILORIN</div>
            <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0;">Student Identity Verification</h1>
            <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Official Campus Portal Gateway</p>
        </div>
        <div style="padding: 32px 36px;">
            <div style="font-size: 15px; font-weight: 600; color: #1a202c; margin-bottom: 10px;">Hello UNILORIN Student,</div>
            <p style="font-size: 14px; line-height: 1.5; color: #4a5568; margin: 0 0 16px 0;">We received an authentication request for your official student account:</p>
            <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #0f172a; padding: 10px 14px; border-radius: 8px; font-family: monospace; font-size: 13px; font-weight: 600; display: inline-block; margin-bottom: 20px;">${normalizedEmail}</div>
            <div style="background-color: #f8fafc; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 18px 0;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700; margin-bottom: 6px;">Your 6-Digit Passcode</div>
                <div style="font-family: monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0284c7; margin: 6px 0;">${rawOtp}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Valid for 10 minutes &bull; Single use only</div>
            </div>
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
                <p style="font-size: 12px; color: #92400e; line-height: 1.4; margin: 0;"><strong>Security Reminder:</strong> Never share this code with anyone. UNILORIN personnel will never ask for your verification passcode.</p>
            </div>
        </div>
        <div style="background-color: #f8fafc; padding: 18px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">&copy; UNILORIN Campus Foundry &bull; Google Cloud & Firebase Secured</p>
        </div>
    </div>
</body>
</html>`;

              devSentEmails.unshift({
                to: normalizedEmail,
                subject: 'UNILORIN Student Portal - One-Time Verification Code (OTP)',
                otp: rawOtp,
                html: emailHtml,
                timestamp: new Date().toISOString(),
              });

              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                message: `Verification code sent to ${normalizedEmail}. Check your student webmail.`,
                email: normalizedEmail,
                expiresInSeconds: 600,
              }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err?.message || 'Server error processing OTP request.' }));
            }
          });
          return;
        }

        // POST /api/auth/unilorin/verify-otp
        if (req.method === 'POST' && url.startsWith('/verify-otp')) {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const rawEmail = typeof data.email === 'string' ? data.email : '';
              const otp = typeof data.otp === 'string' ? data.otp.trim() : '';
              const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : 'UNILORIN Student';
              const role = data.role === 'trader' ? 'trader' : 'student';
              const hostelLocation = typeof data.hostelLocation === 'string' ? data.hostelLocation : 'Lagos Hostel';
              const faculty = typeof data.faculty === 'string' ? data.faculty : 'Faculty of Communication & Information Sciences';
              const department = typeof data.department === 'string' ? data.department : 'Computer Science';
              const whatsapp = typeof data.whatsapp === 'string' ? data.whatsapp : '';

              const normalizedEmail = rawEmail.trim().toLowerCase();
              const domain = normalizedEmail.split('@')[1];

              if (domain !== ALLOWED_DOMAIN) {
                res.statusCode = 403;
                res.end(JSON.stringify({ error: `Email must belong to @${ALLOWED_DOMAIN}` }));
                return;
              }

              if (!/^\d{6}$/.test(otp)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'OTP must be a 6-digit numeric code.' }));
                return;
              }

              const emailHash = hashEmail(normalizedEmail);
              const record = otpStore.get(emailHash);
              const now = Date.now();

              if (!record) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'No active OTP request found for this email. Please request a new verification code.' }));
                return;
              }

              if (now > record.expiresAt) {
                otpStore.delete(emailHash);
                res.statusCode = 410;
                res.end(JSON.stringify({ error: 'This verification code has expired. Please request a new code.' }));
                return;
              }

              if (record.attemptsLeft <= 0) {
                otpStore.delete(emailHash);
                res.statusCode = 403;
                res.end(JSON.stringify({ error: 'Maximum verification attempts exceeded. Please request a new code.' }));
                return;
              }

              const isMatch = verifyTimingSafe(record.hashedOtp, otp, record.salt);

              if (!isMatch) {
                record.attemptsLeft -= 1;
                if (record.attemptsLeft <= 0) {
                  otpStore.delete(emailHash);
                  res.statusCode = 403;
                  res.end(JSON.stringify({ error: 'Incorrect OTP. Verification limit reached. Please request a new code.' }));
                } else {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: `Incorrect OTP code. ${record.attemptsLeft} attempts remaining.` }));
                }
                return;
              }

              // Invalidate OTP immediately to prevent replay
              otpStore.delete(emailHash);

              const matricNumber = normalizedEmail.split('@')[0];
              const uid = 'unilorin_' + matricNumber.toLowerCase().replace(/[^a-z0-9]/g, '_');

              const userProfile = {
                uid,
                email: normalizedEmail,
                fullName,
                role,
                matricNumber,
                faculty,
                department,
                hostelLocation,
                whatsapp,
                isVerified: true,
                institution: 'University of Ilorin',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                uid,
                user: userProfile,
                message: 'UNILORIN Student verified and authenticated successfully.'
              }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err?.message || 'Server error verifying OTP.' }));
            }
          });
          return;
        }

        // GET /api/auth/unilorin/dev-emails
        if (req.method === 'GET' && url.startsWith('/dev-emails')) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, emails: devSentEmails.slice(0, 10) }));
          return;
        }

        // GET /api/auth/unilorin/preview-email (Render HTML in browser)
        if (req.method === 'GET' && url.startsWith('/preview-email')) {
          const latest = devSentEmails[0];
          if (!latest || !latest.html) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html');
            res.end('<h3>No UNILORIN OTP emails dispatched yet in this dev session.</h3>');
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(latest.html);
          return;
        }

        next();
      });
    }
  };
}
