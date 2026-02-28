// lasso-tool.js — Lasso fill tool: freehand draw a closed shape, auto-fill on release

window.GarticLasso = window.GarticLasso || {};

GarticLasso.LassoTool = (function () {
  'use strict';

  let gameCanvas = null;
  let overlay = null;
  let colorPicker = null;
  let isActive = false;
  let isDrawing = false;
  let isFilling = false;
  let points = [];

  // Dash animation state
  let dashOffset = 0;
  let animFrameId = null;

  // Gartic Phone UI selectors
  const PEN_TOOL_SELECTOR = '.draw .tool.pen';

  function init(canvas, overlayInstance, colorPickerInstance) {
    gameCanvas = canvas;
    overlay = overlayInstance;
    colorPicker = colorPickerInstance;

    return { activate, deactivate, destroy };
  }

  function activate() {
    isActive = true;
    overlay.activate();
    overlay.canvas.addEventListener('pointerdown', onPointerDown);
    overlay.canvas.addEventListener('pointermove', onPointerMove);
    overlay.canvas.addEventListener('pointerup', onPointerUp);
    overlay.canvas.addEventListener('pointerleave', onPointerUp);
    overlay.canvas.style.cursor = 'crosshair';
  }

  function deactivate() {
    isActive = false;
    isDrawing = false;
    points = [];
    cancelAnimationFrame(animFrameId);
    overlay.deactivate();
    overlay.canvas.removeEventListener('pointerdown', onPointerDown);
    overlay.canvas.removeEventListener('pointermove', onPointerMove);
    overlay.canvas.removeEventListener('pointerup', onPointerUp);
    overlay.canvas.removeEventListener('pointerleave', onPointerUp);
    overlay.canvas.style.cursor = '';
  }

  function onPointerDown(e) {
    if (!isActive || e.button !== 0 || isFilling) return;
    isDrawing = true;
    points = [];

    const pt = canvasPoint(e);
    points.push(pt);

    overlay.canvas.setPointerCapture(e.pointerId);
    startDashAnimation();
  }

  function onPointerMove(e) {
    if (!isDrawing) return;
    const pt = canvasPoint(e);

    // Only add point if it's far enough from the last one (reduces noise)
    const last = points[points.length - 1];
    const dx = pt.x - last.x;
    const dy = pt.y - last.y;
    if (dx * dx + dy * dy < 4) return;

    points.push(pt);
  }

  function onPointerUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    cancelAnimationFrame(animFrameId);

    if (points.length < 3) {
      points = [];
      overlay.clear();
      return;
    }

    // Show fill preview then execute
    showFillPreview();
    fillPolygon([...points]).then(() => {
      overlay.clear();
    });
    points = [];
  }

  function canvasPoint(e) {
    const rect = overlay.canvas.getBoundingClientRect();
    const scaleX = overlay.canvas.width / rect.width;
    const scaleY = overlay.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  // Animated dashed outline on overlay
  function startDashAnimation() {
    function animate() {
      dashOffset += 0.5;
      drawLassoPreview();
      animFrameId = requestAnimationFrame(animate);
    }
    animFrameId = requestAnimationFrame(animate);
  }

  function drawLassoPreview() {
    const ctx = overlay.ctx;
    overlay.clear();

    if (points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -dashOffset;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    if (points.length > 2) {
      ctx.lineTo(points[0].x, points[0].y);
    }
    ctx.stroke();

    // Marching ants contrast pass
    ctx.strokeStyle = '#000000';
    ctx.lineDashOffset = -dashOffset + 5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    if (points.length > 2) {
      ctx.lineTo(points[0].x, points[0].y);
    }
    ctx.stroke();

    ctx.restore();
  }

  function showFillPreview() {
    const ctx = overlay.ctx;
    overlay.clear();
    ctx.save();
    ctx.fillStyle = 'rgba(74, 108, 247, 0.2)';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Dispatch a MouseEvent through Gartic Phone's drawing system
  // Events are dispatched on drawingContainer where Gartic Phone's listeners are attached
  function dispatchMouseEvent(eventName, canvasX, canvasY) {
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = rect.width / gameCanvas.width;
    const scaleY = rect.height / gameCanvas.height;
    const globalX = rect.left + canvasX * scaleX;
    const globalY = rect.top + canvasY * scaleY;

    // Find the drawingContainer (parent of the canvas with the event listeners)
    const container = gameCanvas.closest('[class*="drawingContainer"]') || gameCanvas.parentElement;

    const event = new MouseEvent(eventName, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: globalX,
      clientY: globalY,
      offsetX: canvasX,
      offsetY: canvasY,
      pageX: globalX + window.scrollX,
      pageY: globalY + window.scrollY,
      screenX: globalX,
      screenY: globalY,
      movementX: 0,
      movementY: 0,
      button: 0,
      buttons: eventName === 'mouseup' ? 0 : 1
    });

    // Mark for the early-inject proxy to make it appear trusted
    if (window.__garticLassoEvents) {
      window.__garticLassoEvents.add(event);
    }

    container.dispatchEvent(event);
  }

  // Rasterize polygon into horizontal scanlines
  function rasterizePolygon(poly, step) {
    const lines = [];
    let minY = Infinity, maxY = -Infinity;

    for (const p of poly) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    minY = Math.ceil(minY);
    maxY = Math.floor(maxY);

    for (let y = minY; y <= maxY; y += step) {
      const intersections = [];
      const n = poly.length;

      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const yi = poly[i].y, yj = poly[j].y;
        const xi = poly[i].x, xj = poly[j].x;

        if ((yi <= y && yj > y) || (yj <= y && yi > y)) {
          const x = xi + (y - yi) / (yj - yi) * (xj - xi);
          intersections.push(x);
        }
      }

      intersections.sort((a, b) => a - b);

      for (let i = 0; i < intersections.length - 1; i += 2) {
        lines.push({
          y: y,
          x1: Math.ceil(intersections[i]),
          x2: Math.floor(intersections[i + 1])
        });
      }
    }

    return lines;
  }

  // Select Gartic Phone's pen tool and find the largest brush size
  function setupBrushForFill() {
    // Select pen tool
    const pen = document.querySelector(PEN_TOOL_SELECTOR);
    if (pen) pen.click();

    // Select the LARGEST brush size for fewer scanlines
    const thicknessOptions = document.querySelectorAll('.draw .options > div > div');
    if (thicknessOptions.length > 0) {
      thicknessOptions[thicknessOptions.length - 1].click();
    }
  }

  // Fill the polygon by simulating mouse events through Gartic Phone's drawing system
  // Uses a single continuous zigzag stroke to minimize the stroke count
  async function fillPolygon(poly) {
    isFilling = true;

    // Hide overlay and block real mouse input during fill
    overlay.deactivate();
    window.__garticLassoBlocking = true;

    try {
      // Set up pen tool with largest brush
      setupBrushForFill();
      await new Promise(r => setTimeout(r, 50));

      const SCANLINE_STEP = 8;
      const scanlines = rasterizePolygon(poly, SCANLINE_STEP);
      console.log('[GarticLasso] Filling with', scanlines.length, 'scanlines (single stroke)');

      if (scanlines.length === 0) return;

      // Start a single continuous stroke at the first scanline
      dispatchMouseEvent('mousedown', scanlines[0].x1, scanlines[0].y);

      for (let i = 0; i < scanlines.length; i++) {
        const line = scanlines[i];
        const isEven = i % 2 === 0;

        const startX = isEven ? line.x1 : line.x2;
        const endX = isEven ? line.x2 : line.x1;

        dispatchMouseEvent('mousemove', startX, line.y);

        const dx = endX - startX;
        const movePx = 12;
        const steps = Math.max(Math.ceil(Math.abs(dx) / movePx), 1);
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          dispatchMouseEvent('mousemove', startX + dx * t, line.y);
        }

        if (i % 6 === 0) {
          await new Promise(r => setTimeout(r, 5));
        }
      }

      const lastLine = scanlines[scanlines.length - 1];
      dispatchMouseEvent('mouseup', lastLine.x2, lastLine.y);

    } finally {
      // Always re-enable mouse input
      window.__garticLassoBlocking = false;
      if (isActive) overlay.activate();
      isFilling = false;
      console.log('[GarticLasso] Fill complete');
    }
  }

  function destroy() {
    deactivate();
    gameCanvas = null;
    overlay = null;
    colorPicker = null;
  }

  return { init, destroy };
})();
