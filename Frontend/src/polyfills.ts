/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 */

// Polyfill for 'global' variable (required by SockJS and other Node.js libraries)
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

