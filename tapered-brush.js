// tapered-brush.js — Tapered brush tool: variable-width strokes based on pressure or speed

window.GarticLasso = window.GarticLasso || {};

GarticLasso.TaperedBrush = (function () {
  'use strict';

  let gameCanvas = null;
  let gameCtx = null;
  let overlay = null;
  let colorPicker = null;
  let isActive = false;
  let isDrawing = false;

  // Stroke state
  let rawPoints = [];       // Raw input points with timestamps and pressure
  let smoothPoints = [];    // Smoothed points for rendering

  // Configuration
  const MIN_WIDTH = 1;
  const MAX_WIDTH = 16;
  const SMOOTHING_FACTOR = 0.3; // Lower = smoother, higher = more responsive
  const VELOCITY_SCALE = 0.08;  // How much velocity affects width

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
    rawPoints = [];
    smoothPoints = [];
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
    rawPoints = [];
    smoothPoints = [];

    const pt = capturePoint(e);
    rawPoints.push(pt);
    smoothPoints.push({ x: pt.x, y: pt.y, width: calcWidth(pt) });

    overlay.canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!isDrawing) return;

    const pt = capturePoint(e);
    rawPoints.push(pt);

    // Apply exponential smoothing to position
    const prev = smoothPoints[smoothPoints.length - 1];
    const smoothed = {
      x: lerp(prev.x, pt.x, SMOOTHING_FACTOR),
      y: lerp(prev.y, pt.y, SMOOTHING_FACTOR),
      width: calcWidth(pt)
    };
    smoothPoints.push(smoothed);

    // Draw the new segment on the game canvas
    if (smoothPoints.length >= 2) {
      drawSegment(
        smoothPoints[smoothPoints.length - 2],
        smoothPoints[smoothPoints.length - 1]
      );
    }
  }

  function onPointerUp(e) {
    if (!isDrawing) return;
    isDrawing = false;

    // Draw tapered end
    if (smoothPoints.length >= 2) {
      const last = smoothPoints[smoothPoints.length - 1];
      const taperEnd = { x: last.x, y: last.y, width: MIN_WIDTH };
      drawSegment(last, taperEnd);
    }

    rawPoints = [];
    smoothPoints = [];
    overlay.clear();
  }

  function capturePoint(e) {
    const rect = overlay.canvas.getBoundingClientRect();
    const scaleX = overlay.canvas.width / rect.width;
    const scaleY = overlay.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure,
      time: performance.now()
    };
  }

  function calcWidth(pt) {
    // Use pressure if available (tablet), otherwise use velocity
    if (pt.pressure > 0 && pt.pressure < 1) {
      return MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * pt.pressure;
    }

    // Velocity-based: faster movement = thinner line
    if (rawPoints.length < 2) return (MIN_WIDTH + MAX_WIDTH) / 2;

    const prev = rawPoints[rawPoints.length - 2];
    const dx = pt.x - prev.x;
    const dy = pt.y - prev.y;
    const dt = pt.time - prev.time;

    if (dt === 0) return (MIN_WIDTH + MAX_WIDTH) / 2;

    const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
    const normalizedV = Math.min(velocity * VELOCITY_SCALE, 1);

    // Invert: faster = thinner
    return MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * normalizedV;
  }

  function drawSegment(from, to) {
    const color = colorPicker.getColor();

    gameCtx.save();
    gameCtx.fillStyle = color;
    gameCtx.lineCap = 'round';
    gameCtx.lineJoin = 'round';

    // Draw the segment as a filled shape connecting two circles of different radii
    // This creates the tapered effect
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.5) {
      // Just draw a circle at the point
      gameCtx.beginPath();
      gameCtx.arc(to.x, to.y, to.width / 2, 0, Math.PI * 2);
      gameCtx.fill();
      gameCtx.restore();
      return;
    }

    // Use catmull-rom interpolation for sub-segments
    const steps = Math.max(Math.ceil(dist / 2), 1);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lerp(from.x, to.x, t);
      const y = lerp(from.y, to.y, t);
      const w = lerp(from.width, to.width, t);

      gameCtx.beginPath();
      gameCtx.arc(x, y, w / 2, 0, Math.PI * 2);
      gameCtx.fill();
    }

    gameCtx.restore();
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
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
