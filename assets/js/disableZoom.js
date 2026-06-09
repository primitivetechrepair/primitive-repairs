// assets/js/disableZoom.js

// Prevent pinch zoom on mobile browsers.
document.addEventListener(
  "touchmove",
  function (event) {
    if (event.scale !== undefined && event.scale !== 1) {
      event.preventDefault();
    }

    if (event.touches && event.touches.length > 1) {
      event.preventDefault();
    }
  },
  { passive: false }
);

// Prevent double-tap zoom.
let lastTouchEnd = 0;

document.addEventListener(
  "touchend",
  function (event) {
    const now = Date.now();

    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }

    lastTouchEnd = now;
  },
  { passive: false }
);

// Prevent gesture zoom on iOS Safari.
["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
  document.addEventListener(
    eventName,
    function (event) {
      event.preventDefault();
    },
    { passive: false }
  );
});