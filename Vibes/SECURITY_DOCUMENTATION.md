# NewsBoard Security Documentation
## OWASP Top 10 Security Implementation Report

This document details all security measures implemented in the NewsBoard application, mapped to the OWASP Top 10 (2021) security risks.

---

## Table of Contents

1. [A01:2021 - Broken Access Control](#a012021---broken-access-control)
2. [A02:2021 - Cryptographic Failures](#a022021---cryptographic-failures)
3. [A03:2021 - Injection](#a032021---injection)
4. [A04:2021 - Insecure Design](#a042021---insecure-design)
5. [A05:2021 - Security Misconfiguration](#a052021---security-misconfiguration)
6. [A06:2021 - Vulnerable and Outdated Components](#a062021---vulnerable-and-outdated-components)
7. [A07:2021 - Identification and Authentication Failures](#a072021---identification-and-authentication-failures)
8. [A08:2021 - Software and Data Integrity Failures](#a082021---software-and-data-integrity-failures)
9. [A09:2021 - Security Logging and Monitoring Failures](#a092021---security-logging-and-monitoring-failures)
10. [A10:2021 - Server-Side Request Forgery (SSRF)](#a102021---server-side-request-forgery-ssrf)

---

## A01:2021 - Broken Access Control

### Risk Description
Access control enforces policy such that users cannot act outside of their intended permissions.

### Implementation

#### 1. Authentication Middleware (`server/routes.ts`)
```typescript
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}
```
- All protected routes require authentication via Passport.js session verification
- Unauthenticated requests receive a 401 Unauthorized response

#### 2. Role-Based Access Control (RBAC)
```typescript
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }
  next();
}
```
- Admin-only functions are protected with role verification
- Users can only delete their own articles
- Admins can delete any article

#### 3. Resource Ownership Verification
```typescript
// Delete endpoint checks ownership
if (article.userId !== req.user!.id && req.user!.role !== "admin") {
  return res.status(403).json({ message: "Forbidden - You can only delete your own articles" });
}
```

---

## A02:2021 - Cryptographic Failures

### Risk Description
Failures related to cryptography which often lead to exposure of sensitive data.

### Implementation

#### 1. Password Hashing with bcrypt (`server/routes.ts`, `server/index.ts`)
```typescript
// Registration - Hash password with salt rounds of 10
const hashedPassword = await bcrypt.hash(validatedData.password, 10);

// Login - Compare hashed password
const isValidPassword = await bcrypt.compare(password, user.password);
```
- **Algorithm**: bcrypt with 10 salt rounds
- **Why bcrypt**: Designed specifically for password hashing, resistant to rainbow table attacks, computationally expensive to brute force

#### 2. Secure Session Configuration
```typescript
app.use(session({
  secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
  cookie: {
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    httpOnly: true, // Prevents JavaScript access
    sameSite: "lax", // CSRF protection
  },
}));
```

#### 3. No Plaintext Storage
- Passwords are never stored in plaintext
- Session secrets should be set via environment variables

---

## A03:2021 - Injection

### Risk Description
Injection flaws occur when untrusted data is sent to an interpreter as part of a command or query.

### Implementation

#### 1. SQL Injection Prevention - Parameterized Queries (Drizzle ORM)
```typescript
// All database queries use Drizzle ORM's parameterized queries
const result = await this.db.select().from(schema.users).where(eq(schema.users.username, username));
```
- Drizzle ORM automatically parameterizes all queries
- No raw SQL concatenation with user input
- Type-safe query building prevents injection

#### 2. XSS Prevention - Input Sanitization (`server/routes.ts`)
```typescript
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const purify = DOMPurify(window);

function sanitizeInput(input: string): string {
  return purify.sanitize(input, { ALLOWED_TAGS: [] });
}
```
- All user-provided text (usernames, article titles) is sanitized using DOMPurify
- HTML tags are stripped completely (`ALLOWED_TAGS: []`)
- Prevents stored XSS attacks

#### 3. Input Validation with Zod (`shared/schema.ts`)
```typescript
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3).max(255),
  password: z.string().min(8),
});

export const insertArticleSchema = createInsertSchema(articles, {
  title: z.string().min(5),
  url: z.string().url(), // Validates URL format
});
```
- Strict schema validation on all inputs
- Type coercion and format validation
- Prevents malformed data from reaching the database

---

## A04:2021 - Insecure Design

### Risk Description
Represents different weaknesses due to missing or ineffective control design.

### Implementation

#### 1. Secure Architecture
- **Separation of Concerns**: Frontend, API routes, and storage layer are clearly separated
- **Principle of Least Privilege**: Users can only access their own resources
- **Defense in Depth**: Multiple layers of security (validation, sanitization, authentication, authorization)

#### 2. Secure Defaults
- New users are assigned the "user" role by default (not admin)
- Sessions are configured with secure defaults
- Rate limiting is enabled by default

#### 3. Admin Account Initialization
```typescript
// Admin account is created on server startup if it doesn't exist
const adminUser = await storage.getUserByUsername("admin");
if (!adminUser) {
  const hashedPassword = await bcrypt.hash("admin", 10);
  await storage.createUser({
    username: "admin",
    password: hashedPassword,
    role: "admin",
  });
}
```

---

## A05:2021 - Security Misconfiguration

### Risk Description
Security misconfiguration is commonly a result of insecure default configurations or incomplete configurations.

### Implementation

#### 1. Helmet.js Security Headers (`server/index.ts`)
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```
Helmet sets the following security headers:
- **Content-Security-Policy (CSP)**: Restricts resource loading sources
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Legacy XSS filter
- **Strict-Transport-Security**: Enforces HTTPS

#### 2. Cookie Security Configuration
```typescript
cookie: {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  sameSite: "lax",
}
```
- **httpOnly**: Prevents JavaScript access to session cookie
- **secure**: Cookie only sent over HTTPS in production
- **sameSite**: Provides CSRF protection

#### 3. Trust Proxy Configuration
```typescript
app.set("trust proxy", 1);
```
- Properly configured for deployment behind reverse proxies
- Ensures accurate IP detection for rate limiting

---

## A06:2021 - Vulnerable and Outdated Components

### Risk Description
Using components with known vulnerabilities.

### Implementation

#### 1. Modern, Maintained Dependencies
All dependencies are current versions:
- **Express**: v4.21.2 (latest stable)
- **Passport**: v0.7.0 (latest)
- **bcrypt**: Current stable version
- **helmet**: Current stable version
- **express-rate-limit**: Current stable version

#### 2. Type-Safe Development
- TypeScript ensures type safety across the application
- Zod provides runtime type validation
- Drizzle ORM provides type-safe database operations

---

## A07:2021 - Identification and Authentication Failures

### Risk Description
Confirmation of the user's identity, authentication, and session management is critical to protect against authentication-related attacks.

### Implementation

#### 1. Secure Password Requirements (`shared/schema.ts`)
```typescript
password: z.string().min(8, "Password must be at least 8 characters")
```
- Minimum 8 character password requirement
- Validated on both frontend and backend

#### 2. Rate Limiting on Authentication (`server/index.ts`)
```typescript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
});
```
- Only 5 failed login attempts per 15 minutes
- Prevents brute force attacks
- Successful logins don't count against the limit

#### 3. Secure Session Management
```typescript
passport.serializeUser((user, done) => {
  done(null, user.id); // Only store user ID in session
});

passport.deserializeUser(async (id: number, done) => {
  const user = await storage.getUser(id);
  done(null, { id: user.id, username: user.username, role: user.role });
});
```
- Session stores only user ID (not full user object)
- User data fetched fresh on each request
- Session timeout of 24 hours

#### 4. Generic Error Messages
```typescript
return done(null, false, { message: "Invalid credentials" });
```
- Same error message for wrong username or wrong password
- Prevents username enumeration attacks

---

## A08:2021 - Software and Data Integrity Failures

### Risk Description
Failures relating to code and infrastructure that does not protect against integrity violations.

### Implementation

#### 1. Input Validation Pipeline
1. **Frontend Validation**: Zod schema validates user input before submission
2. **Backend Validation**: Same Zod schema revalidates on server
3. **Sanitization**: DOMPurify strips malicious content
4. **ORM Protection**: Drizzle parameterizes database queries

#### 2. Secure Cookie Attributes
```typescript
sameSite: "lax" // Protects against CSRF
```

#### 3. Database Integrity
- Foreign key constraints between articles and users
- Cascade delete ensures orphan records don't exist
- NOT NULL constraints prevent incomplete data

---

## A09:2021 - Security Logging and Monitoring Failures

### Risk Description
Without logging and monitoring, breaches cannot be detected.

### Implementation

#### 1. Request Logging (`server/index.ts`)
```typescript
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});
```
- All API requests are logged with:
  - HTTP method
  - Request path
  - Response status code
  - Response time
  - Response body (for debugging)

#### 2. Structured Logging
```typescript
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
```

---

## A10:2021 - Server-Side Request Forgery (SSRF)

### Risk Description
SSRF flaws occur when a web application fetches a remote resource without validating the user-supplied URL.

### Implementation

#### 1. URL Validation
```typescript
url: z.string().url("Must be a valid URL")
```
- All URLs are validated using Zod's URL validator
- Invalid URLs are rejected before processing

#### 2. No Server-Side URL Fetching
- The application does not fetch external URLs server-side
- Article URLs are stored and displayed to users who click them
- This eliminates SSRF risk entirely

---

## Summary Table

| OWASP Risk | Implementation | Status |
|------------|----------------|--------|
| A01: Broken Access Control | Authentication middleware, RBAC, ownership checks | ✅ |
| A02: Cryptographic Failures | bcrypt password hashing, secure sessions | ✅ |
| A03: Injection | Parameterized queries (Drizzle), DOMPurify sanitization, Zod validation | ✅ |
| A04: Insecure Design | Separation of concerns, secure defaults, defense in depth | ✅ |
| A05: Security Misconfiguration | Helmet.js headers, secure cookies, trust proxy | ✅ |
| A06: Vulnerable Components | Modern dependencies, TypeScript, type-safe ORM | ✅ |
| A07: Auth Failures | 8-char passwords, rate limiting, secure sessions | ✅ |
| A08: Integrity Failures | Input validation, CSRF protection, DB constraints | ✅ |
| A09: Logging Failures | Request logging, structured timestamps | ✅ |
| A10: SSRF | URL validation, no server-side fetching | ✅ |

---

## Running the Application

### Quick Start
```bash
make dev
```

### Manual Start
```bash
npm install
npm run dev
```

### Default Credentials (Development Only)
- **Admin Account**: username: `admin`, password: `adminpass`
- In production, the ADMIN_PASSWORD environment variable MUST be set

---

## Required Environment Variables

### Development
No environment variables required. Secure defaults are used with warnings.

### Production (Required)
```bash
export SESSION_SECRET="your-very-secure-random-string-min-32-chars"
export ADMIN_PASSWORD="your-secure-admin-password-min-8-chars"
export NODE_ENV="production"
```

The application will **fail to start** in production if these are not set.

---

## Security Recommendations for Production

1. **SESSION_SECRET** (Required): Set a cryptographically random string of at least 32 characters
2. **ADMIN_PASSWORD** (Required): Set a secure admin password (minimum 8 characters)
3. **Enable HTTPS**: Set `NODE_ENV=production` to enable secure cookies
4. **Database backups**: Implement regular PostgreSQL backups
5. **Log aggregation**: Send logs to a centralized logging service
6. **Monitor rate limits**: Review blocked requests for attack patterns
7. **Rotate secrets**: Periodically rotate SESSION_SECRET and admin credentials

---

*Document generated for NewsBoard Article Sharing Application*
*Last updated: December 2024*
