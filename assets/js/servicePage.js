(() => {
  "use strict";

  const media = document.querySelectorAll("[data-service-parallax]");

  if (!media.length) {
    return;
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  let animationFrame = 0;

  const updateParallax = () => {
    animationFrame = 0;

    if (reducedMotion.matches) {
      media.forEach((element) => {
        element.style.setProperty("--service-parallax-y", "0px");
      });
      return;
    }

    const viewportHeight = window.innerHeight;
    const travel = window.innerWidth <= 720 ? 24 : 42;

    media.forEach((element) => {
      const bounds = element.getBoundingClientRect();

      if (bounds.bottom < 0 || bounds.top > viewportHeight) {
        return;
      }

      const mediaCenter = bounds.top + bounds.height / 2;
      const viewportCenter = viewportHeight / 2;
      const distance = viewportCenter - mediaCenter;
      const range = viewportHeight + bounds.height;
      const progress = Math.max(-0.5, Math.min(0.5, distance / range));
      const offset = progress * travel * 2;

      element.style.setProperty(
        "--service-parallax-y",
        `${offset.toFixed(2)}px`
      );
    });
  };

  const requestParallaxUpdate = () => {
    if (animationFrame) {
      return;
    }

    animationFrame = window.requestAnimationFrame(updateParallax);
  };

  window.addEventListener("scroll", requestParallaxUpdate, {
    passive: true
  });
  window.addEventListener("resize", requestParallaxUpdate);
  reducedMotion.addEventListener?.("change", requestParallaxUpdate);

  requestParallaxUpdate();
})();
