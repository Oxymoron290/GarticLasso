// overlay.js — Manages a transparent overlay canvas for tool previews

window.GarticLasso = window.GarticLasso || {};

GarticLasso.Overlay = (function () {
  'use strict';

  let overlayCanvas = null;
  let overlayCtx = null;
  let gameCanvas = null;
  let resizeObserver = null;

  function init(canvas) {
    gameCanvas = canvas;

    overlayCanvas = document.createElement('canvas');
    overlayCanvas.id = 'gartic-lasso-overlay';
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.pointerEvents = 'none';
    overlayCanvas.style.zIndex = '9999';
    overlayCanvas.style.top = '0';
    overlayCanvas.style.left = '0';

    syncSize();
    syncPosition();

    // Insert overlay right after the game canvas
    gameCanvas.parentElement.style.position = 'relative';
    gameCanvas.parentElement.appendChild(overlayCanvas);

    overlayCtx = overlayCanvas.getContext('2d');

    // Watch for game canvas resizing
    resizeObserver = new ResizeObserver(() => {
      syncSize();
      syncPosition();
    });
    resizeObserver.observe(gameCanvas);

    return {
      canvas: overlayCanvas,
      ctx: overlayCtx,
      activate,
      deactivate,
      clear,
      syncPosition
    };
  }

  function syncSize() {
    if (!overlayCanvas || !gameCanvas) return;
    overlayCanvas.width = gameCanvas.width;
    overlayCanvas.height = gameCanvas.height;
    overlayCanvas.style.width = gameCanvas.style.width || gameCanvas.offsetWidth + 'px';
    overlayCanvas.style.height = gameCanvas.style.height || gameCanvas.offsetHeight + 'px';
  }

  function syncPosition() {
    if (!overlayCanvas || !gameCanvas) return;
    const rect = gameCanvas.getBoundingClientRect();
    const parentRect = gameCanvas.parentElement.getBoundingClientRect();
    overlayCanvas.style.left = (rect.left - parentRect.left) + 'px';
    overlayCanvas.style.top = (rect.top - parentRect.top) + 'px';
  }

  function activate() {
    if (overlayCanvas) {
      overlayCanvas.style.pointerEvents = 'auto';
    }
  }

  function deactivate() {
    if (overlayCanvas) {
      overlayCanvas.style.pointerEvents = 'none';
      clear();
    }
  }

  function clear() {
    if (overlayCtx && overlayCanvas) {
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
  }

  function destroy() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (overlayCanvas && overlayCanvas.parentElement) {
      overlayCanvas.parentElement.removeChild(overlayCanvas);
    }
    overlayCanvas = null;
    overlayCtx = null;
    gameCanvas = null;
  }

  return { init, destroy };
})();
