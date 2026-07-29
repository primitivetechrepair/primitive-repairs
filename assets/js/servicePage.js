(() => {
  "use strict";

  const media = Array.from(
    document.querySelectorAll("[data-service-parallax]")
  );

  if (!media.length) {
    return;
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  const items = media.map((element) => ({
    element,
    current: 0,
    target: 0
  }));
  let measureFrame = 0;
  let motionFrame = 0;

  const resetParallax = () => {
    items.forEach((item) => {
      item.current = 0;
      item.target = 0;
      item.element.style.setProperty("--service-parallax-y", "0px");
    });
  };

  const renderMotion = () => {
    motionFrame = 0;
    let shouldContinue = false;

    items.forEach((item) => {
      const distance = item.target - item.current;

      if (Math.abs(distance) <= 0.08) {
        item.current = item.target;
      } else {
        item.current += distance * 0.14;
        shouldContinue = true;
      }

      item.element.style.setProperty(
        "--service-parallax-y",
        `${item.current.toFixed(2)}px`
      );
    });

    if (shouldContinue) {
      motionFrame = window.requestAnimationFrame(renderMotion);
    }
  };

  const startMotion = () => {
    if (!motionFrame) {
      motionFrame = window.requestAnimationFrame(renderMotion);
    }
  };

  const measureParallax = () => {
    measureFrame = 0;

    if (reducedMotion.matches) {
      resetParallax();
      return;
    }

    const viewportHeight = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight
    );
    const travel = window.innerWidth <= 720 ? 38 : 72;

    items.forEach((item) => {
      const bounds = item.element.getBoundingClientRect();
      const isNearViewport =
        bounds.bottom >= -bounds.height &&
        bounds.top <= viewportHeight + bounds.height;

      if (!isNearViewport) {
        return;
      }

      const progress =
        (viewportHeight - bounds.top) /
        (viewportHeight + bounds.height);
      const centeredProgress = Math.max(
        -0.5,
        Math.min(0.5, progress - 0.5)
      );

      item.target = centeredProgress * travel * 2;
    });

    startMotion();
  };

  const requestParallaxMeasure = () => {
    if (!measureFrame) {
      measureFrame = window.requestAnimationFrame(measureParallax);
    }
  };

  window.addEventListener("scroll", requestParallaxMeasure, {
    passive: true
  });
  window.addEventListener("resize", requestParallaxMeasure);
  window.addEventListener("orientationchange", requestParallaxMeasure);
  window.addEventListener("load", requestParallaxMeasure, {
    once: true
  });
  reducedMotion.addEventListener?.("change", requestParallaxMeasure);

  requestParallaxMeasure();
})();
