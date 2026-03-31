# POC Scenario Tool

A Next.js app for visualising POC scenario walkthroughs. Displays steps in a vertical tree flow with branching paths, tool/integration details on hover, persona mapping, and status indicators.

Built for ServiceNow AI Foundry POC engagements, reusable across any scenario.

**Live:** [scenariotool.vercel.app](https://scenariotool.vercel.app)

---

## Quick Start

### View the sample

Go to [scenariotool.vercel.app](https://scenariotool.vercel.app) and click **View Sample Scenario**. No account needed.

### Save and manage scenarios

1. Create an account (email + password, no verification)
2. Click **FILES** tab on the left edge to open the scenario drawer
3. Click **+ New scenario** to create a blank scenario
4. Edit the JSON in the **DATA** panel (left edge)
5. Changes auto-save to the database after 2 seconds

### Share with your team

1. Open the scenario drawer, scroll to **Create a team**
2. Name your team and click Create
3. Click **Manage** next to the team name to get an invite link
4. Share the link. New members join as viewers. Promote to editor as needed.

---

## Features

| Feature | Description |
|---|---|
| **Vertical tree layout** | Phases flow top-to-bottom with numbered step nodes |
| **Branching paths** | Max 2 branches per step with gradient SVG bezier connectors |
| **Branch conditions** | Label at fork point (e.g., "Photo or text?") |
| **Collapsible phases** | Click phase header to collapse/expand |
| **Optional / Automatic steps** | Dashed borders, bolt badges, Auto pills |
| **Tool pill tooltips** | Hover any tool badge to see type and context |
| **Step outputs** | Green pills in expanded view |
| **Status indicators** | Live, Live+Mock, POC New, Agent Logic (configurable) |
| **Persona badges** | Per-step persona with icon and note |
| **Theme toggle** | ServiceNow defaults or custom colour palette |
| **Data editor** | Left-side JSON editor with Apply (Ctrl+Enter) |
| **Presentation mode** | Click-through step-by-step (arrow keys, Escape to exit) |
| **Print-to-PDF** | Expands all steps, opens browser print dialog |
| **JSON import/export** | Load or download scenario JSON files |
| **Supabase auth** | Email + password, no verification |
| **Auto-save** | Changes save to Supabase after 2-second debounce |
| **Teams** | Create teams, invite via link, owner/editor/viewer roles |
| **Inline title editing** | Click scenario title in header to rename |

---

## Tech Stack

- **Next.js 14** (App Router)
- **Supabase** (Auth + Postgres + RLS)
- **Vercel** (hosting)
- **ServiceNow Sans** fonts (woff2)
- No CSS framework (custom CSS)

---

## Local Development

```bash
git clone https://github.com/sylvainservicenow/scenariotool.git
cd scenariotool
npm install
cp .env.local.example .env.local
# Add your Supabase URL and anon key to .env.local
npm run dev
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Set in Vercel project settings and `.env.local` for local dev.

---

## JSON Schema

See the full schema in the [v2 spec](./POC_Scenario_Tool_v2_Spec.md) or the `scenario_data.json` sample file.

Required fields: `title`, `phases` (array), `statusLabels` (object).

---

## Deployment

Push to `main`. Vercel auto-deploys. Make sure environment variables are set in the Vercel project settings.
