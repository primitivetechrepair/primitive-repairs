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
            <a href="/#primitive-wizard-container">Start Repair Request</a>
            <a href="/#how-it-works">How It Works</a>
            <a href="/#repair-services">Supported Devices</a>
            <a href="/phone-repair-miami">Phone Repair</a>
            <a href="/warranty">Warranty Support</a>
            <a href="/faq">FAQs</a>
            <a href="/contact-us">Contact Us</a>
          </div>
        </div>

        <a href="#" class="nav-disabled" aria-disabled="true">
          Accessories
          <span>Coming Soon</span>
        </a>

        <a href="#" class="nav-disabled" aria-disabled="true">
          Buy a Device
          <span>Coming Soon</span>
        </a>

        <a href="#" class="nav-disabled" aria-disabled="true">
          Tech News
          <span>Coming Soon</span>
        </a>

        <a href="/#primitive-wizard-container" class="nav-cta">
          Start Repair Request
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
        <a href="/#primitive-wizard-container">Start Repair Request</a>
        <a href="/#how-it-works">How It Works</a>
        <a href="/#repair-services">Supported Devices</a>
        <a href="/phone-repair-miami">Phone Repair</a>
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
        <a href="/#primitive-wizard-container">Start a repair request</a>
      </div>
    </aside>

    <div class="mobile-sticky-booking-bar" id="mobile-sticky-booking-bar" aria-label="Quick repair actions">
      <a href="/#primitive-wizard-container" class="mobile-sticky-booking-primary">
        Start Repair
      </a>

      <a href="tel:+13059074308" class="mobile-sticky-booking-secondary">
        Call
      </a>

      <a href="sms:+13059074308" class="mobile-sticky-booking-secondary">
        Text
      </a>
    </div>
  `;

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
})();