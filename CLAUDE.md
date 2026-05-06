# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Shortcodes** is a Chrome extension that brings Slack-style emoji and text shortcuts to every input on the web. Type `:fire:` and it expands to emojis (🔥), or custom aliases can expand to text, links, or templates.

## Commands

```bash
# Install dependencies
npm install

# Build the extension (TypeScript + Vite)
npm run build

# Development mode with watch
npm run dev

# Rebuild emoji data from emojibase-data
npm run build:emojis
```

## Loading in Chrome

1. Build the extension with `npm run build`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `dist` folder

## Architecture

### Extension Components

- **Content Script** (`src/content/`): Injected into all pages, handles shortcode detection and text replacement. Uses MutationObserver to attach listeners to all text inputs dynamically.
- **Popup** (`src/popup/`): Extension popup UI for managing custom aliases and preferences.
- **Background** (`src/background/`): Service worker for extension lifecycle (minimal logic, primarily storage lives in `src/lib/storage.ts`).

### Key Source Directories

- `src/lib/` - Shared utilities: storage.ts (chrome.storage wrapper), aliasTypes.ts (TypeScript interfaces)
- `src/data/` - Generated emoji data (emojis.ts), built from emojibase-data
- `src/components/content/` - Autocomplete dropdown React component
- `src/components/popup/` - Popup UI components (AliasForm, Popup)
- `src/styles/` - Tailwind CSS: content.css (scoped to in-page dropdown), popup.css (popup styles)

### Data Flow

1. Content script loads on every page via manifest.json
2. Detects shortcode patterns using `TextReplacer.detectPattern()` in text inputs
3. Searches emoji data + custom aliases from chrome.storage
4. Shows React-based Autocomplete dropdown
5. On selection/trigger key, replaces shortcode with expanded value

### Storage Schema

Uses chrome.storage API with keys:
- `customAliases`: User-created aliases (CustomAlias[])
- `emojiOverrides`: User overrides for default emoji values
- `preferences`: User settings (enabled, showAutocomplete, triggerKeys, maxSuggestions)

### Type Definitions

All types in `src/lib/aliasTypes.ts`:
- `AliasType` = 'emoji' | 'text' | 'link' | 'file' | 'template'
- `CustomAlias` / `EmojiAlias` interfaces
- `UserPreferences` with defaults in `DEFAULT_PREFERENCES`

## Tech Stack

- React 18 + TypeScript
- Vite 5 + CRXJS (Chrome Extension build plugin)
- Tailwind CSS 3.4 (custom theme colors: shortcode-bg, shortcode-surface, shortcode-accent)
- Lucide React (icons)
- emojibase-data (emoji source data)
