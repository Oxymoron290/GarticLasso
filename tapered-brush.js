// tapered-brush.js — Tapered brush tool: variable-width strokes recorded through Gartic Phone's system
// Captures stroke on overlay, then replays with varying brush sizes via synthetic events

window.GarticLasso = window.GarticLasso || {};

GarticLasso.TaperedBrush = (function () {
  'use strict';

  let gameCanvas = null;
  let overlay = null;
  let colorPicker = null;
  let isActive = false;
  let isDrawing = false;
  let isReplaying = false;

  let smoothPoints = [];
  let lastRawPoint = null;

  const MIN_WIDTH = 2;
  const MAX_WIDTH = 18;
  const SMOOTHING_FACTOR = 0.3;
  const VELOCITY_SCALE = 0.08;
  const WIDTH_SMOOTH_WINDOW = 5;
  const MIN_RUN_LENGTH = 4;
  const TAPER_POINTS = 5;

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
    isReplaying = false;
    smoothPoints = [];
    lastRawPoint = null;
    overlay.deactivate();
    overlay.canvas.removeEventListener('pointerdown', onPointerDown);
    overlay.canvas.removeEventListener('pointermove', onPointerMove);
    overlay.canvas.removeEventListener('pointerup', onPointerUp);
    overlay.canvas.removeEventListener('pointerleave', onPointerUp);
    overlay.canvas.style.cursor = '';
  }

  function onPointerDown(e) {
    if (!isActive || e.button !== 0 || isReplaying) return;
    isDrawing = true;
    smoothPoints = [];
    lastRawPoint = null;

    const pt = canvasPoint(e);
    lastRawPoint = { ...pt, time: performance.now() };
    smoothPoints.push({ x: pt.x, y: pt.y, width: (MIN_WIDTH + MAX_WIDTH) / 2 });

    overlay.canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!isDrawing) return;

    const pt = canvasPoint(e);
    const prev = smoothPoints[smoothPoints.length - 1];
    const dx = pt.x - prev.x;
    const dy = pt.y - prev.y;
    if (dx * dx + dy * dy < 4) return;

    const now = performance.now();
    const width = calcWidth(pt, now);

    smoothPoints.push({
      x: lerp(prev.x, pt.x, SMOOTHING_FACTOR),
      y: lerp(prev.y, pt.y, SMOOTHING_FACTOR),
      width: width
    });
    lastRawPoint = { ...pt, time: now };

    renderPreview();
  }

  function onPointerUp(e) {
    if (!isDrawing) return;
    isDrawing = false;

    if (smoothPoints.length < 2) {
      smoothPoints = [];
      lastRawPoint = null;
      overlay.clear();
      return;
    }

    const captured = [...smoothPoints];
    smoothPoints = [];
    lastRawPoint = null;

    replayStroke(captured).then(() => {
      overlay.clear();
    });
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

  function calcWidth(pt, now) {
    if (!lastRawPoint) return (MIN_WIDTH + MAX_WIDTH) / 2;

    const dx = pt.x - lastRawPoint.x;
    const dy = pt.y - lastRawPoint.y;
    const dt = now - lastRawPoint.time;
    if (dt === 0) return (MIN_WIDTH + MAX_WIDTH) / 2;

    const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
    const normalizedV = Math.min(velocity * VELOCITY_SCALE, 1);
    return MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * normalizedV;
  }

  // --- Preview rendering on the overlay ---

  function renderPreview() {
    const ctx = overlay.ctx;
    overlay.clear();
    if (smoothPoints.length < 2) return;

    const color = colorPicker.getColor();
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;

    for (let i = 1; i < smoothPoints.length; i++) {
      const from = smoothPoints[i - 1];
      const to = smoothPoints[i];
      const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
      const steps = Math.max(Math.ceil(dist / 4), 1);

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        ctx.beginPath();
        ctx.arc(
          lerp(from.x, to.x, t),
          lerp(from.y, to.y, t),
          lerp(from.width, to.width, t) / 2,
          0, Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- Width processing for replay ---

  function addTaper(points) {
    if (points.length < 3) return points;
    const tapered = points.map(p => ({ ...p }));
    const taperLen = Math.min(TAPER_POINTS, Math.floor(points.length / 4));

    for (let i = 0; i < taperLen; i++) {
      const t = i / taperLen;
      tapered[i].width = MIN_WIDTH + (tapered[i].width - MIN_WIDTH) * t;
    }
    for (let i = 0; i < taperLen; i++) {
      const idx = points.length - 1 - i;
      const t = i / taperLen;
      tapered[idx].width = MIN_WIDTH + (tapered[idx].width - MIN_WIDTH) * t;
    }
    return tapered;
  }

  function smoothWidths(points) {
    const out = points.map(p => ({ ...p }));
    const half = Math.floor(WIDTH_SMOOTH_WINDOW / 2);
    for (let i = 0; i < out.length; i++) {
      let sum = 0, count = 0;
      for (let j = Math.max(0, i - half); j <= Math.min(out.length - 1, i + half); j++) {
        sum += points[j].width;
        count++;
      }
      out[i].width = sum / count;
    }
    return out;
  }

  function buildSegments(points, numSizes) {
    // Quantize widths to thickness indices
    const indices = points.map(p => {
      const t = Math.max(0, Math.min(1, (p.width - MIN_WIDTH) / (MAX_WIDTH - MIN_WIDTH)));
      return Math.round(t * (numSizes - 1));
    });

    // Merge short runs into their predecessor
    let changed = true;
    while (changed) {
      changed = false;
      let runStart = 0;
      for (let i = 1; i <= indices.length; i++) {
        if (i === indices.length || indices[i] !== indices[runStart]) {
          if (i - runStart < MIN_RUN_LENGTH && runStart > 0) {
            const prev = indices[runStart - 1];
            for (let j = runStart; j < i; j++) indices[j] = prev;
            changed = true;
          }
          runStart = i;
        }
      }
    }

    // Group into segments with 1-point overlap at boundaries
    const segments = [];
    let curIdx = indices[0];
    let segStart = 0;

    for (let i = 1; i <= indices.length; i++) {
      if (i === indices.length || indices[i] !== curIdx) {
        segments.push({
          thicknessIdx: curIdx,
          points: points.slice(segStart, i)
        });
        if (i < indices.length) {
          curIdx = indices[i];
          segStart = Math.max(0, i - 1); // 1-point overlap
        }
      }
    }

    return segments;
  }

  // --- Synthetic event dispatch (same mechanism as lasso fill) ---

  function dispatchMouseEvent(eventName, canvasX, canvasY) {
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = rect.width / gameCanvas.width;
    const scaleY = rect.height / gameCanvas.height;
    const globalX = rect.left + canvasX * scaleX;
    const globalY = rect.top + canvasY * scaleY;

    const container = gameCanvas.closest('[class*="drawingContainer"]') || gameCanvas.parentElement;

    const event = new MouseEvent(eventName, {
      bubbles: true, cancelable: true, view: window,
      clientX: globalX, clientY: globalY,
      offsetX: canvasX, offsetY: canvasY,
      pageX: globalX + window.scrollX,
      pageY: globalY + window.scrollY,
      screenX: globalX, screenY: globalY,
      movementX: 0, movementY: 0,
      button: 0,
      buttons: eventName === 'mouseup' ? 0 : 1
    });

    if (window.__garticLassoEvents) {
      window.__garticLassoEvents.add(event);
    }

    container.dispatchEvent(event);
  }

  // --- Replay captured stroke through Gartic Phone ---

  async function replayStroke(rawPoints) {
    isReplaying = true;
    overlay.deactivate();
    window.__garticLassoBlocking = true;

    try {
      // Select pen tool
      const pen = document.querySelector(PEN_TOOL_SELECTOR);
      if (pen) pen.click();

      const thicknessOptions = document.querySelectorAll('.draw .options > div > div');
      const numSizes = thicknessOptions.length;

      if (numSizes === 0) {
        console.warn('[GarticLasso] No thickness options found, drawing single stroke');
        await drawSingleStroke(rawPoints);
        return;
      }

      // Process widths: taper endpoints, smooth, then segment
      const tapered = addTaper(rawPoints);
      const smoothed = smoothWidths(tapered);
      const segments = buildSegments(smoothed, numSizes);

      console.log(`[GarticLasso] Replaying tapered stroke: ${segments.length} segment(s), ${rawPoints.length} points`);

      await new Promise(r => setTimeout(r, 30));

      for (const seg of segments) {
        thicknessOptions[seg.thicknessIdx].click();
        await new Promise(r => setTimeout(r, 20));

        const pts = seg.points;
        dispatchMouseEvent('mousedown', pts[0].x, pts[0].y);

        for (let i = 1; i < pts.length; i++) {
          dispatchMouseEvent('mousemove', pts[i].x, pts[i].y);
        }

        dispatchMouseEvent('mouseup', pts[pts.length - 1].x, pts[pts.length - 1].y);
        await new Promise(r => setTimeout(r, 10));
      }
    } finally {
      window.__garticLassoBlocking = false;
      if (isActive) overlay.activate();
      isReplaying = false;
      console.log('[GarticLasso] Tapered stroke complete');
    }
  }

  async function drawSingleStroke(points) {
    dispatchMouseEvent('mousedown', points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      dispatchMouseEvent('mousemove', points[i].x, points[i].y);
    }
    dispatchMouseEvent('mouseup', points[points.length - 1].x, points[points.length - 1].y);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function destroy() {
    deactivate();
    gameCanvas = null;
    overlay = null;
    colorPicker = null;
  }

  return { init, destroy };
})();
