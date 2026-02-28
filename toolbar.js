// toolbar.js — Injects tool buttons into Gartic Phone's toolbar or creates a floating toolbar

window.GarticLasso = window.GarticLasso || {};

GarticLasso.Toolbar = (function () {
  'use strict';

  let toolbarEl = null;
  let tools = {};
  let activeTool = null;
  let gameCanvas = null;

  // SVG icons for tools
  const ICONS = {
    lasso: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 3C7 3 3 6.5 3 11c0 3 1.5 5 4 6"/>
      <circle cx="7" cy="17" r="3"/>
      <path d="M21 11c0-4.5-4-8-9-8"/>
      <path d="M21 11c0 2.5-1.5 4.5-3.5 5.5"/>
    </svg>`,
    taperedBrush: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 21l6-6"/>
      <path d="M9 15l8-8c1-1 3-2 4-1s0 3-1 4l-8 8"/>
      <path d="M9 15c0 0-1 3-6 6"/>
    </svg>`
  };

  function init(canvas, toolInstances) {
    gameCanvas = canvas;
    tools = toolInstances;

    // Try to inject into Gartic Phone's toolbar
    const injected = tryInjectIntoToolbar();
    if (!injected) {
      createFloatingToolbar();
    }

    setupKeyboardShortcuts();

    return { setActiveTool, getActiveTool, destroy };
  }

  function tryInjectIntoToolbar() {
    // Look for Gartic Phone's drawing toolbar
    const toolbar = document.querySelector(
      '[class*="tools" i], [class*="toolbar" i], [class*="draw" i][class*="bar" i]'
    );
    if (!toolbar) return false;

    const container = document.createElement('div');
    container.id = 'gartic-lasso-tools';
    container.className = 'gartic-lasso-injected';

    container.appendChild(createToolButton('lasso', 'Lasso Fill (L)', ICONS.lasso));
    container.appendChild(createToolButton('taperedBrush', 'Tapered Brush (T)', ICONS.taperedBrush));

    toolbar.appendChild(container);
    toolbarEl = container;
    return true;
  }

  function createFloatingToolbar() {
    const container = document.createElement('div');
    container.id = 'gartic-lasso-toolbar';
    container.className = 'gartic-lasso-floating';

    // Drag handle
    const handle = document.createElement('div');
    handle.className = 'gartic-lasso-drag-handle';
    handle.textContent = '⋮⋮';
    container.appendChild(handle);

    container.appendChild(createToolButton('lasso', 'Lasso Fill (L)', ICONS.lasso));
    container.appendChild(createToolButton('taperedBrush', 'Tapered Brush (T)', ICONS.taperedBrush));

    document.body.appendChild(container);
    toolbarEl = container;

    makeDraggable(container, handle);
    positionNearCanvas();
  }

  function createToolButton(toolId, title, iconSvg) {
    const btn = document.createElement('button');
    btn.className = 'gartic-lasso-btn';
    btn.dataset.tool = toolId;
    btn.title = title;
    btn.innerHTML = iconSvg;
    btn.addEventListener('click', () => toggleTool(toolId));
    return btn;
  }

  function toggleTool(toolId) {
    if (activeTool === toolId) {
      deactivateAll();
    } else {
      setActiveTool(toolId);
    }
  }

  function setActiveTool(toolId) {
    deactivateAll();
    activeTool = toolId;

    // Update button states
    const btns = toolbarEl.querySelectorAll('.gartic-lasso-btn');
    for (const btn of btns) {
      btn.classList.toggle('active', btn.dataset.tool === toolId);
    }

    // Activate the tool
    if (toolId === 'lasso' && tools.lasso) {
      tools.lasso.activate();
    } else if (toolId === 'taperedBrush' && tools.taperedBrush) {
      tools.taperedBrush.activate();
    }
  }

  function getActiveTool() {
    return activeTool;
  }

  function deactivateAll() {
    if (tools.lasso) tools.lasso.deactivate();
    if (tools.taperedBrush) tools.taperedBrush.deactivate();
    activeTool = null;

    if (toolbarEl) {
      const btns = toolbarEl.querySelectorAll('.gartic-lasso-btn');
      for (const btn of btns) {
        btn.classList.remove('active');
      }
    }
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't intercept when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'l' || e.key === 'L') {
        toggleTool('lasso');
      } else if (e.key === 't' || e.key === 'T') {
        toggleTool('taperedBrush');
      } else if (e.key === 'Escape') {
        deactivateAll();
      }
    });
  }

  function positionNearCanvas() {
    if (!toolbarEl || !gameCanvas) return;
    const rect = gameCanvas.getBoundingClientRect();
    toolbarEl.style.top = rect.top + 'px';
    toolbarEl.style.left = (rect.right + 10) + 'px';
  }

  function makeDraggable(el, handle) {
    let isDragging = false;
    let startX, startY, origX, origY;

    handle.addEventListener('pointerdown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = el.offsetLeft;
      origY = el.offsetTop;
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      el.style.left = (origX + e.clientX - startX) + 'px';
      el.style.top = (origY + e.clientY - startY) + 'px';
    });

    handle.addEventListener('pointerup', () => {
      isDragging = false;
    });
  }

  function destroy() {
    deactivateAll();
    if (toolbarEl && toolbarEl.parentElement) {
      toolbarEl.parentElement.removeChild(toolbarEl);
    }
    toolbarEl = null;
    tools = {};
    activeTool = null;
  }

  return { init, destroy };
})();
