# EduPulse - Research Survey Platform

## Overview

EduPulse is a research survey platform designed for university and college students to earn money by completing academic research surveys. The platform features a quality scoring system to ensure high-quality responses, referral bonuses, withdrawal management, and separate user and admin interfaces.

**Core Purpose**: Connect academic researchers with student participants through a gamified, quality-focused survey completion system.

**Tech Stack**:
- Frontend: React 18 with TypeScript, Vite
- UI Framework: shadcn/ui with Radix UI primitives
- Styling: Tailwind CSS
- State Management: TanStack Query (React Query)
- Routing: React Router v6
- Backend: Supabase (Authentication, Database, Storage)
- Database ORM: Drizzle ORM with Neon PostgreSQL

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Component Structure**:
- Page-based routing with protected routes for authenticated users
- Separate admin and user dashboards with role-based access control
- Responsive mobile-first design with dedicated mobile navigation
- Shared UI components from shadcn/ui library

**Key Design Patterns**:
- Context API for authentication state management (`AuthContext`)
- Protected route wrapper component for access control
- Custom hooks for mobile detection (`use-mobile`)
- Toast notifications using both Radix Toast and Sonner for user feedback

**Authentication Flow**:
- Supabase Auth with email/password authentication
- Session-based authentication with automatic token refresh
- Role-based routing (admin vs. regular users)
- Auth state persisted across page refreshes

**State Management**:
- React Query for server state (surveys, profiles, withdrawals)
- Context API for global auth state
- Local component state for UI interactions

### Quality Score System

**Core Mechanic**: Users have a quality score (0-100%) that determines their platform status and earning potential.

**Status Levels**:
- Good Standing (70-100%): Full access to surveys
- Caution (40-69%): Limited access, warning displayed
- Restricted (<40%): Account suspended from taking surveys

**Rationale**: Ensures high-quality research data by incentivizing careful survey completion and penalizing rushed or low-quality responses.

### Survey Management

**Survey Lifecycle**:
1. Admin creates survey with questions (multiple choice, checkboxes, text)
2. Survey published with reward amount and time limit
3. Users complete surveys within time constraints
4. Admin reviews responses and approves/rejects
5. Approved responses convert held balance to approved balance

**Daily Limits**:
- Users can complete maximum 5 surveys per day
- 1-hour cooldown between survey completions
- Prevents survey farming and ensures quality engagement

### Wallet & Payments

**Balance Types**:
- **Held Balance**: Pending approval after survey completion
- **Approved Balance**: Available for withdrawal after admin review

**Withdrawal System**:
- Users request withdrawals from approved balance
- Admin manually reviews and processes withdrawal requests
- Status tracking (pending, approved, rejected, held)
- First withdrawal requires payment invoice submission

**Payment Flow**:
1. New user signs up
2. User redirected to payment invoice page (not implemented in current codebase)
3. Admin verifies payment
4. User account activated for survey participation

### Referral System

**Mechanics**:
- Each user receives unique referral code on signup
- Referral links format: `/ref/{code}`
- Bonus system tracked in database (implementation pending)
- Referrer and referee both earn bonuses

**Rationale**: Organic user growth through student networks, leveraging existing social connections in universities.

### Admin Interface

**Admin Capabilities**:
- Dashboard with platform statistics
- Survey creation and management
- Withdrawal request approval/rejection
- User management (via database)
- System settings configuration

**Access Control**: Admin status determined by `is_admin` flag in profiles table, checked in AuthContext.

### Mobile Optimization

**Responsive Design**:
- Mobile-first Tailwind breakpoints
- Bottom navigation bar for mobile devices (hidden on desktop)
- Touch-optimized UI components
- Collapsible/drawer patterns for mobile screens

**Mobile Detection**: Custom `useIsMobile` hook with 768px breakpoint.

### Error Handling

**Strategies**:
- 404 page with console error logging
- Toast notifications for user-facing errors
- Loading states during async operations
- Protected route redirects for unauthorized access

## External Dependencies

### Supabase Integration

**Purpose**: Backend-as-a-Service for authentication, database, and storage

**Key Features Used**:
- `@supabase/supabase-js`: Client library for Supabase interactions
- Authentication with email/password
- Real-time subscriptions for auth state changes
- Row-level security (RLS) policies (configured in Supabase dashboard)

**Database Tables** (referenced in code):
- `profiles`: User profiles with quality scores, balances, referral codes
- `surveys`: Survey definitions
- `survey_questions`: Question bank for surveys
- `survey_responses`: User survey submissions
- `withdrawal_requests`: Withdrawal transaction records

### Drizzle ORM

**Purpose**: Type-safe database queries with PostgreSQL

**Configuration**:
- Schema definitions in `@shared/schema` (not visible in provided files)
- Neon PostgreSQL serverless database connection
- WebSocket support for serverless connections

**Rationale**: Type safety, better developer experience, and serverless-optimized connection pooling.

### UI Component Library

**shadcn/ui + Radix UI**:
- Pre-built accessible components
- Headless UI primitives from Radix
- Customizable with Tailwind CSS
- Components defined in `src/components/ui/`

**Design System**:
- HSL color system defined in CSS variables
- Primary color: Teal/Cyan (173° hue)
- Secondary color: Navy Blue (210° hue)
- Status colors for success, warning, destructive states

### Styling Framework

**Tailwind CSS**:
- Utility-first CSS framework
- Custom theme configuration in `tailwind.config.ts`
- Dark mode support via `next-themes`
- PostCSS for processing

### Form Management

**React Hook Form + Zod**:
- `@hookform/resolvers`: Validation resolver integration
- Zod schemas for type-safe validation (seen in EditProfile)
- Controlled form inputs with error handling

### Date Handling

**date-fns**: Utility library for date manipulation and formatting in survey time limits and withdrawal timestamps.

### Icons

**lucide-react**: Consistent icon set used throughout the application for UI elements.

### Development Tools

**Vite**:
- Fast development server with HMR
- SWC for React compilation
- Path aliases configured (`@/*` → `./src/*`)

**TypeScript**:
- Strict mode disabled for faster development
- Path resolution configured
- Type definitions for Vite environment

**ESLint**:
- React hooks rules enforced
- TypeScript rules with relaxed unused variable checks
- React Refresh plugin for fast refresh during development