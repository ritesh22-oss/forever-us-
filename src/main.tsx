// Safeguard window.fetch for browser extensions and test interceptors
try {
  if (typeof window !== 'undefined') {
    const rawFetch = window.fetch;
    let currentFetch = typeof rawFetch === 'function' ? rawFetch.bind(window) : rawFetch;
    try {
      Object.defineProperty(window, 'fetch', {
        get() {
          return currentFetch;
        },
        set(val) {
          currentFetch = val;
        },
        configurable: true,
        enumerable: true,
      });
    } catch (_) {
      try {
        const proto = Object.getPrototypeOf(window) || Window.prototype;
        if (proto) {
          Object.defineProperty(proto, 'fetch', {
            get() {
              return currentFetch;
            },
            set(val) {
              currentFetch = val;
            },
            configurable: true,
            enumerable: true,
          });
        }
      } catch (__) {}
    }
  }
} catch (_) {}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
