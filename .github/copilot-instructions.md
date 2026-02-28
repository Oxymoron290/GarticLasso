# Copilot Instructions for GarticLasso

## Project Overview

GarticLasso is a Chrome extension that adds a **lasso fill tool** and a **tapered brush tool** to [Gartic Phone](https://garticphone.com/). It is designed to work alongside the existing ["Artist Tools for Gartic Phone"](https://chromewebstore.google.com/detail/artist-tools-for-gartic-p/jimdddbdlngpncjdbfggmjieegcnjcbd) extension.

## Architecture

This is a Chrome Extension (Manifest V3) that injects drawing tools into the Gartic Phone web app's canvas. Key architectural considerations:

- **Canvas interaction**: Gartic Phone uses an HTML5 `<canvas>` element for drawing. The extension must intercept and work with the existing canvas context without breaking Gartic Phone's own drawing logic or the Artist Tools extension.
- **Coexistence with Artist Tools**: The extension must not conflict with the Artist Tools extension. Injected UI and event listeners should be additive, not override existing functionality.
- **Content script injection**: Tools are injected via content scripts into `garticphone.com`. The extension needs to detect when the drawing canvas is available (Gartic Phone is a SPA, so the canvas may load dynamically).

## Key Tools to Implement

1. **Lasso Fill Tool**: Freehand selection that can be filled with the current brush color. The user draws a closed region on the canvas, and the enclosed area is flood-filled.
2. **Tapered Brush Tool**: A brush whose stroke width varies based on cursor speed or pressure, producing natural-looking tapered lines.

## Conventions

- Use Manifest V3 for the Chrome extension (`manifest.json`).
- Prefer vanilla JS over frameworks to keep the extension lightweight and fast-loading.
- All canvas manipulation should go through the existing 2D rendering context — do not create a separate overlay canvas unless necessary for compositing.
- Match the visual style of the Artist Tools extension's UI when adding toolbar buttons or controls.
