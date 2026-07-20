# GNOME-Style Minimalist Document Reader

A clean, distraction-free document reader for Windows dedicated to PDFs, inspired by the sleek, clutter-free design philosophy of GNOME environments (like GTK4's "Papers" app). Built with a highly optimized tech stack ensuring zero-bloat.

## Tech Stack
- **Framework:** Tauri v2 (Replaces Electron, uses native Edge WebView2 + Rust backend)
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS v3 (Custom libadwaita-inspired configuration)
- **Rendering Engine:** PDF.js (Headless rendering to native HTML `<canvas>`)

## What is Done
- **Frameless Window Architecture:** Bypasses default Windows Fluent UI chrome in favor of custom rounded corners and transparent backgrounds.
- **Unified Headerbar:** Integrates window controls (close, minimize, maximize), custom drag regions, and double-click to maximize gestures.
- **Contextual Sidebar:** Beautiful layout divided into content pane and bottom navigation tabs.
- **Zero-Bloat PDF Rendering:** Parses PDF bytes via Web Worker and paints directly onto a `<canvas>` element (no heavy embedded browser UI).
- **Floating Action Buttons (FABs):** Glassmorphic zoom controls hovering over the canvas.
- **File System Integration:** Open PDFs via the headerbar file picker or by dragging and dropping them into the window.
- **Dynamic Outlines:** Extracts and recursively renders real PDF bookmarks / table of contents into the sidebar.

## What is Left to Improve
- **Continuous Scrolling:** Currently, the canvas strictly renders Page 1. We need to implement a virtualized list to render multiple pages simultaneously as the user scrolls.
- **Thumbnail Generation:** The Sidebar's "Thumbnails" tab is unlinked. We need to generate low-resolution canvas snapshots of pages to populate this view.
- **Search Functionality:** Wire up the search tab to utilize PDF.js's text extraction layer for finding keywords within the document.
- **Bookmarks/History:** Allow users to save their place, remember last opened directories, and store customized zoom preferences.
- **Performance Optimizations:** While highly optimized, huge multi-hundred-page PDFs will require off-screen canvas rendering to maintain 60FPS.

## How to Build
To build the application installer natively, ensure you have the [Rust toolchain](https://rustup.rs/) installed, then run:

```bash
npm install
npm run tauri build
```
The installer will be generated in `src-tauri/target/release/bundle/nsis/`.
