(function () {
  'use strict';

  var toggle = document.querySelector('.nav-toggle');
  var nav    = document.querySelector('.primary-nav');
  var list   = document.getElementById('primary-nav-list');

  if (!toggle || !nav || !list) return;

  function openNav() {
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
    nav.classList.add('is-open');
    // Move focus to first link so keyboard users enter the menu immediately
    var first = list.querySelector('a');
    if (first) first.focus();
  }

  function closeNav(returnFocus) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    nav.classList.remove('is-open');
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', function () {
    if (toggle.getAttribute('aria-expanded') === 'true') {
      closeNav(false);
    } else {
      openNav();
    }
  });

  // Escape key closes the menu and returns focus to the toggle button
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeNav(true);
    }
  });

  // Click outside closes the menu
  document.addEventListener('click', function (e) {
    if (
      toggle.getAttribute('aria-expanded') === 'true' &&
      !toggle.contains(e.target) &&
      !nav.contains(e.target)
    ) {
      closeNav(false);
    }
  });
})();
