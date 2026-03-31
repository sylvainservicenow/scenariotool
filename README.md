# POC Scenario Tool

A self-contained, single-page HTML tool for visualising POC scenario walkthroughs. Displays steps in a vertical tree flow with branching paths, tool/integration details on hover, persona mapping, and status indicators.

Built for ServiceNow AI Foundry POC engagements, reusable across any scenario.

**Live:** [sylvainservicenow.github.io/scenariotool](https://sylvainservicenow.github.io/scenariotool/)

---

## Quick Start

### Option 1: GitHub Pages (hosted)

1. Go to [sylvainservicenow.github.io/scenariotool](https://sylvainservicenow.github.io/scenariotool/)
2. Drop a `scenario_data.json` file onto the landing page (or click to browse)
3. Alternatively, click **Try Sample** to load the included Rose Apples scenario

### Option 2: Standalone HTML (offline)

1. Open the hosted tool and load your scenario
2. Open the **Editor** panel and click **Export HTML**
3. The downloaded `.html` file is fully self-contained (fonts, data, code) and works offline, on SharePoint, or anywhere a browser can open an HTML file

### Option 3: Local development

```bash
git clone https://github.com/sylvainservicenow/scenariotool.git
cd scenariotool
# Open index.html in a browser. No build step required.
```

---

## Features

| Feature | Description |
|---|---|
| **Vertical tree layout** | Phases flow top-to-bottom with numbered step nodes |
| **Branching paths** | Max 2 branches per step with SVG bezier connectors |
| **Branch conditions** | `"condition"` field renders a label at the fork point |
| **Optional steps** | Dashed borders, hollow node, "Optional" badge |
| **Automatic steps** | Purple bolt badge, "Auto" pill |
| **Tool pill tooltips** | Hover any tool badge to see type and context |
| **Step outputs** | Green pills in expanded view showing step outputs |
| **Status indicators** | Live, Live+Mock, POC New, Agent Logic (configurable) |
| **Persona badges** | Per-step persona with icon and optional note |
| **Data sources** | Mock sources (containing 🔶) highlighted in orange |
| **Separate workflows** | Phases with `"separate": true` render below a divider |
| **Theme toggle** | ServiceNow defaults or fully custom colour palette |
| **Data editor** | Slide-out JSON editor with Apply (Ctrl+Enter), Import, Export |
| **Presentation mode** | Click-through step-by-step walkthrough with keyboard controls |
| **Print-to-PDF** | Expands all steps and opens browser print dialog |
| **Export standalone HTML** | Generates a self-contained file with data baked in |
| **localStorage persistence** | Edits persist across browser refreshes |

---

## Presentation Mode

Click **▶ Present** in the header.

| Key | Action |
|---|---|
| → or Space | Expand next step |
| ← | Collapse current step, go back |
| Escape | Exit presentation mode |

Step counter displays in the bottom-right corner. No auto-play timer.

---

## JSON Schema

```json
{
  "title": "string (required)",
  "subtitle": "string",
  "label": "string (small text above title)",
  "notes": "string (rendered at bottom)",

  "theme": {
    "fontMain": "ServiceNow Sans",
    "fontMono": "ServiceNow Mono",
    "headerBg1": "#032D42",
    "headerBg2": "#054A6E",
    "headerAccent": "#63DF4E",
    "toolPillBg": "rgba(82,184,255,0.12)",
    "toolPillColor": "#035D99",
    "toolPillBorder": "rgba(82,184,255,0.3)",
    "tooltipBg": "#032D42",
    "tooltipAccent": "#63DF4E",
    "pageBg": "#F5F7FA",
    "cardBg": "#FFFFFF",
    "cardBorder": "#E4E8ED",
    "textPrimary": "#032D42",
    "textSecondary": "#4A5568",
    "textMuted": "#8896A6"
  },

  "statusLabels": {
    "<key>": {
      "label": "string",
      "color": "string (CSS colour)"
    }
  },

  "phases": [
    {
      "phase": "string (required)",
      "color": "string (CSS colour, required)",
      "icon": "string (emoji)",
      "separate": false,
      "steps": [
        {
          "id": "number or string (required)",
          "title": "string (required)",
          "summary": "string",
          "details": "string (shown expanded)",
          "persona": "string",
          "personaIcon": "string (emoji)",
          "personaNote": "string",
          "optional": false,
          "automatic": false,
          "liveStatus": "string (key from statusLabels)",
          "url": "string (shown as link in expanded view)",
          "tools": [
            {
              "name": "string (required)",
              "type": "string (tooltip header)",
              "note": "string (tooltip body)"
            }
          ],
          "dataSources": ["string (🔶 suffix = mocked)"],
          "outputs": ["string (green pills in expanded view)"],
          "condition": "string (at fork point, only with branches)",
          "branches": [
            {
              "label": "string",
              "icon": "string (emoji)",
              "steps": ["(recursive step schema)"]
            }
          ]
        }
      ]
    }
  ]
}
```

### Colour Rules

- No red (`#FF0000`) in the default palette. Red is reserved for errors.
- Default status colours: Live `#81B532`, Live+Mock `#CF4A00`, POC New `#52B8FF`, Agent Logic `#7661FF`
- Automatic step accent: `#7661FF`
- Output pills: background `#DEFFD9`, text `#005F1E`
- Errors/parse states: `#CF4A00` (orange, not red)

---

## Files

| File | Purpose |
|---|---|
| `index.html` | GitHub Pages tool. Landing page + full app. Fonts embedded, no data embedded. |
| `scenario_data.json` | Rose Apples sample scenario. Example starting point for new POCs. |
| `README.md` | This file. |

---

## Deployment

This repo is configured for GitHub Pages. Push to `main` and the site deploys to `sylvainservicenow.github.io/scenariotool/`.

No build tools, no dependencies beyond CDN-loaded React 18 + Babel.

---

## Creating a New Scenario

1. Copy `scenario_data.json` as a starting point
2. Edit the JSON (or use the in-app editor)
3. Required fields: `title`, `phases` (array), `statusLabels` (object)
4. Each phase needs: `phase` (name), `color`, `steps` (array)
5. Each step needs: `id`, `title`
6. Load your JSON file on the landing page

---

## Technology

- React 18 (CDN, no build)
- Babel standalone (CDN, JSX transformation)
- ServiceNow Sans fonts (embedded as base64 woff2, falls back to Arial)
- Pure CSS (no framework)
- localStorage for persistence
