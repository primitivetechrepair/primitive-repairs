(function () {
  const headerRoot = document.getElementById("site-header-root");

  if (!headerRoot) return;

  headerRoot.innerHTML = `
    <header class="site-nav">
      <a href="/" class="site-brand" aria-label="Primitive Tech Repairs Home">
        <span class="site-brand-logo">
          <img src="/images/logo.svg" alt="Primitive Tech Repairs logo">
        </span>
      </a>

      <nav class="site-nav-links" aria-label="Primary navigation">
        <div class="nav-dropdown">
          <button type="button" class="nav-dropdown-btn">
            Repair
            <span aria-hidden="true">&#9662;</span>
          </button>

          <div class="nav-dropdown-menu">
            <a href="/#pr-main">Book a Repair</a>
            <a href="/#how-it-works">How It Works</a>
            <a href="/#repair-services">Supported Devices</a>
            <a href="/phone-repair-miami">Phone Repair</a>
            <a href="/iphone-screen-repair-miami">iPhone Screen Repair</a>
            <a href="/warranty">Warranty Support</a>
            <a href="/faq">FAQs</a>
            <a href="/contact-us">Contact Us</a>
          </div>
        </div>

        <span class="nav-disabled" aria-disabled="true">
          Accessories
          <span>Coming Soon</span>
        </span>

        <span class="nav-disabled" aria-disabled="true">
          Buy a Device
          <span>Coming Soon</span>
        </span>

        <span class="nav-disabled" aria-disabled="true">
          Tech News
          <span>Coming Soon</span>
        </span>

        <a href="/#pr-main" class="nav-cta">
          Start Repair Request
        </a>
      </nav>

      <nav class="site-nav-socials" aria-label="Social media">
        <a
          href="https://www.facebook.com/primitiverepairs.mobileservices"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Primitive Tech Repairs on Facebook"
          title="Facebook"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M14.2 8.3V6.7c0-.8.5-1 1-1h1.9V2.4c-.3 0-1.5-.1-2.9-.1-2.9 0-4.9 1.8-4.9 5v1H6v3.7h3.3v9.6h4v-9.6h3.1l.5-3.7h-3.6z"></path>
          </svg>
        </a>

        <a
          href="https://www.instagram.com/primitivetechrepair"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Primitive Tech Repairs on Instagram"
          title="Instagram"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7.8 2.5h8.4c2.9 0 5.3 2.4 5.3 5.3v8.4c0 2.9-2.4 5.3-5.3 5.3H7.8c-2.9 0-5.3-2.4-5.3-5.3V7.8c0-2.9 2.4-5.3 5.3-5.3zm0 3.1c-1.2 0-2.2 1-2.2 2.2v8.4c0 1.2 1 2.2 2.2 2.2h8.4c1.2 0 2.2-1 2.2-2.2V7.8c0-1.2-1-2.2-2.2-2.2H7.8zm4.2 2.7a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4zm0 2.4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm4.1-2.7a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z"></path>
          </svg>
        </a>

        <a
          href="#"
          aria-label="Primitive Tech Repairs on TikTok"
          title="TikTok"
          data-social-placeholder
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M16.6 2.5c.3 2.4 1.6 3.8 4 4v3.5c-1.5.1-2.8-.3-4-1.1v5.9c0 4.5-4.9 7.3-8.8 4.9-4-2.4-3.3-8.6 1.2-10 .9-.3 1.8-.3 2.8-.1v3.7c-.4-.1-.8-.1-1.2 0-2 .4-2.6 3.1-.9 4.2 1.5 1 3.5-.1 3.5-1.9V2.5h3.4z"></path>
          </svg>
        </a>
      </nav>

      <button
        type="button"
        class="mobile-menu-toggle"
        id="mobile-menu-toggle"
        aria-label="Open navigation menu"
        aria-expanded="false"
        aria-controls="mobile-nav-drawer"
      >
        &#9776;
      </button>
    </header>

    <div
      class="appointment-deadline-banner"
      id="appointment-deadline-banner"
      role="status"
      aria-live="polite"
    >
      <span class="appointment-deadline-pill">Booking Cutoff</span>

      <span class="appointment-deadline-copy" id="appointment-deadline-copy">
        Book before 7:00 PM ET or a $35 convenience fee applies.
      </span>

      <span class="appointment-deadline-countdown" id="appointment-deadline-countdown">
        --h --m --s
      </span>
    </div>

    <div class="mobile-nav-overlay" id="mobile-nav-overlay" hidden></div>

    <aside class="mobile-nav-drawer" id="mobile-nav-drawer" aria-hidden="true">
      <div class="mobile-nav-drawer-header">
        <div class="mobile-nav-brand">
          <img src="/images/logo.svg" alt="Primitive Tech Repairs logo">
        </div>

        <button
          type="button"
          class="mobile-nav-close"
          id="mobile-nav-close"
          aria-label="Close navigation menu"
        >
          &times;
        </button>
      </div>

      <nav class="mobile-nav-links" aria-label="Mobile navigation">
        <a href="/#pr-main">Book a Repair</a>
        <a href="/#how-it-works">How It Works</a>
        <a href="/#repair-services">Supported Devices</a>
        <a href="/phone-repair-miami">Phone Repair</a>
        <a href="/iphone-screen-repair-miami">iPhone Screen Repair</a>
        <a href="/warranty">Warranty Support</a>
        <a href="/faq">FAQs</a>
        <a href="/contact-us">Contact Us</a>

        <span class="mobile-nav-disabled">
          Accessories
          <small>Coming Soon</small>
        </span>

        <span class="mobile-nav-disabled">
          Buy a Device
          <small>Coming Soon</small>
        </span>

        <span class="mobile-nav-disabled">
          Tech News
          <small>Coming Soon</small>
        </span>
      </nav>

      <div class="mobile-nav-footer">
        <span>Need help?</span>
        <a href="/#pr-main">Book a repair</a>
      </div>
    </aside>

    <div class="mobile-sticky-booking-bar" id="mobile-sticky-booking-bar" aria-label="Quick repair actions">
      <a href="/#pr-main" class="mobile-sticky-booking-primary">
        <svg
          class="mobile-sticky-booking-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M22.7 19.3 16.3 12.9a5.1 5.1 0 0 0-6.7-6.5l3.1 3.1-3.2 3.2-3.1-3.1a5.1 5.1 0 0 0 6.5 6.7l6.4 6.4a1 1 0 0 0 1.4 0l2-2a1 1 0 0 0 0-1.4Z"
          ></path>
        </svg>
        <span>Start Repair</span>
      </a>

      <a href="tel:+13059074308" class="mobile-sticky-booking-secondary">
        Call
      </a>

      <a href="sms:+13059074308" class="mobile-sticky-booking-secondary">
        Text
      </a>
    </div>
  `;

  headerRoot
    .querySelector("[data-social-placeholder]")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
    });

  const cutoffBanner = document.getElementById("appointment-deadline-banner");
  const cutoffCopy = document.getElementById("appointment-deadline-copy");
  const cutoffCountdown = document.getElementById("appointment-deadline-countdown");

  const EASTERN_TIME_ZONE = "America/New_York";
  const CUTOFF_HOUR = 19;

  function getTimeZoneParts(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).formatToParts(date);

    return parts.reduce((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = Number(part.value);
      }

      return acc;
    }, {});
  }

  function getTimeZoneOffset(date, timeZone) {
    const parts = getTimeZoneParts(date, timeZone);

    const normalizedHour = parts.hour === 24 ? 0 : parts.hour;

    const utcFromZoneParts = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      normalizedHour,
      parts.minute,
      parts.second
    );

    return utcFromZoneParts - date.getTime();
  }

  function makeEasternDate(year, month, day, hour, minute = 0, second = 0) {
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    const offset = getTimeZoneOffset(utcGuess, EASTERN_TIME_ZONE);

    return new Date(utcGuess.getTime() - offset);
  }

  function formatCountdown(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }

  function updateAppointmentDeadlineBanner() {
    if (!cutoffBanner || !cutoffCopy || !cutoffCountdown) return;

    const now = new Date();
    const easternNow = getTimeZoneParts(now, EASTERN_TIME_ZONE);

    const todayCutoff = makeEasternDate(
      easternNow.year,
      easternNow.month,
      easternNow.day,
      CUTOFF_HOUR
    );

    const remaining = todayCutoff.getTime() - now.getTime();

    if (remaining <= 0) {
      cutoffBanner.classList.add("is-after-cutoff");
      cutoffCopy.textContent = "Appointments after 7:00 PM ET include a $35 convenience fee.";
      cutoffCountdown.textContent = "Fee active";
      return;
    }

    cutoffBanner.classList.remove("is-after-cutoff");
    cutoffCopy.textContent = "Book before 7:00 PM ET or a $35 convenience fee applies.";
    cutoffCountdown.textContent = formatCountdown(remaining);
  }

  updateAppointmentDeadlineBanner();
  setInterval(updateAppointmentDeadlineBanner, 1000);

  const glassMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  let glassFrame = 0;
  let glassIdleTimer = 0;
  let previousScrollY = window.scrollY;

  function updateGlassReflection() {
    const scrollY = Math.max(0, window.scrollY);
    const scrollDelta = scrollY - previousScrollY;
    const reflectionPosition =
      ((scrollY * 0.18 + (scrollDelta >= 0 ? 12 : -12)) % 150) - 25;

    document.documentElement.style.setProperty(
      "--glass-reflection-x",
      `${reflectionPosition.toFixed(2)}%`
    );

    document.documentElement.style.setProperty(
      "--glass-reflection-tilt",
      scrollDelta >= 0 ? "112deg" : "68deg"
    );

    document.documentElement.classList.toggle(
      "glass-has-scrolled",
      scrollY > 12
    );

    previousScrollY = scrollY;
    glassFrame = 0;
  }

  function handleGlassScroll() {
    if (glassMotionQuery.matches) {
      document.documentElement.classList.toggle(
        "glass-has-scrolled",
        window.scrollY > 12
      );

      return;
    }

    document.documentElement.classList.add("glass-is-scrolling");

    window.clearTimeout(glassIdleTimer);
    glassIdleTimer = window.setTimeout(() => {
      document.documentElement.classList.remove("glass-is-scrolling");
    }, 180);

    if (!glassFrame) {
      glassFrame = window.requestAnimationFrame(updateGlassReflection);
    }
  }

  updateGlassReflection();
  window.addEventListener("scroll", handleGlassScroll, { passive: true });

  function focusRepairBooking(event) {
    const link = event.target.closest(
      'a[href="#primitive-wizard-container"], a[href="#pr-main"], a[href="/#primitive-wizard-container"], a[href="/#pr-main"]'
    );

    if (!link) return;

    const isHomePage =
      window.location.pathname === "/" ||
      window.location.pathname.endsWith("/index.html");

    if (!isHomePage) return;

    const bookingTarget = document.getElementById("pr-main");

    if (!bookingTarget) return;

    event.preventDefault();
    window.history.replaceState(null, "", "#pr-main");
    const scrollToRepairBooking = (behavior = "smooth") => {
      const targetTop =
        window.scrollY + bookingTarget.getBoundingClientRect().top;
      const offset = window.matchMedia("(max-width: 760px)").matches
        ? 162
        : 178;

      window.scrollTo({
        top: Math.max(0, targetTop - offset),
        behavior
      });
    };

    scrollToRepairBooking();

    window.setTimeout(() => {
      bookingTarget.focus({ preventScroll: true });
    }, 420);
  }

  document.addEventListener("click", focusRepairBooking);

  if (
    window.location.hash === "#primitive-wizard-container" ||
    window.location.hash === "#pr-main"
  ) {
    const revealRepairBooking = () => {
      const bookingTarget = document.getElementById("pr-main");

      if (!bookingTarget) return;

      window.history.replaceState(null, "", "#pr-main");
      const targetTop =
        window.scrollY + bookingTarget.getBoundingClientRect().top;
      const offset = window.matchMedia("(max-width: 760px)").matches
        ? 162
        : 178;

      window.scrollTo({
        top: Math.max(0, targetTop - offset),
        behavior: "auto"
      });
      bookingTarget.focus({ preventScroll: true });
    };

    window.requestAnimationFrame(revealRepairBooking);
    window.addEventListener("load", revealRepairBooking, { once: true });

    if (document.fonts?.ready) {
      document.fonts.ready.then(revealRepairBooking);
    }
  }
})();
