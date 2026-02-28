// early-inject.js — Runs before Gartic Phone to enable synthetic drawing events
// Wraps addEventListener so GarticLasso's dispatched events bypass isTrusted checks

(function () {
  'use strict';

  window.__garticLassoEvents = new WeakSet();
  window.__garticLassoBlocking = false;

  const WRAPPED_TYPES = new Set(['mousedown', 'mousemove', 'mouseup']);

  // Map original listeners → wrapped versions for proper removeEventListener support
  const listenerMap = new WeakMap();

  const origAdd = EventTarget.prototype.addEventListener;
  const origRemove = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (WRAPPED_TYPES.has(type) && typeof listener === 'function') {
      let wrapped = listenerMap.get(listener);
      if (!wrapped) {
        wrapped = function (event) {
          // Fast path: trusted event, no blocking — call directly
          if (event.isTrusted) {
            if (window.__garticLassoBlocking) return;
            return listener.call(this, event);
          }
          // Our synthetic event — proxy isTrusted
          if (window.__garticLassoEvents.has(event)) {
            const proxy = new Proxy(event, {
              get(target, prop) {
                if (prop === 'isTrusted') return true;
                const val = Reflect.get(target, prop);
                return typeof val === 'function' ? val.bind(target) : val;
              }
            });
            return listener.call(this, proxy);
          }
          return listener.call(this, event);
        };
        listenerMap.set(listener, wrapped);
      }
      return origAdd.call(this, type, wrapped, options);
    }
    return origAdd.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function (type, listener, options) {
    if (WRAPPED_TYPES.has(type) && typeof listener === 'function') {
      const wrapped = listenerMap.get(listener);
      if (wrapped) {
        return origRemove.call(this, type, wrapped, options);
      }
    }
    return origRemove.call(this, type, listener, options);
  };
})();
