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
          Start Request
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
  `;
})();