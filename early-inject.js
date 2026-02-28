// early-inject.js — Runs before Gartic Phone to enable synthetic drawing events
// Wraps addEventListener so GarticLasso's dispatched events bypass isTrusted checks

(function () {
  'use strict';

  // Track events dispatched by GarticLasso
  window.__garticLassoEvents = new WeakSet();

  // When true, block real (trusted) mouse events from reaching Gartic Phone
  window.__garticLassoBlocking = false;

  const origAddEventListener = EventTarget.prototype.addEventListener;

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    // Only wrap drawing-related mouse events
    if (['mousedown', 'mousemove', 'mouseup'].includes(type) && typeof listener === 'function') {
      const origListener = listener;
      const wrappedListener = function (event) {
        // Block real mouse events during fill operations
        if (event.isTrusted && window.__garticLassoBlocking) {
          return;
        }

        // If this is a GarticLasso synthetic event, proxy it with isTrusted: true
        if (!event.isTrusted && window.__garticLassoEvents.has(event)) {
          const proxy = new Proxy(event, {
            get(target, prop) {
              if (prop === 'isTrusted') return true;
              const val = Reflect.get(target, prop);
              return typeof val === 'function' ? val.bind(target) : val;
            }
          });
          return origListener.call(this, proxy);
        }
        return origListener.call(this, event);
      };
      return origAddEventListener.call(this, type, wrappedListener, options);
    }
    return origAddEventListener.call(this, type, listener, options);
  };
})();
