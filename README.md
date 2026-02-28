# GarticLasso

<img src="icons/lasso-128.png" alt="GarticLasso" width="128" />

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

### Step 1 — Download

Go to the [**Releases page**](../../releases/latest) and download **GarticLasso-v1.0.0.zip**.

### Step 2 — Unzip

Right-click the downloaded ZIP file and select **Extract All**. Remember where you extracted it — you'll need this folder in the next step.

### Step 3 — Install in Chrome

1. Open Chrome and type `chrome://extensions` in the address bar, then press Enter
2. Turn on **Developer mode** using the toggle in the top-right corner
3. Click the **Load unpacked** button that appears
4. Navigate to the folder you extracted and select the **GarticLasso** folder inside it
5. You should see "GarticLasso" appear in your extensions list — you're done!

> **⚠️ Important:** Don't delete or move the extracted folder after installing. Chrome needs it to stay where it is.

## How to Use

1. Go to [garticphone.com](https://garticphone.com/) and join or start a game
2. When it's your turn to draw, you'll see new tool buttons appear near the canvas
3. Click a tool to activate it, then draw on the canvas
4. Click the same tool again (or press `Esc`) to go back to the normal Gartic Phone tools

### Tools

| Tool | Button | Shortcut | What it does |
|------|--------|----------|--------------|
| **Lasso Fill** | 🔷 | `L` | Draw a shape freehand — it fills with color when you let go |
| **Tapered Brush** | 🖌️ | `T` | Draw with a brush that gets thinner the faster you move |
| **Deactivate** | — | `Esc` | Go back to normal Gartic Phone drawing |

## Compatibility

- **Google Chrome** (or Chromium-based browsers like Edge, Brave, Opera)
- Works alongside the [Artist Tools for Gartic Phone](https://chromewebstore.google.com/detail/artist-tools-for-gartic-p/jimdddbdlngpncjdbfggmjieegcnjcbd) extension — no conflicts
- No special permissions required

## Uninstalling

1. Go to `chrome://extensions`
2. Find "GarticLasso" and click **Remove**
3. Delete the extracted folder if you no longer need it

## For Developers

<details>
<summary>Click to expand</summary>

### Project Structure

```
├── manifest.json        # Chrome extension manifest (V3)
├── content.js           # Entry point — detects canvas, initializes tools
├── overlay.js           # Transparent overlay canvas for previews
├── lasso-tool.js        # Lasso fill tool
├── tapered-brush.js     # Tapered brush tool
├── toolbar.js           # UI — toolbar buttons and keyboard shortcuts
├── color-picker.js      # Reads current color from Gartic Phone's UI
├── styles.css           # Extension UI styles
├── icons/               # Extension icons
└── build.ps1            # Build script for release ZIP
```

### Building a Release

```powershell
.\build.ps1 -Version "1.0.0"
```

This creates `dist/GarticLasso-v1.0.0.zip` ready to upload to GitHub Releases.

</details>

## Privacy

This extension collects **no user data**. See the full [Privacy Policy](PRIVACY.md).

## License

MIT
