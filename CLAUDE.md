# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Scripts
- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production (runs TypeScript check then Vite build)
- `npm run typecheck` - Run TypeScript compiler check only
- `npm run lint` - Run ESLint on codebase
- `npm run preview` - Preview production build locally

### Environment Setup
This app requires Supabase configuration. Set these environment variables:
- `VITE_SUPABASE_URL` - Supabase project API URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon public key

Use `.env.local` for real credentials (git-ignored) and `.env` for safe placeholders.

## Architecture Overview

This is a React + TypeScript application for searching Datex release notes with the following architecture:

### Core Technologies
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Search**: Fuse.js for client-side fuzzy search, PostgreSQL full-text search server-side
- **State**: React Query (@tanstack/react-query) for server state management

### Key Architectural Patterns

#### Data Flow Architecture
- **Search Interface** → **Query Processing** → **Database Layer** → **Results Display**
- Uses infinite scrolling with React Query's `useInfiniteQuery`
- Implements dual search strategy: PostgreSQL FTS with ILIKE fallback
- Real-time abbreviation expansion for search terms

#### Component Structure
```
src/
├── components/
│   ├── admin/          # Admin tools (upload, abbreviation management)
│   ├── layout/         # App shell, themes, animated background
│   ├── results/        # Release cards, results panel
│   └── search/         # Search panel with filters
├── hooks/              # Custom React hooks for data fetching
├── lib/                # Business logic and utilities
│   ├── abbreviations/  # Abbreviation expansion service
│   ├── auth/           # Admin authentication
│   ├── parser/         # Release notes parsing logic
│   ├── search/         # Search query processing
│   └── supabase/       # Database client
└── types/              # TypeScript definitions
```

#### Database Schema
- **releases**: Version, release date
- **release_items**: Individual release notes with title, description, component, Azure DevOps ID
- **abbreviations**: Search term expansions (e.g., "API" → "Application Programming Interface")
- **search_history**: Query tracking

#### Search Implementation
The search system uses a sophisticated multi-layer approach:

1. **Query Processing** (`src/lib/search/query.ts`):
   - Tokenizes search queries
   - Expands abbreviations bidirectionally
   - Handles AND/OR logic

2. **Database Search** (`src/hooks/useInfiniteReleases.ts`):
   - Primary: PostgreSQL `websearch_to_tsquery` with full-text search
   - Fallback: ILIKE pattern matching on title/description
   - Supports component filtering, date ranges, sorting

3. **Client-side Search** (`src/lib/search/fuse.ts`):
   - Fuse.js for fuzzy matching when needed
   - Configurable threshold and field weights

#### Parser System
Complex release notes parsing in `src/lib/parser/releaseParser.ts`:
- Handles multiple date formats (dd.mm.yy, yyyy-mm-dd, etc.)
- Detects Azure DevOps IDs, components, categories
- Supports both single releases and multi-release documents
- JSON and plain text input formats

#### Admin Features
- **Release Upload**: Parse and import release notes
- **Abbreviation Management**: CRUD operations for search term expansion
- **Authentication**: Simple admin gate for protected operations

### State Management Strategy
- **Server State**: React Query for all API calls, caching, infinite queries
- **Local State**: React useState for UI state, search filters
- **No Global State**: Deliberately avoiding Redux/Zustand for simplicity
- **Persistence**: Search history stored in Supabase

### Performance Considerations
- Infinite scrolling with 20-item pages
- Search debouncing (300ms)
- Abbreviation caching with React Query
- Optimized database queries with proper indexing
- Fallback search strategies for reliability

### Component Communication
- **Props down, events up**: Standard React pattern
- **Search filters**: Lifted to App.tsx, passed to search and results panels
- **Data fetching**: Encapsulated in custom hooks
- **No context providers**: Keeping component tree simple