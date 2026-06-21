/* =========================================================
   UNIVERSAL SITE FOOTER
   Primitive Tech Repairs
========================================================= */

(function () {
  const footerRoot = document.getElementById("site-footer-root");

  if (!footerRoot) return;

  footerRoot.innerHTML = `
    <footer class="site-footer">
      <div class="site-footer-inner">
        <div class="site-footer-top">
          <a href="/" class="site-footer-logo" aria-label="Primitive Tech Repairs Home">
            <img src="/images/logo.svg" alt="Primitive Tech Repairs logo">
          </a>
        </div>

        <div class="site-footer-link-groups">
          <div class="site-footer-link-group">
            <h4 class="site-footer-link-title">Socials</h4>

            <nav class="site-footer-links site-footer-social-links" aria-label="Footer social links">
              <a href="https://www.facebook.com/primitiverepairs.mobileservices" target="_blank" rel="noopener noreferrer">
                <svg class="site-footer-social-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14.2 8.3V6.7c0-.8.5-1 1-1h1.9V2.4c-.3 0-1.5-.1-2.9-.1-2.9 0-4.9 1.8-4.9 5v1H6v3.7h3.3v9.6h4v-9.6h3.1l.5-3.7h-3.6z"></path>
                </svg>
                <span>Facebook</span>
              </a>

              <a href="https://www.instagram.com/primitivetechrepair" target="_blank" rel="noopener noreferrer">
                <svg class="site-footer-social-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7.8 2.5h8.4c2.9 0 5.3 2.4 5.3 5.3v8.4c0 2.9-2.4 5.3-5.3 5.3H7.8c-2.9 0-5.3-2.4-5.3-5.3V7.8c0-2.9 2.4-5.3 5.3-5.3zm0 3.1c-1.2 0-2.2 1-2.2 2.2v8.4c0 1.2 1 2.2 2.2 2.2h8.4c1.2 0 2.2-1 2.2-2.2V7.8c0-1.2-1-2.2-2.2-2.2H7.8zm4.2 2.7a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4zm0 2.4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm4.1-2.7a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z"></path>
                </svg>
                <span>Instagram</span>
              </a>

              <a href="#" aria-label="TikTok">
                <svg class="site-footer-social-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.6 2.5c.3 2.4 1.6 3.8 4 4v3.5c-1.5.1-2.8-.3-4-1.1v5.9c0 4.5-4.9 7.3-8.8 4.9-4-2.4-3.3-8.6 1.2-10 .9-.3 1.8-.3 2.8-.1v3.7c-.4-.1-.8-.1-1.2 0-2 .4-2.6 3.1-.9 4.2 1.5 1 3.5-.1 3.5-1.9V2.5h3.4z"></path>
                </svg>
                <span>TikTok</span>
              </a>
            </nav>
          </div>

          <div class="site-footer-link-group">
            <h4 class="site-footer-link-title">Information</h4>

            <nav class="site-footer-links" aria-label="Footer information links">
  <a href="/#primitive-wizard-container">Start Repair Request</a>
  <a href="/#how-it-works">How It Works</a>
  <a href="/#repair-services">Supported Devices</a>
  <a href="/warranty">Warranty Support</a>
  <a href="/faq">FAQs</a>
  <a href="/contact-us">Contact Us</a>
</nav>
          </div>

          <div class="site-footer-link-group site-footer-repair-group">
            <details class="site-footer-repair-details">
              <summary class="site-footer-link-title">Repair Services</summary>

              <nav class="site-footer-links" aria-label="Footer repair service links">
                <a href="/phone-repair-miami">Phone Repair</a>
                <a href="/iphone-repair-miami">iPhone Repair</a>
                <a href="/samsung-repair-miami">Samsung Repair</a>
                <a href="/google-pixel-repair-miami">Google Pixel Repair</a>
                <a href="/motorola-repair-miami">Motorola Repair</a>
                <a href="/screen-repair-miami">Screen Repair</a>
                <a href="/battery-replacement-miami">Battery Replacement</a>
                <a href="/charging-port-repair-miami">Charging Port Repair</a>
                <a href="/usb-c-port-repair-miami">USB-C Port Repair</a>
                <a href="/back-glass-repair-miami">Back Glass Repair</a>
                <a href="/camera-repair-miami">Camera Repair</a>
                <a href="/ipad-repair-miami">iPad Repair</a>
                <a href="/tablet-repair-miami">Tablet Repair</a>
                <a href="/computer-repair-miami">Computer Repair</a>
                <a href="/game-console-repair-miami">Game Console Repair</a>
                <a href="/nintendo-switch-repair-miami">Nintendo Switch Repair</a>
                <a href="/hdmi-port-repair-miami">HDMI Port Repair</a>
                <a href="/ps5-hdmi-repair-miami">PS5 HDMI Repair</a>
                <a href="/xbox-hdmi-repair-miami">Xbox HDMI Repair</a>
                <a href="/no-power-repair-miami">No Power Repair</a>
                <a href="/meta-glasses-repair-miami">Meta Glasses Repair</a>
                <a href="/water-damage-repair-miami">Water Damage Repair</a>
                <a href="/microsoldering-repair-miami">Microsoldering Repair</a>
              </nav>
            </details>
          </div>
        </div>

        <div class="site-footer-bottom">
          <span>© 2026 Primitive Tech Repairs. All rights reserved.</span>
          <span>Miami mobile device repair service.</span>
        </div>
      </div>
    </footer>
  `;

  const repairDetails = footerRoot.querySelector(".site-footer-repair-details");

  function syncRepairDropdownMode() {
    if (!repairDetails) return;

    if (window.matchMedia("(min-width: 761px)").matches) {
      repairDetails.setAttribute("open", "");
    } else {
      repairDetails.removeAttribute("open");
    }
  }

  syncRepairDropdownMode();
  window.addEventListener("resize", syncRepairDropdownMode);
})();