# Document Viewer — Document Reader for Windows

A clean, distraction-free PDF reader for Windows, faithfully inspired by GNOME's minimalist aesthetics. Built for speed, minimalism, and a truly native feel.

## Features

### Core Reading Experience
- **Continuous multi-page scrolling** — all pages rendered vertically, just like a real document viewer
- **Crisp Headless PDF.js rendering** — renders directly to canvas via Web Worker with full high-DPI scaling support
- **Smart zoom** — Ctrl+scroll wheel, Ctrl+=/-/0, or circular overlay zoom controls
- **Selectable Text (OCR)** — full text layer rendering for highlighting, copying, and pasting
- **Clickable Links** — native support for embedded document hyperlinks and external URLs
- **Page tracking** — scroll position automatically updates the current page counter
- **Editable page input** — click the page number in the headerbar and jump to any page

### GNOME-Inspired Design Language
- **Frameless window** — custom curved corners, transparent background, and no standard Windows chrome
- **Sleek split headerbar** — slimmed down top bar blending app controls and document info
- **Dark Mode Support** — full system-wide dark theme toggle, persisted across sessions
- **Custom Application Icon** — bespoke, minimal icon integration for the executable and taskbar
- **Native corner masking** — flawless anti-aliased border radius rendering using custom CSS compositing
- **GNOME thin scrollbars** — overlay-style with rounded thumb
- **Inter typography** — clean, professional font matching modern design standards

### Sidebar with 4 Tabs
- **Thumbnails** — real canvas-rendered page previews with accent borders on the current page
- **Outline** — extracts and renders actual PDF bookmarks/table of contents
- **Annotations** — placeholder (future feature)
- **Bookmarks** — placeholder (future feature)

### Native Window Gestures
- **Drag** — custom drag region on the headerbar
- **Double-click headerbar** — toggle maximize (automatically squares corners to fit screen)
- **Drag & drop** — drop any PDF onto the window to open it (with visual dashed-border feedback)
- **Minimize / Close** — native hovering window controls

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open file |
| `Ctrl+=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Fit to width |
| `Ctrl+Scroll` | Smooth zoom |
| `F11` | Toggle fullscreen |
| `F9` | Toggle sidebar |

## Tech Stack
- **Framework:** Tauri v2 (Rust backend + Edge WebView2)
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v3
- **Rendering:** PDF.js (Mozilla)

## Getting Started

### Prerequisites
- Node.js (v18+)
- Rust toolchain
- Visual Studio C++ Build Tools (Windows)

### Development
```bash
npm install
npm run tauri dev
```

### Production Build
```bash
npm run tauri build
```
Installer output: `src-tauri/target/release/bundle/nsis/`

## Roadmap
- [ ] Text search within documents (`Ctrl+F`)
- [ ] Annotation creation and persistence
- [ ] Bookmark saving
- [ ] Print support
- [ ] Recent files history
