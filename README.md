## Datex Release Notes Search (Internal)

An internal web app for Datex teams and customers to search, review, and analyze FootPrint release notes. It provides fast keyword search and an AI assistant that cross-checks a user’s issue against newer releases to determine if a fix already exists and in which version.

For support, contact QA@datexcorp.com

---

## Overview

This application centralizes release notes and makes them actionable:

- Search across releases using precise filters and abbreviation expansion (e.g., CLP → Composite License Plate).
- See context-rich results with version, date, component, and direct Azure DevOps links.
- Use the AI Assistant to describe a problem and your current version; it searches newer release notes for likely fixes and suggests upgrade targets when confident.
- Admin tools make it easy to ingest new notes, mark “Official” quarterly releases, and configure the AI backend.

---

## How It Works

- Data Ingestion: Admins upload or paste raw release notes (TXT/JSON). A built-in parser normalizes content into releases and items stored in Supabase. Items include title, description, component, and optional Azure DevOps IDs/links.
- Search Pipeline: Combines Supabase full-text search with a client FlexSearch index for fast, precise matching. Common abbreviations are expanded automatically. Filters include components, dates, logic (AND/OR), and titles-only.
- AI Assistant: Users select their current version and describe the issue. The assistant searches releases newer than that version, ranks likely fixes, and optionally suggests an upgrade version when confidence is high. If nothing relevant is found, users can send a prefilled email to QA.
- Official Releases: Admins can mark releases as “Official” (quarterly); badges appear in results to highlight them.

Notes:

- Historical cutoff: by design, only release notes on or after 2023-05-19 are included. For older notes, email QA@datexcorp.com
- AI uses OpenRouter. The API key + model are stored locally in the browser (Admin → AI Configuration).

---

## Key Features

- Search: AND/OR logic, titles-only toggle, date range, component filters, and sort by newest/oldest/relevance.
- Results: Highlighted matches, version/date/quarter badges, “Official Release” badge, copy Azure ID, and Azure DevOps deep links.
- Infinite Scroll: Seamless paging as you browse results.
- AI Assistant: “Describe issue + current version” flow returns the most relevant fixes, with cautious upgrade recommendations when appropriate.
- Report to QA: If no fix is found by AI, one click opens a prefilled email to QA@datexcorp.com
- Admin Tools: Release Notes Uploader (parse + save), Official Release Manager (toggle), AI Configuration (API key + model + connection test), Admin gate.

---

## Use Cases

- Support: Verify whether a customer’s reported issue already has a fix in a newer release. Cross-check the AI’s suggested notes and share the corresponding Azure ticket.
- Customer Self-Help: Select your current version and describe the problem. The AI Assistant checks if a fix exists in a newer version and points to the relevant ticket(s). You can also browse results and open Azure DevOps items directly.
- QA: Validate that release notes are correctly parsed, mark official quarters, and receive escalations via the built-in “Report Bug to QA” email flow.
- Product/Engineering: Quickly find when a fix/feature landed and which component/version it affects.

---

## Getting Started

Prerequisites

- Node.js 18+ (recommended)
- Access to a Supabase project with the expected schema

Install & Run

1) Install dependencies

```
npm install
```

2) Configure environment (see Environment below)

3) Start the dev server

```
npm run dev
```

4) Build & preview (optional)

```
npm run build
npm run preview
```

---

## Environment

This app uses Vite and Supabase. Set these variables for the app to work:

Required

- VITE_SUPABASE_URL: Supabase project API URL
- VITE_SUPABASE_ANON_KEY: Supabase anon public key

Where to set

- .env: committed defaults for all environments (safe placeholders)
- .env.local: developer-specific overrides (git-ignored). Put real keys here.

Example .env (checked in)

```
# Safe placeholders – OK to commit
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=REPLACE_ME
```

Example .env.local (not committed)

```
# Real project values – do NOT commit
VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...<trimmed>
```

Windows/WSL

- If using WSL, place env files inside the project folder (e.g., /mnt/c/Users/.../release-notes-search/.env.local)
- After changing env files, restart the dev server so Vite picks them up.

Used in code

- src/lib/supabase/client.ts
- src/config/env.ts

Verify

- In browser devtools Network tab, look for requests to /rest/v1/... – the host should match VITE_SUPABASE_URL.
- 401 errors usually indicate wrong URL/key or pointing to the wrong Supabase project.

---

## Admin Setup

- Access Gate: Admin features are behind a lightweight local gate (password stored in code for internal use). Change it in src/lib/auth/admin.ts
- Release Notes Uploader: Upload .txt or .json, preview parsed versions/items, save to DB, replace existing versions, or preview delete.
- Official Release Manager: Toggle releases as “Official” (quarterly) to highlight them in search results.
- AI Configuration: Enter an OpenRouter API key and choose a model; test the connection. Configuration is stored in the browser’s local storage.

---

## How Users Work With It

- Traditional Search
  1) Type search terms (abbreviations are expanded automatically).
  2) Narrow by component, date range, logic, and sort.
  3) Open Azure DevOps items or copy IDs directly from results.

- AI Assistant (Issue Cross-Check)
  1) Select your current version.
  2) Describe the issue in detail (component, workflow, error state).
  3) Review the highest-confidence matches from newer releases.
  4) If nothing relevant is found, click “Report Bug to QA” to send a prefilled email to QA@datexcorp.com

---

## Troubleshooting

- No results or missing older notes: Only notes on/after 2023-05-19 are indexed. Email QA@datexcorp.com for older information.
- Supabase 401/URL mismatch: Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
- AI toggle disabled: Configure an OpenRouter API key in Admin → AI Configuration.
- Azure link missing: Items without an Azure DevOps ID won’t show a deep link.

---

## Support

For any support or questions about this internal application, contact QA@datexcorp.com

