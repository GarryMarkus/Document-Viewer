# Document Viewer

A fast, elegant, and distraction-free PDF reader for Windows, faithfully inspired by GNOME Papers' minimalist Libadwaita aesthetics. Built with Tauri v2 for native performance.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20x64-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### Core Reading Experience
- **Continuous Scrolling** — Seamless vertical multi-page scrolling, toggleable from the View menu or `C` key.
- **Dual Page Mode** — Side-by-side book-style reading, toggleable from the View menu or `D` key.
- **Document Rotation** — Rotate documents in 90° increments (`Ctrl+Arrow`).
- **Smart Zoom** — `Ctrl+Scroll Wheel`, `Ctrl+=/-/0`, or the floating overlay zoom controls. Debounced rendering ensures smooth, lag-free zooming.
- **Selectable Text** — Full text layer rendering for highlighting, copying, and pasting.
- **Clickable Links** — Native support for embedded hyperlinks and external URLs.
- **Page Tracking & Navigation** — Scroll position auto-updates the page counter. Click the page number to jump to any page.
- **Crisp PDF.js Rendering** — Renders via Web Worker with high-DPI support (capped at 2× for performance).
- **Offline Engine** — Fully bundles standard fonts, CMaps, and WASM decoders (JBIG2/JPEG2000) for flawless offline rendering.

### GNOME-Inspired Design
- **Libadwaita Aesthetic** — Inspired by GNOME Papers with a faithful recreation of the Adwaita color palette, typography, and spacing.
- **Frameless Window** — Custom titlebar with native Windows 11 DWM composited rounded corners.
- **Split Headerbar** — Slim top bar with app controls, centered title, and page indicator pill.
- **Dark & Light Mode** — Toggle between themes with full UI adaptation, including dynamic window icon switching.
- **Animated Sidebar** — Smooth 300ms slide animation for sidebar toggle with synchronized headerbar.
- **Thin Scrollbars** — Overlay-style rounded scrollbar thumbs for a minimal feel.
- **Document Properties** — Adwaita-styled modal displaying PDF metadata (Title, Author, Creator, etc.).
- **Keyboard Shortcuts Dialog** — Full shortcuts reference accessible from the app menu.

### Performance
- **Virtualized Rendering** — Lazy-loading via `IntersectionObserver`. Only visible pages are rendered, enabling instant scrolling through 1000+ page documents.
- **Debounced Zoom** — CSS-based instant visual feedback with delayed high-quality re-render for buttery smooth zooming.
- **Throttled Scroll Detection** — Page tracking uses `requestAnimationFrame` to prevent layout thrashing.
- **DPR Capping** — Pixel ratio capped at 2× to balance crispness and rendering speed.
- **GPU Acceleration** — Canvas area uses `will-change` and optimized scroll hints.

### OS Integration
- **File Associations** — Registers as a PDF viewer during installation.
- **Double-click to Open** — Native Windows integration loads PDFs launched from File Explorer.
- **Drag & Drop** — Drop any PDF onto the window to open it, with visual dashed-border feedback.

### Sidebar
- **Thumbnails** — Lazy-loaded canvas-rendered page previews with accent ring on the active page.
- **Outline** — Renders PDF bookmarks/table of contents for structural navigation.
- **Bottom Tab Bar** — GNOME-style segmented control for switching between views.

### Window Controls
- **Drag Region** — Headerbar allows fluid window movement.
- **Double-click Maximize** — Double-click the headerbar to toggle maximize.
- **GNOME-style Controls** — Minimize, Maximize, and Close buttons with circular styling.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open file |
| `Ctrl+=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Reset zoom |
| `Ctrl+Scroll` | Smooth zoom |
| `Ctrl+Right` | Rotate right 90° |
| `Ctrl+Left` | Rotate left 90° |
| `F11` | Toggle fullscreen |
| `F9` | Toggle sidebar |
| `C` | Toggle continuous mode |
| `D` | Toggle dual page mode |

## Tech Stack

- **Framework:** Tauri v2 (Rust backend + Edge WebView2)
- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v3 with custom Adwaita palette
- **Rendering:** PDF.js (Mozilla) v6+

## Getting Started

### Prerequisites
- Node.js (v18+)
- Rust toolchain
- Visual Studio C++ Build Tools (Windows)

### Development
```bash
git clone https://github.com/GarryMarkus/Document-Viewer.git
cd Document-Viewer
npm install
npm run tauri dev
```

### Production Build
```bash
npm run tauri build
```

Output files:
- **Portable:** `src-tauri/target/release/document_viewer.exe`
- **MSI Installer:** `src-tauri/target/release/bundle/msi/Document Viewer_2.0.0_x64_en-US.msi`
- **EXE Installer:** `src-tauri/target/release/bundle/nsis/Document Viewer_2.0.0_x64-setup.exe`

## Known Issues

- **Cargo version mismatch** — `Cargo.toml` still reports `1.2.0` while `tauri.conf.json` and `package.json` are at `2.0.0`. This is cosmetic and does not affect functionality.
- **Text layer alignment** — At extreme zoom levels (>5×), the transparent text selection layer may drift slightly from the rendered canvas.
- **Large PDF initial load** — Documents with 500+ pages may take a few seconds for the initial outline resolution pass.
- **Annotation layer** — Some complex annotation types (forms, widgets) are not fully supported; only links are interactive.

## Roadmap

- **Search** — In-document text search (`Ctrl+F`) with GNOME-styled search bar and highlighting.
- **Annotations** — Highlighting, underlining, and note creation.
- **Bookmarks** — User-defined bookmarks and custom navigation.
- **Recent Files** — History list on launch screen.
- **Presentation Mode** — Fullscreen paginated slideshow view.

## License

MIT
