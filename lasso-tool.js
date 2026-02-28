// lasso-tool.js — Lasso fill tool: freehand draw a closed shape, auto-fill on release

window.GarticLasso = window.GarticLasso || {};

GarticLasso.LassoTool = (function () {
  'use strict';

  let gameCanvas = null;
  let gameCtx = null;
  let overlay = null;
  let colorPicker = null;
  let isActive = false;
  let isDrawing = false;
  let points = [];

  // Dash animation state
  let dashOffset = 0;
  let animFrameId = null;

  function init(canvas, overlayInstance, colorPickerInstance) {
    gameCanvas = canvas;
    gameCtx = canvas.getContext('2d');
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
    if (!isActive || e.button !== 0) return;
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

    // Auto-close the path and fill on the game canvas
    fillPolygon();
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

    // Show closing line back to start
    if (points.length > 2) {
      ctx.lineTo(points[0].x, points[0].y);
    }
    ctx.stroke();

    // Draw a second pass with dark color for contrast (marching ants effect)
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

  function fillPolygon() {
    // Instead of drawing directly on the canvas (which Gartic Phone doesn't record),
    // we simulate pointer events so the game captures the fill as real strokes.
    const scanlines = rasterizePolygon(points);

    // Show a progress overlay while filling
    overlay.ctx.save();
    overlay.ctx.fillStyle = 'rgba(74, 108, 247, 0.15)';
    overlay.ctx.beginPath();
    overlay.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      overlay.ctx.lineTo(points[i].x, points[i].y);
    }
    overlay.ctx.closePath();
    overlay.ctx.fill();
    overlay.ctx.restore();

    simulateFillStrokes(scanlines).then(() => {
      overlay.clear();
    });
  }

  // Rasterize polygon into horizontal scanlines
  function rasterizePolygon(poly) {
    const lines = [];
    let minY = Infinity, maxY = -Infinity;

    for (const p of poly) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    minY = Math.ceil(minY);
    maxY = Math.floor(maxY);
    const step = 2; // pixel gap between scanlines (matches typical brush size)

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

      // Pair up intersections to form filled spans
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

  // Simulate pointer events on the game canvas to "draw" the fill scanlines
  async function simulateFillStrokes(scanlines) {
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = rect.width / gameCanvas.width;
    const scaleY = rect.height / gameCanvas.height;

    for (const line of scanlines) {
      if (line.x2 - line.x1 < 1) continue;

      const startX = rect.left + line.x1 * scaleX;
      const startY = rect.top + line.y * scaleY;
      const endX = rect.left + line.x2 * scaleX;
      const endY = startY;

      const commonProps = {
        bubbles: true,
        cancelable: true,
        pointerType: 'mouse',
        pointerId: 1,
        button: 0,
        buttons: 1,
        pressure: 0.5,
        isPrimary: true
      };

      gameCanvas.dispatchEvent(new PointerEvent('pointerdown', {
        ...commonProps, clientX: startX, clientY: startY
      }));

      // Move across the scanline in steps
      const stepPx = 4;
      const dx = endX - startX;
      const steps = Math.max(Math.ceil(Math.abs(dx) / stepPx), 1);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        gameCanvas.dispatchEvent(new PointerEvent('pointermove', {
          ...commonProps,
          clientX: startX + dx * t,
          clientY: endY
        }));
      }

      gameCanvas.dispatchEvent(new PointerEvent('pointerup', {
        ...commonProps, clientX: endX, clientY: endY, buttons: 0
      }));

      // Small delay between scanlines to avoid overwhelming the event queue
      await new Promise(r => setTimeout(r, 0));
    }
  }

  function destroy() {
    deactivate();
    gameCanvas = null;
    gameCtx = null;
    overlay = null;
    colorPicker = null;
  }

  return { init, destroy };
})();
