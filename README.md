# Docs Reader

A high-performance, offline desktop document reader for Windows created by **Garry Markus**, built with **Tauri v2**, **React 19**, and **TypeScript**. Features a modern WinUI 3 Fluent design inspired by Stitch design specifications, supporting **PDF, DOCX, XLSX, and PPTX** documents with buttery smooth 60–120 fps continuous scrolling and zero telemetry.

![Version](https://img.shields.io/badge/version-3.1.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20x64-lightgrey)
![Offline](https://img.shields.io/badge/offline-100%25-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 Key Capabilities

### 1. Multi-Format Offline Rendering
Zero dependencies on Microsoft Office or LibreOffice. Completely self-contained and bundled:
- **PDF (`.pdf`)**: Continuous virtual scroll rendered via PDF.js Web Worker + OffscreenCanvas, selectable TextLayer, and clickable hyperlink AnnotationLayer.
- **DOCX (`.docx`, `.doc`)**: Faithful typography, headings outline, word count metrics, and pagination rendered via `docx-preview`.
- **XLSX (`.xlsx`, `.xls`, `.csv`)**: High-performance HTML5 Canvas virtual grid engine supporting 100k+ rows with frozen column headers (`A..Z`), frozen row headers (`1..N`), formula bar (`fx`), active cell inspector, and multi-sheet tab switcher.
- **PPTX (`.pptx`, `.ppt`)**: Fast OpenXML zip parser rendering 16:9 responsive slide canvases into the virtual scroll frame and dedicated full-screen Presentation Mode (`F5`) with speaker notes popover.

### 2. High-Frame-Rate Virtual Scroll Engine
- **Pre-Calculated Row Layout**: Exact page heights and coordinates are reserved up front, ensuring **0 Cumulative Layout Shift (CLS)** and zero scroll jumps.
- **Directional Overscan**: Pre-renders pages 1.5 viewport heights ahead of the user's scroll direction.
- **LRU Memory Management**: Bounded texture and DOM cache evicts off-screen pages, maintaining low memory footprints even on 500+ page documents.
- **Debounced Zooming**: Immediate CSS scaling during rapid `Ctrl+Wheel` and pinch zoom with debounced sharp re-rendering.
- **FPS & Frame-Time HUD**: Real-time FPS, 1% Low frame time, and automated scroll benchmark runner (`Ctrl+Shift+D`).

### 3. In-Document Search & Text Highlighting
- **Floating Find Bar (`Ctrl+F`)**: Acrylic backdrop HUD with match counter (`X of Y matches`), Next (`Enter` / `F3`), Previous (`Shift+Enter` / `Shift+F3`), and Match Case toggle (`Aa`).
- **DOM & Canvas Highlighting**: Subtle yellow highlight tags across PDF text layers, Word sections, PowerPoint slides, and Excel grid cells, with vibrant orange highlighting for the active match.

### 4. Navigation & Outlines
- **Slide Deck & Page Thumbnails**: Real-time thumbnail previews in `NavigationDrawer` (16:9 for presentations, portrait for documents).
- **Headings & Outline Map**: Filterable table of contents for PDF bookmarks, Word headings, and presentation slide decks.
- **Persistent Bookmarks**: One-click page bookmarking with quick jump navigation.
- **Recent Files List**: Local persistence tracking file size, last opened timestamp, and last viewed page.

### 5. Desktop Polish & Native Integration
- **Windows Integration**: Drag-and-drop file opening, file associations for all supported formats, and "Open File Location" (reveals file in Windows Explorer).
- **Clean Print Styling (`Ctrl+P`)**: Dedicated print stylesheet stripping window chrome and formatting clean document pages.
- **WinUI 3 Fluent Design**: Light and Dark mode tokens matching Microsoft Fluent / Stitch guidelines.
- **Graceful Error Handling**: Dedicated recovery screens for password-protected files (with password unlock prompt), corrupt files, and unsupported formats.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + O` | Open file dialog |
| `Ctrl + P` | Print document |
| `Ctrl + F` | Search in document |
| `F3` / `Shift + F3` | Next / Previous search match |
| `Ctrl + G` | Go to page number |
| `Ctrl + =` / `Ctrl + -` | Zoom in / Zoom out |
| `Ctrl + 0` | Reset zoom to 100% |
| `Ctrl + Scroll` | Smooth mousewheel zoom |
| `Ctrl + Right` / `Left` | Rotate document 90° clockwise / counter-clockwise |
| `F5` | Start slideshow presentation (PPTX) |
| `F9` | Toggle sidebar navigation drawer |
| `F11` | Toggle fullscreen window |
| `C` | Toggle continuous vertical scroll |
| `D` | Toggle dual-page spread |
| `PageUp` / `PageDown` | Previous / Next page |
| `Home` / `End` | First / Last page |
| `Esc` | Close Search HUD, Modals, or Presentation Mode |
| `?` | Open Keyboard Shortcuts reference |
| `Ctrl + Shift + D` | Toggle developer FPS & Benchmark HUD |

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

### Production Build (MSI & NSIS Setup)
```bash
npm run tauri build
```

Installers and executables are generated in:
- **Portable Binary:** `src-tauri/target/release/Docs Reader-v3.1.0-Portable.exe`
- **MSI Installer:** `src-tauri/target/release/bundle/msi/Docs Reader_3.1.0_x64_en-US.msi`
- **NSIS Setup:** `src-tauri/target/release/bundle/nsis/Docs Reader_3.1.0_x64-setup.exe`

---

## 📄 License
MIT License. Built offline for speed and privacy.
