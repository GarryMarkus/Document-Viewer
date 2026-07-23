# Document Viewer — Document Reader for Windows

A clean, distraction-free PDF reader for Windows, faithfully inspired by GNOME's minimalist aesthetics. Built for speed, minimalism, and a truly native feel.

## Features

### Core Reading Experience
- **Continuous Multi-Page Scrolling** — Seamless vertical scrolling, toggleable from the View Menu.
- **Dual Page Mode** — Read like a book with side-by-side page rendering.
- **Document Rotation** — Instantly rotate documents in 90-degree increments natively.
- **Crisp Headless PDF.js Rendering** — Renders directly to canvas via Web Worker with full high-DPI scaling support.
- **Offline Rendering Engine** — Fully embeds standard PDF fonts, character maps (CMaps), and WASM decoders (JBIG2/JPEG2000) for flawless offline rendering of complex documents without relying on external CDNs.
- **Smart Zoom** — Use `Ctrl` + Scroll Wheel, `Ctrl` + `=/-/0`, or the sleek circular overlay zoom controls on the canvas.
- **Selectable Text (OCR)** — Full text layer rendering for highlighting, copying, and pasting.
- **Clickable Links** — Native support for embedded document hyperlinks and external URLs.
- **Native Print** — Full document printing integration seamlessly hooked up.
- **Page Tracking & Navigation** — Scroll position automatically updates the current page counter. Click the page number in the headerbar to manually jump to any page.

### GNOME-Inspired Design Language
- **Frameless Window** — Custom titlebar with native Windows 11 DWM GPU-composited rounded corners.
- **Sleek Split Headerbar** — Slimmed down top bar blending app controls and document info.
- **Dark & Light Mode Support** — Toggle between themes natively with UI dynamically updating its aesthetics.
- **Dynamic Application Icon** — Runtime executable icon dynamically switches to match the active system theme (Dark/Light).
- **Document Properties Modal** — Clean Adwaita-styled properties dialog detailing PDF metadata (Title, Author, Creator, Page Count).
- **GNOME Thin Scrollbars** — Overlay-style with rounded thumbs for a minimal, unintrusive feel.
- **Premium Typography** — Clean, professional font usage matching modern UI standards.

### Engine & Performance
- **Virtualization Engine** — True lazy-loading via `IntersectionObserver`. Only visible pages and thumbnails are rendered in memory, allowing instant scrolling through massive 1000+ page textbooks without lag.
- **Asset Auto-Bundling** — Heavy static assets (like WASM binaries and fonts) are efficiently resolved during installation without bloating the repository.

### OS Integration
- **Native File Associations** — Automatically registers as a PDF viewer during installation.
- **Deep-linking / Double-click** — Native Windows integration captures startup arguments to instantly load PDFs launched directly from the File Explorer.

### Sidebar Functionality
- **Thumbnails** — Real canvas-rendered page previews with accent borders highlighting the currently viewed page.
- **Outline** — Extracts and renders actual PDF bookmarks/table of contents for swift structural navigation.

### Native Window Gestures
- **Custom Drag** — Drag region on the headerbar allows fluid window movement.
- **Double-Click Headerbar** — Toggle maximize (automatically squares corners to fit the screen).
- **Drag & Drop** — Drop any PDF onto the window to instantly open it, complete with visual dashed-border feedback.
- **Native Controls** — Seamlessly integrated Minimize, Maximize, and Close hover controls pinned to the top right.

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open file |
| `Ctrl+=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Fit to width |
| `Ctrl+Scroll` | Smooth zoom |
| `Ctrl+P` | Print document |
| `Ctrl+Right` | Rotate Right 90° |
| `Ctrl+Left` | Rotate Left 90° |
| `F11` | Toggle fullscreen |
| `F9` | Toggle sidebar |

## Tech Stack
- **Framework:** Tauri v2 (Rust backend + Edge WebView2)
- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v3
- **Rendering:** PDF.js (Mozilla) v6+

## Getting Started

### Prerequisites
- Node.js (v18+)
- Rust toolchain
- Visual Studio C++ Build Tools (Windows)

### Development
1. Clone the repository.
2. Install dependencies (this will automatically trigger the `postinstall` script to bundle PDF assets).
```bash
npm install
npm run tauri dev
```

### Production Build
```bash
npm run tauri build
```
Installer output: `src-tauri/target/release/bundle/nsis/Document Viewer_1.2.0_x64-setup.exe`

## Future Scopes & Roadmap
- **Search Engine** — In-document text search (`Ctrl+F`) with a slide-down GNOME-styled search bar and text highlighting.
- **Annotations** — Creation, highlighting, and persistence of custom annotations.
- **Custom Bookmarks** — Bookmark saving and custom tables of contents.
- **Recent Files** — History list of recently opened files upon launch.
- **Presentation Mode** — Fullscreen paginated view.
