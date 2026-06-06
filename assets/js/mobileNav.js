const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
const mobileNavDrawer = document.getElementById("mobile-nav-drawer");
const mobileNavOverlay = document.getElementById("mobile-nav-overlay");
const mobileNavClose = document.getElementById("mobile-nav-close");
const mobileNavLinks = document.querySelectorAll(
  ".mobile-nav-links a, .mobile-nav-footer a"
);

function openMobileNav() {
  if (!mobileMenuToggle || !mobileNavDrawer || !mobileNavOverlay) return;

  mobileNavDrawer.classList.add("is-open");
  mobileNavDrawer.setAttribute("aria-hidden", "false");

  mobileMenuToggle.classList.add("is-open");
  mobileMenuToggle.setAttribute("aria-expanded", "true");

  mobileNavOverlay.hidden = false;
  document.body.classList.add("mobile-nav-open");
}

function closeMobileNav() {
  if (!mobileMenuToggle || !mobileNavDrawer || !mobileNavOverlay) return;

  mobileNavDrawer.classList.remove("is-open");
  mobileNavDrawer.setAttribute("aria-hidden", "true");

  mobileMenuToggle.classList.remove("is-open");
  mobileMenuToggle.setAttribute("aria-expanded", "false");

  mobileNavOverlay.hidden = true;
  document.body.classList.remove("mobile-nav-open");
}

mobileMenuToggle?.addEventListener("click", openMobileNav);
mobileNavClose?.addEventListener("click", closeMobileNav);
mobileNavOverlay?.addEventListener("click", closeMobileNav);

mobileNavLinks.forEach((link) => {
  link.addEventListener("click", closeMobileNav);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMobileNav();
  }
});