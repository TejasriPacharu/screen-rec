// backend/src/auth.ts
import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { User } from './models/User';
import {
  JWT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
  FRONTEND_URL,
} from './config';

// ── Passport Google Strategy ──────────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID:     GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL:  GOOGLE_CALLBACK_URL,
      scope: [
        'profile',
        'email',
        // Drive scope — stored now, used later for fallback upload feature
        'https://www.googleapis.com/auth/drive.file',
      ],
    },
    async (accessToken, refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), undefined);

        // Upsert — create on first login, update tokens on subsequent logins
        const user = await User.findOneAndUpdate(
          { googleId: profile.id },
          {
            googleId:          profile.id,
            email,
            displayName:       profile.displayName,
            avatar:            profile.photos?.[0]?.value,
            driveAccessToken:  accessToken,
            driveRefreshToken: refreshToken ?? undefined,
            driveTokenExpiry:  new Date(Date.now() + 3600 * 1000), // 1h estimate
          },
          { upsert: true, new: true }
        );

        return done(null, user);
      } catch (err) {
        return done(err, undefined);
      }
    }
  )
);

// ── Router ────────────────────────────────────────────────────────────────────
export const authRouter = Router();

// Step 1: Redirect user to Google consent screen
authRouter.get(
  '/google',
  passport.authenticate('google', {
    session: false,
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.file',
    ],
    accessType: 'offline',   // ensures we get a refresh_token
    prompt: 'consent',       // forces consent screen so refresh_token is always returned
  })
);

// Step 2: Google redirects back here with a code
authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}?error=oauth_failed` }),
  (req: Request, res: Response) => {
    const user = req.user as any;

    // Issue our own JWT so the frontend stays on the same auth pattern
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Redirect to frontend with token in query param
    // Frontend picks it up, stores in localStorage, redirects to app
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// GET /auth/me — lets frontend verify token and get user info
authRouter.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).userId).select(
      'email displayName avatar createdAt telegramChatId'
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Auth Middleware (unchanged shape — all other routes work as before) ────────
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}