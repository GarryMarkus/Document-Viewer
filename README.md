# Docs Reader

A high-performance, offline desktop document reader for Windows created by **GarryMarkus**, built with **Tauri v2**, **React 19**, and **TypeScript**. Features a modern WinUI 3 Fluent design inspired by Stitch design specifications, supporting **PDF, DOCX, XLSX, and PPTX** documents with buttery smooth 60–120 fps continuous scrolling, a high-contrast Zed "One Dark" theme, multi-tab browsing, and zero telemetry.

![Version](https://img.shields.io/badge/version-3.2.1-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20x64-lightgrey)
![Offline](https://img.shields.io/badge/offline-100%25-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 Key Capabilities

### 1. Multi-Format Offline Rendering
Completely self-contained with zero dependencies on Microsoft Office or LibreOffice:
- **PDF (`.pdf`)**: Continuous virtual scroll rendered via PDF.js Web Worker + OffscreenCanvas, selectable text layer, and clickable hyperlinks.
- **DOCX (`.docx`, `.doc`)**: Faithful typography, headings outline, word count metrics, and pagination rendered via `docx-preview`.
- **XLSX (`.xlsx`, `.xls`, `.csv`)**: High-performance HTML5 Canvas virtual grid engine supporting 100k+ rows with frozen column headers (`A..Z`), frozen row headers (`1..N`), formula bar (`fx`), active cell inspector, and multi-sheet tab switcher.
- **PPTX (`.pptx`, `.ppt`)**: Fast OpenXML zip parser rendering 16:9 responsive slide canvases into the virtual scroll frame and dedicated full-screen Presentation Mode (`F5`) with speaker notes popover.

### 2. Multi-Tab Document Workspace
- **Concurrent Tabs**: Open multiple PDF, DOCX, XLSX, and PPTX documents side by side in the title bar tab strip.
- **Instantaneous Tab Switching**: Independent scroll offsets, zoom levels, rotation, and navigation state are preserved per tab without reloading or re-rendering.
- **Background Conversion Queue**: Heavy Office conversions execute on background Rust worker threads with deterministic content caching and in-flight deduplication.
- **Per-Tab Progress & Cancellation**: Real-time percentage progress indicators on tabs during conversion; closing a tab immediately cancels in-flight jobs.

### 3. High-Frame-Rate Virtual Scroll Engine
- **Pre-Calculated Row Layout**: Exact page heights and coordinates are reserved up front, ensuring **0 Cumulative Layout Shift (CLS)** and zero scroll jumps.
- **Directional Overscan**: Pre-renders pages 1.5 viewport heights ahead of the user's scroll direction.
- **Debounced Zooming**: Immediate CSS scaling during rapid `Ctrl+Wheel` and pinch zoom with debounced sharp re-rendering.
- **FPS & Frame-Time HUD**: Real-time FPS, 1% Low frame time, and automated scroll benchmark runner (`Ctrl+Shift+D`).

### 4. Zed "One Dark" Design & WCAG AA Contrast
- **Layered Blue-Grey Surfaces**: App background (`#282C33`), sidebar and panels (`#2F343E`), and chrome toolbar/tab bar (`#3B414D`).
- **Full WCAG AA/AAA Contrast**: Primary text ($\ge 7:1$), secondary metadata text ($\ge 4.5:1$ on all states including hover/active), search placeholders ($\ge 4.5:1$), and vibrant format chips.
- **Dim Pages Toggle**: Optional toolbar switch applying a gentle luminance filter (`brightness(0.90)`) to soften stark white document sheets against dark backgrounds without inverting colors or graphics.
- **Seamless Light Mode**: Native WinUI 3 Fluent light theme preserved untouched.

### 5. In-Document Search & Text Highlighting
- **Floating Find Bar (`Ctrl+F`)**: Acrylic backdrop HUD with match counter (`X of Y matches`), Next (`Enter` / `F3`), Previous (`Shift+Enter` / `Shift+F3`), and Match Case toggle (`Aa`).
- **DOM & Canvas Highlighting**: Vibrant highlight tags across PDF text layers, Word sections, PowerPoint slides, and Excel grid cells, with dedicated active-match highlighting.

### 6. Navigation & Outlines
- **Slide Deck & Page Thumbnails**: Real-time thumbnail previews in `NavigationDrawer` (16:9 for presentations, portrait for documents).
- **Headings & Outline Map**: Filterable table of contents for PDF bookmarks, Word headings, and presentation slide decks.
- **Persistent Bookmarks**: One-click page bookmarking with quick jump navigation.
- **Recent Files List**: Local persistence tracking file size, last opened timestamp, and last viewed page.

### 7. Desktop Polish & Windows Integration
- **Zero Console Flash**: All helper utilities spawn with `CREATE_NO_WINDOW` and clean job-object cleanup on app exit.
- **Drag-and-Drop**: Drop single or multiple files directly onto the window or tab bar to open them.
- **File Associations**: Native Windows shell integration for `.pdf`, `.docx`, `.xlsx`, and `.pptx`.
- **Clean Print Styling (`Ctrl+P`)**: Dedicated print stylesheet stripping window chrome and formatting clean document pages.

---

## ⌨️ Standard Keyboard Shortcuts & Mouse Gestures

Docs Reader adheres to universal Windows, browser, and document reader conventions—ensuring zero learning curve:

### Multi-Tab Management
| Shortcut / Gesture | Action |
|--------------------|--------|
| `Ctrl + W` / `Ctrl + F4` | Close active document tab |
| `Ctrl + T` / `Ctrl + O` | New tab / Open document dialog |
| `Ctrl + Tab` / `Ctrl + PageDown` | Cycle to next tab (with wrap-around) |
| `Ctrl + Shift + Tab` / `Ctrl + PageUp` | Cycle to previous tab (with wrap-around) |
| `Ctrl + 1` through `Ctrl + 8` | Directly switch to tab 1 through 8 |
| `Ctrl + 9` | Directly switch to the last tab |
| `Middle-Click Tab` | Close tab under cursor |

### Navigation & Reading
| Shortcut / Gesture | Action |
|--------------------|--------|
| `Space` | Scroll down one screen (85% viewport in continuous scroll; next page in single/dual view) |
| `Shift + Space` | Scroll up one screen (85% viewport; previous page in single/dual view) |
| `PageDown` / `PageUp` | Next / Previous page or viewport block |
| `Home` / `End` | Jump to first / last page |
| `Ctrl + Home` / `Ctrl + End` | Instant scroll to the absolute top / bottom of document |
| `Mouse 4` / `Mouse 5` (Side buttons) | Hardware page back / forward navigation |
| `Shift + Mousewheel` | Horizontal canvas and spreadsheet scrolling |
| `Ctrl + G` | Jump to page number |

### Touchpad, Touchscreen & Mouse Gestures
| Gesture | Action |
|---------|--------|
| **Pinch-to-Zoom** (Precision Touchpad) | Smooth exponential continuous scaling ($e^{-\Delta y \cdot 0.0025}$) centered on viewport focal center |
| **Two-Finger Multi-Touch Pinch** (Touchscreen) | Real-time Euclidean distance zoom tracking |
| **Ctrl + Mousewheel** | Smooth zoom in / zoom out anchored to cursor coordinates |
| **Middle-Click + Drag** | 2D canvas hand tool / panning across PDF, DOCX, and spreadsheet grids |
| **Double-Click Canvas / Bed** | Quick-toggle between Fit Page Width and 100% actual size |

### Zoom & View Layout
| Shortcut | Action |
|----------|--------|
| `Ctrl + =` / `Ctrl + +` / `Numpad +` | Zoom in (+15%) |
| `Ctrl + -` / `Numpad -` | Zoom out (-15%) |
| `Ctrl + 0` / `Numpad 0` | Reset zoom to 100% |
| `Ctrl + Right` / `Left` | Rotate page clockwise / counter-clockwise 90° |
| `C` | Toggle continuous vertical scroll |
| `D` | Toggle dual-page spread |
| `F11` | Toggle fullscreen window |
| `F5` | Start slideshow presentation (PowerPoint PPTX) |

### Tools, Search & Utilities
| Shortcut | Action |
|----------|--------|
| `Ctrl + F` | Open floating search bar with match counter |
| `F3` / `Shift + F3` | Cycle next / previous search match (also `Enter` / `Shift + Enter`) |
| `Ctrl + B` / `F9` | Toggle sidebar navigation drawer (Pages, Outline, Bookmarks) |
| `Ctrl + D` | Bookmark active page |
| `Ctrl + P` | Print document with clean chrome-free styling |
| `Ctrl + R` | Reload active document |
| `Ctrl + Shift + L` | Toggle Zed One Dark / WinUI Light theme |
| `Ctrl + Shift + D` | Toggle developer FPS & 60fps benchmark HUD |
| `Esc` | Cascade dismiss: Search HUD $\rightarrow$ Modals $\rightarrow$ Fullscreen / Presentation $\rightarrow$ Drawer |
| `?` | Open interactive searchable Keyboard Shortcuts & Gestures dialog |

---

## 🧪 Benchmark Test Suite

To generate real-world test documents for scrolling and stress testing:

```bash
# Generates:
# - sample-500-pages.pdf (500 pages)
# - sample-financial-model.xlsx (multi-sheet workbook with 5,000+ data rows)
# - sample-100-slides.pptx (100 slides with shape layouts and speaker notes)
node scripts/create-benchmark-samples.js
```

Once loaded, open the developer HUD with `Ctrl+Shift+D` and click **"Run 60fps Scroll Benchmark"** to measure frame stability and 1% low frame rates.

---

## 🛠️ Building & Packaging

### Prerequisites
- Node.js 18+ and npm
- Rust toolchain (stable)
- Windows 10/11 with Visual Studio C++ Build Tools

### Development Mode
```bash
npm install
npm run tauri dev
```

### Production Build
```bash
# Builds frontend, compiles release binary, and creates portable package:
npm run build:portable

# Or standard Tauri bundler (creates MSI, NSIS, and release binary):
npm run tauri build
```

Installers and executables are generated in:
- **Portable Binary:** `src-tauri/target/release/Docs Reader-v3.2.1-Portable.exe`
- **Release Executable:** `src-tauri/target/release/Docs Reader-v3.2.1.exe`
- **MSI Installer:** `src-tauri/target/release/bundle/msi/Docs Reader_3.2.1_x64_en-US.msi`
- **NSIS Setup:** `src-tauri/target/release/bundle/nsis/Docs Reader_3.2.1_x64-setup.exe`

---

## 📄 License
MIT License. Built by **GarryMarkus** — offline for speed, privacy, and performance.
