# Modern Chrome Extension with React + Vite + TypeScript

A modern Chrome extension built with **React 18**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Headless UI** that adds a floating icon to the bottom-right corner of web pages.

## 🚀 Features

- **Modern Tech Stack**: React 18, Vite, TypeScript, Tailwind CSS
- **Floating Icon**: Beautiful floating action button in bottom-right corner
- **Interactive Menu**: Click to expand with sharing, bookmarking, and print options
- **Responsive Design**: Tailwind CSS with smooth animations
- **Chrome Extension APIs**: Bookmarks, storage, and tab management
- **Fast Development**: Hot Module Replacement (HMR) with Vite

## 🛠️ Tech Stack

| Purpose | Technology |
|---------|------------|
| Framework | Vite + React 18 |
| Language | TypeScript |
| UI Library | Tailwind CSS + Headless UI |
| Build Tool | CRXJS Vite Plugin |
| Extension API | Chrome Extension Manifest V3 |

## 📁 Project Structure

```
extension/
├── src/
│   ├── background/          # Service worker
│   │   └── background.ts
│   ├── content/            # Content script (injected into pages)
│   │   ├── content.tsx
│   │   ├── FloatingIcon.tsx
│   │   └── content.css
│   └── popup/              # Extension popup
│       ├── popup.html
│       ├── popup.tsx
│       ├── PopupApp.tsx
│       └── popup.css
├── icons/                  # Extension icons
├── manifest.json          # Chrome extension manifest
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind CSS config
└── package.json           # Dependencies
```

## 🚦 Getting Started

### Prerequisites

- Node.js 16+ and npm
- Chrome browser

### Installation

1. **Install dependencies:**
   ```bash
   cd extension
   npm install
   ```

2. **Build the extension:**
   ```bash
   npm run build
   ```

3. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Development

Run with hot reload during development:

```bash
npm run dev
```

## 🎯 How It Works

### Content Script
- Injects a React component into every web page
- Creates a floating icon in the bottom-right corner
- Uses Tailwind CSS for styling with page isolation

### Floating Icon Features
- **Share**: Native Web Share API with clipboard fallback
- **Bookmark**: Adds current page to Chrome bookmarks
- **Print**: Triggers browser print dialog
- **Expandable Menu**: Smooth animations with Headless UI

### Popup Interface
- Toggle extension on/off
- View current page URL
- Settings and controls

## 🔧 Configuration

### Tailwind CSS
The extension uses Tailwind CSS with proper isolation to prevent conflicts with host page styles.

### CRXJS Plugin
Uses the CRXJS Vite plugin for seamless Chrome extension development with:
- Hot module replacement
- Automatic manifest handling
- TypeScript support

## 📦 Building for Production

```bash
npm run build
```

The built extension will be in the `dist/` folder, ready for:
- Local testing
- Chrome Web Store submission

## 🎨 Customization

### Styling
- Modify `src/content/FloatingIcon.tsx` for icon appearance
- Update Tailwind classes in components
- Customize colors in `tailwind.config.js`

### Functionality
- Add new menu items in `FloatingIcon.tsx`
- Extend background script for more Chrome APIs
- Modify popup interface in `PopupApp.tsx`

## 🌐 Browser Support

- Chrome 88+ (Manifest V3)
- Chromium-based browsers (Edge, Brave, etc.)

## 📄 License

MIT License - feel free to use for your projects!

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

**Built with modern web technologies for the best developer experience! 🚀** 