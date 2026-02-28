# GarticLasso

A Chrome extension that adds a **Lasso Fill** tool and a **Tapered Brush** tool to [Gartic Phone](https://garticphone.com/).

Designed to work alongside the [Artist Tools for Gartic Phone](https://chromewebstore.google.com/detail/artist-tools-for-gartic-p/jimdddbdlngpncjdbfggmjieegcnjcbd) extension.

## Features

### 🔷 Lasso Fill
Draw a freehand shape on the canvas and it automatically fills with the current color when you release. An animated dashed outline (marching ants) shows the shape as you draw.

### 🖌️ Tapered Brush
A brush that produces natural-looking strokes with variable width:
- **With a drawing tablet** — stroke width follows pen pressure
- **With a mouse** — stroke width adjusts based on cursor speed (faster = thinner)

Includes smoothing to prevent jagged lines.

### ⌨️ Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `L` | Toggle Lasso Fill tool |
| `T` | Toggle Tapered Brush tool |
| `Esc` | Deactivate current tool |

## Installation

1. Download or clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `GarticLasso` folder

## Usage

1. Go to [garticphone.com](https://garticphone.com/) and join a game
2. When a drawing round starts, a small toolbar will appear near the canvas
3. Click a tool button (or use keyboard shortcuts) to activate it
4. Draw on the canvas — press `Esc` or click the active tool again to deactivate
5. Gartic Phone's normal tools continue working when GarticLasso tools are deactivated

## Compatibility

- **Chrome** (Manifest V3)
- Works alongside the [Artist Tools for Gartic Phone](https://chromewebstore.google.com/detail/artist-tools-for-gartic-p/jimdddbdlngpncjdbfggmjieegcnjcbd) extension
- No additional permissions required

## Project Structure

```
├── manifest.json        # Chrome extension manifest (V3)
├── content.js           # Entry point — detects canvas, initializes tools
├── overlay.js           # Transparent overlay canvas for previews
├── lasso-tool.js        # Lasso fill tool
├── tapered-brush.js     # Tapered brush tool
├── toolbar.js           # UI — toolbar buttons and keyboard shortcuts
├── color-picker.js      # Reads current color from Gartic Phone's UI
├── styles.css           # Extension UI styles
└── icons/               # Extension icons
```

## License

MIT
