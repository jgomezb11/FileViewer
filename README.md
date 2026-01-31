# FileViewer

A desktop video partitioner and file browser built with **Tauri + React + Rust**. This is a personal project built almost entirely through vibecoding with [Claude Code](https://claude.ai/claude-code).

100% offline. No telemetry. All processing stays on your machine.

<!-- Add screenshots here, e.g.: -->
<!-- ![Main UI](docs/screenshot-main.png) -->
<!-- ![Timeline](docs/screenshot-timeline.png) -->

## What it does

- **Split large videos** into smaller partitions by target file size (e.g. 4 GB chunks) using FFmpeg stream copy — no re-encoding, no quality loss
- **Browse directories** of videos and images with arrow key navigation
- **Preview split points** on a visual timeline with thumbnail strip background
- **Exclude intervals** by dragging on the timeline — excluded segments are skipped in the output
- **Screenshot frames** — press `S` to save the current frame as a JPEG next to the original file
- **Trash files** — press `Del` to send the current file to the recycle bin

## How to use it

1. Launch the app
2. Pick a **single video file** or an **entire directory**
3. If you picked a directory, use `Left` / `Right` arrow keys to navigate between files
4. For videos:
   - The timeline shows thumbnails across the video duration
   - Drag on the timeline to mark **exclusion zones** (red) — these parts won't be in the output
   - Set a **target partition size** (in GB) in the sidebar and hit Split
   - Output files are saved next to the original as `_part1`, `_part2`, etc.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `S` | Save screenshot of current frame |
| `Left` / `Right` | Previous / Next file (directory mode) |
| `Del` | Move current file to trash (directory mode) |

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Zustand, TailwindCSS |
| Backend | Tauri v1 (Rust) |
| Video processing | FFmpeg (bundled as sidecar, no internet needed) |
| Build | Vite |

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (hot reload + Rust recompile)
npm run tauri dev

# Production build (creates Windows installer)
npm run tauri build
```

**Prerequisites:** Node.js 18+, Rust 1.70+, and an `ffmpeg.exe` sidecar binary placed at `src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe`.

## About

Built as an experiment in AI-assisted development. The entire codebase — Rust backend, React frontend, FFmpeg integration, state management — was written through conversational prompts with Claude Code. A vibecoding project from start to finish.
