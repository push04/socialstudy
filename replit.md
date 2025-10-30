# SocialStudy - Study Buddy Network

## Overview
SocialStudy is a study buddy networking platform built with React, Vite, TypeScript, and Supabase. The application helps students find study partners matched to their courses, schedule, and study style. It features real-time chat, video rooms, and an advanced Pomodoro timer.

## Project Structure
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Routing**: React Router v6
- **Backend**: Supabase (authentication, database, real-time features)
- **Animations**: Framer Motion

## Key Features
- Smart matching algorithm for study partners
- Real-time chat functionality
- Video rooms for collaborative studying
- Pomodoro timer with streak tracking
- Calendar for scheduling study sessions
- Group study management

## Development Setup
The project is configured to run on Replit with:
- Dev server on port 5000 (0.0.0.0)
- Hot Module Replacement (HMR) configured for Replit's proxy
- Supabase client configured with environment variables

## Environment Variables
The application uses Vite environment variables:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

Fallback values are provided in `src/lib/supabase.ts` for development.

## Recent Changes
- 2025-10-30: Configured for Replit environment
  - Updated Vite config for port 5000 with 0.0.0.0 host
  - Added HMR configuration for Replit proxy
  - Created TypeScript environment definitions for Vite
  - Installed all dependencies
  - Set up development workflow

## User Preferences
None documented yet.

## Architecture Notes
- Uses Supabase for all backend operations (auth, database, real-time)
- Component-based architecture with reusable UI components
- Page-based routing structure
- Centralized Supabase client in `src/lib/supabase.ts`
- Toast notifications system for user feedback
