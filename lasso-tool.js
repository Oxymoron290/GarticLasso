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
    overlay.clear();
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
    const color = colorPicker.getColor();

    gameCtx.save();
    gameCtx.fillStyle = color;
    gameCtx.beginPath();
    gameCtx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      gameCtx.lineTo(points[i].x, points[i].y);
    }
    gameCtx.closePath();
    gameCtx.fill();
    gameCtx.restore();
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
