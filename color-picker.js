// color-picker.js — Reads the currently selected color from Gartic Phone's UI

window.GarticLasso = window.GarticLasso || {};

GarticLasso.ColorPicker = (function () {
  'use strict';

  let cachedColor = '#000000';
  let intervalId = null;

  function init() {
    updateColor();
    intervalId = setInterval(updateColor, 500);

    return {
      getColor,
      getColorRGBA
    };
  }

  function updateColor() {
    const color = readColorFromUI();
    if (color) {
      cachedColor = color;
    }
  }

  function readColorFromUI() {
    // Strategy 1: Look for the active color swatch in Gartic Phone's toolbar
    // Gartic Phone uses a color picker with selectable swatches
    const activeColor = document.querySelector(
      '[class*="color"][class*="active"], ' +
      '[class*="color"][class*="selected"], ' +
      '[class*="Color"][class*="active"]'
    );
    if (activeColor) {
      const bg = activeColor.style.backgroundColor;
      if (bg) return bg;
    }

    // Strategy 2: Check for a custom color input
    const colorInput = document.querySelector('input[type="color"]');
    if (colorInput) return colorInput.value;

    // Strategy 3: Look for any element with a data-color attribute that's selected
    const dataColor = document.querySelector('[data-color][class*="active"], [data-color][aria-selected="true"]');
    if (dataColor) return dataColor.dataset.color;

    // Strategy 4: Scan for color picker panel with visible selected state
    const colorElements = document.querySelectorAll('[class*="color" i]');
    for (const el of colorElements) {
      const style = window.getComputedStyle(el);
      if (el.style.backgroundColor && (
        style.border.includes('2px') ||
        style.outline.includes('2px') ||
        el.classList.toString().includes('select') ||
        el.classList.toString().includes('active')
      )) {
        return el.style.backgroundColor;
      }
    }

    return null;
  }

  function getColor() {
    return cachedColor;
  }

  function getColorRGBA() {
    // Convert any CSS color to RGBA using a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const ctx = tempCanvas.getContext('2d');
    ctx.fillStyle = cachedColor;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3] };
  }

  function destroy() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { init, destroy };
})();
