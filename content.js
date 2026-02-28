// content.js — Entry point for GarticLasso extension
// Detects Gartic Phone's drawing canvas and initializes tools

(function () {
  'use strict';

  const CANVAS_CHECK_INTERVAL = 1000;
  let initialized = false;
  let gameCanvas = null;

  function findDrawingCanvas() {
    // Gartic Phone uses a canvas element for drawing
    // Look for the main drawing canvas (typically the largest visible canvas)
    const canvases = document.querySelectorAll('canvas');
    let best = null;
    let bestArea = 0;

    for (const c of canvases) {
      const rect = c.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > bestArea && rect.width > 100 && rect.height > 100) {
        best = c;
        bestArea = area;
      }
    }
    return best;
  }

  function initExtension(canvas) {
    if (initialized) return;
    initialized = true;
    gameCanvas = canvas;

    console.log('[GarticLasso] Drawing canvas found, initializing...');

    // Initialize subsystems
    const overlay = GarticLasso.Overlay.init(canvas);
    const colorPicker = GarticLasso.ColorPicker.init();
    const lassoTool = GarticLasso.LassoTool.init(canvas, overlay, colorPicker);
    const taperedBrush = GarticLasso.TaperedBrush.init(canvas, overlay, colorPicker);
    const toolbar = GarticLasso.Toolbar.init(canvas, {
      lasso: lassoTool,
      taperedBrush: taperedBrush
    });

    console.log('[GarticLasso] Initialized successfully.');
  }

  function teardown() {
    if (!initialized) return;
    initialized = false;
    gameCanvas = null;

    GarticLasso.Toolbar.destroy();
    GarticLasso.LassoTool.destroy();
    GarticLasso.TaperedBrush.destroy();
    GarticLasso.ColorPicker.destroy();
    GarticLasso.Overlay.destroy();

    console.log('[GarticLasso] Torn down (canvas removed).');
  }

  // Watch for canvas appearing/disappearing (SPA navigation)
  const observer = new MutationObserver(() => {
    const canvas = findDrawingCanvas();
    if (canvas && !initialized) {
      initExtension(canvas);
    } else if (!canvas && initialized) {
      teardown();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also poll periodically in case MutationObserver misses it
  setInterval(() => {
    const canvas = findDrawingCanvas();
    if (canvas && !initialized) {
      initExtension(canvas);
    } else if (!canvas && initialized) {
      teardown();
    }
  }, CANVAS_CHECK_INTERVAL);

  // Initial check
  const canvas = findDrawingCanvas();
  if (canvas) {
    initExtension(canvas);
  }
})();
