# unclutter — Save now, read beautifully later

A minimal, local-first Chrome extension to save pages and revisit them from a clean, searchable dashboard. No servers, no accounts, all data on your device.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-yellow.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Development (HMR)](#development-hmr)
  - [Build and Load Unpacked](#build-and-load-unpacked)
  - [Preview (optional)](#preview-optional)
- [Usage](#usage)
  - [Save via context menu or shortcut](#save-via-context-menu-or-shortcut)
  - [Dashboard: tabs, search, bookmarks, tags](#dashboard-tabs-search-bookmarks-tags)
  - [Options and theme](#options-and-theme)
- [Permissions & Privacy](#permissions--privacy)
- [Architecture](#architecture)
  - [Background](#background)
  - [Dashboard](#dashboard)
  - [Options](#options)
  - [Data storage (IndexedDB)](#data-storage-indexeddb)
  - [Build (Vite + CRXJS)](#build-vite--crxjs)
- [Data Model (SavedItem)](#data-model-saveditem)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Theming](#theming)
- [Packaging](#packaging)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Features

- Save the current page with metadata (title, description, favicon, image) for later.
- Dashboard with tabs — New, Viewed, Bookmarked — plus counts and search.
- Toggle bookmarks per item (star on each card).
- Tagging (beta): AND/OR tag filters, inline tag editing with suggestions; can be toggled in Options.
- Light/dark themes with system-aware default.
- Local-first: everything is stored in your browser.

## Quick Start

### Prerequisites

- Node >= 18
- npm

### Install

```bash
npm install
```

### Development (HMR)

```bash
npm run dev
```

Then load the extension in Chrome:

- Open `chrome://extensions`
- Enable Developer Mode
- Click “Load unpacked” → select the project root (this enables MV3 service worker + HMR via CRXJS)

### Build and Load Unpacked

```bash
npm run build
```

- Output appears in `dist/`
- In `chrome://extensions`, click “Load unpacked” → select `dist/`

### Preview (optional)

Serve built HTML entries for inspection:

```bash
npm run preview
```

Note: Preview serves the HTML pages; the MV3 service worker still needs to be loaded via `dist/` in `chrome://extensions` for full extension behavior.

## Usage

### Save via context menu or shortcut

- Right-click a page or link → “Save to unclutter”
- Or use the command shortcut:
  - Default: Ctrl+Shift+S
  - Mac: Command+Shift+S

### Dashboard: tabs, search, bookmarks, tags

- Tabs: New (unread), Viewed (done), Bookmarked (starred)
- Search across title/URL
- Toggle bookmark via the star button
- Tag filters: switch AND/OR mode; click tags to filter; clear filters via button
- Inline tag editing: add/remove tags on a card; suggestions appear as you type

### Options and theme

- Options page: toggle “Enable tagging (beta)”
- Theme: toggle light/dark from Dashboard and Options headers

## Permissions & Privacy

From `manifest.json`:

- `tabs`, `activeTab`: read active tab URL/title for saves
- `scripting`: run a small content script to extract page metadata
- `storage`: store feature flags (e.g., `enableTags`) locally
- `alarms`: reserved for future reminders
- `notifications`: optionally confirm saves via a notification
- `contextMenus`: add “Save to unclutter” to the right-click menu
- `host_permissions: <all_urls>`: access current tab URL for saves

Privacy: All data is stored locally in IndexedDB. There are no network calls or servers. Notifications are optional.

## Architecture

### Background

- MV3 service worker in `src/background` handles:
  - Context menu and keyboard command
  - Metadata extraction via `chrome.scripting.executeScript`
  - Creation of `SavedItem` entries
  - Opening the Dashboard

### Dashboard

- React app in `src/dashboard` renders saved items with tabs, search, bookmarking, and tag filtering/editing.
- Reads directly from IndexedDB via a small data layer.

### Options

- React app in `src/options` exposes feature toggles (e.g., tagging) and theme control.

### Data storage (IndexedDB)

- Implemented via `idb` wrapper in `src/db/db.ts`
- Object stores:
  - `items` with indexes for status, savedAt, category, domainHash, tag (multiEntry), bookmarked
  - `settings`

### Build (Vite + CRXJS)

- Vite project with `@crxjs/vite-plugin` for MV3
- `npm run dev` enables HMR; `npm run build` outputs `dist/`

### Paths

- `src/background` — service worker
- `src/dashboard` — dashboard app (React)
- `src/options` — options app (React)
- `src/db` — IndexedDB layer (`db.ts`)
- `src/utils` — helpers for URL/date
- `src/lib` — theme and class utilities
- `src/styles` — CSS

## Data Model (SavedItem)

Key fields used across the UI:

```ts
id: string
url: string
title: string
status: "unread" | "in_progress" | "done"
savedAt: number
bookmarked: boolean
tags: string[]
```

Notes:

- Tagging can be toggled from Options.
- Tag counts are computed using an index when available, with safe fallbacks.

## Keyboard Shortcuts

- Save current page: `save-current-page`
  - Default: Ctrl+Shift+S
  - Mac: Command+Shift+S

## Theming

- Light/dark theme persisted with `localStorage` key `unclutter.theme`
- If unset, theme follows system `prefers-color-scheme`

## Packaging

1. Build the extension:

```bash
npm run build
```

2. Zip the `dist/` directory for distribution or Web Store upload. Keep any private keys out of version control.

## Troubleshooting

- Extension not loading in dev: reload in `chrome://extensions`; confirm `npm run dev` is running.
- Save fails: verify permissions are granted; reload the page/extension.
- Notifications not shown: notifications permission may be ungranted; saving still works.
- Tags/filters missing: enable “tagging (beta)” in Options or ensure items have tags.
- Dashboard not updating after tag changes: wait a moment or toggle filters; the UI recomputes from IndexedDB.
- Shortcut not working: check `chrome://extensions/shortcuts` for conflicts.

## Contributing

We welcome contributions from the community.

### Reporting Bugs

- Search [existing issues](../../issues) before opening a new one
- Include steps to reproduce, expected vs. actual behavior, and browser version
- Attach console logs or screenshots if relevant

### Submitting Pull Requests

1. Fork the repository and create a feature branch
2. Run `npm run lint` and `npm run typecheck` before committing
3. Write clear commit messages describing the change
4. Open a PR against `main` with a description of what and why

### Code Guidelines

- TypeScript throughout; keep changes small and focused
- Reuse existing UI primitives; avoid external UI libraries
- No schema or permission changes without discussion
- Run tests with `npm test` before submitting

## Security

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue
2. Email the maintainers directly or use GitHub's private vulnerability reporting
3. Include a description of the issue, steps to reproduce, and potential impact

We will acknowledge receipt and work to address the issue promptly.

## License

This project is licensed under the ISC License — see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Built with TypeScript, React, Vite, and CRXJS
- IndexedDB via [idb](https://github.com/jakearchibald/idb)
