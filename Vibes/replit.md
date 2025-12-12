# NewsBoard

## Overview

NewsBoard is a community-driven link sharing platform similar to Hacker News. Users can register, log in, submit articles with URLs, and browse content shared by others. The application features role-based access control with admin and user roles, secure authentication, and a clean newspaper-inspired UI design.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Context for auth state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

The frontend follows a page-based structure with reusable components. Key pages include home (article list), login/register, and submit. The UI uses a newspaper-inspired design with custom fonts (Inter, Merriweather).

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy, session-based auth
- **Security**: 
  - Helmet for security headers
  - Rate limiting on auth endpoints
  - bcrypt for password hashing
  - DOMPurify for input sanitization
  - CSRF protection via session cookies

The server follows a modular structure with routes, storage layer, and static file serving separated into distinct files.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema**: Two main tables - `users` (id, username, password, role, createdAt) and `articles` (id, title, url, userId, createdAt)

### Authentication Flow
1. Users register with username/password (password hashed with bcrypt)
2. Session-based authentication via express-session
3. Passport.js local strategy for credential verification
4. Role-based access control (admin/user roles)
5. Protected routes use `requireAuth` and `requireAdmin` middleware

### API Structure
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user
- `GET /api/articles` - List all articles
- `POST /api/articles` - Create article (authenticated)
- `DELETE /api/articles/:id` - Delete article (owner or admin)

## External Dependencies

### Database
- PostgreSQL (connection via `DATABASE_URL` environment variable)
- Drizzle ORM for database operations

### Authentication & Security
- Passport.js with passport-local strategy
- bcrypt for password hashing
- express-session for session management
- helmet for HTTP security headers
- express-rate-limit for rate limiting
- DOMPurify with JSDOM for XSS protection

### Frontend Libraries
- @tanstack/react-query for data fetching
- @radix-ui components (via shadcn/ui)
- date-fns for date formatting
- lucide-react for icons

### Build & Development
- Vite for frontend bundling
- esbuild for server bundling
- TypeScript for type safety