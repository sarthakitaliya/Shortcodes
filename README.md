# Shortcodes: Emoji & Custom Alias Expander

Shortcodes brings Slack-style emoji and text shortcuts to every input on the web. Type `:fire:` and let it instantly expand into emojis (🔥), text, or links.

## ✨ Features

- **Universal Emoji Support**: Type `:smile:` in **any website input** (Twitter, Gmail, etc.) to instantly convert to 😄.
- **Custom Aliases**: Create your own shortcuts in the popup.
  - **Text**: `:email:` -> `sarthakheree@gmail.com`
  - **Links**: `:portfolio:` -> `https://sxrk.tech`
  - **Templates**: `:intro_dm:` -> "Hi, I'm Sarthak. I'm a full stack developer..."
- **Smart Autocomplete**: A sleek, modern dropdown appears as you type to suggest matching emojis and aliases.

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS (Scoped)
- **Bundler**: Vite + CRXJS
- **Icons**: Lucide React + Smart Favicons (Google API)

## 🚀 Development

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/shortcodes.git
   cd shortcodes
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked**.
4. Select the `dist` folder generated in your project directory.

## 📁 Project Structure

```bash
src/
├── components/          # Shared & UI Components
│   ├── content/         # In-page UI (Autocomplete)
│   ├── popup/           # Extension Popup UI
│   └── Favicon.tsx      # Shared utility
├── content/             # Content Script (Page Logic)
├── popup/               # Extension Entry Point
├── background/          # Service Worker
└── lib/                 # Utilities (Storage, Types)
```

## 📝 Usage

1. **Type a colon (`:`)** followed by characters to trigger the autocomplete dropdown.
2. **Navigate** with `Up`/`Down` arrows.
3. **Select** with `Enter` or `Tab`.
4. **Custom Aliases**: Click the extension icon in your toolbar to add your own shortcuts!

---

*Made with ❤️ for productivity.*
