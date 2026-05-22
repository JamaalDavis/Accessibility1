(function () {
  'use strict';

  var form         = document.getElementById('contact-form');
  var statusRegion = document.getElementById('form-status');

  if (!form) return;

  // Returns the visible label text for a field (strips the required marker)
  function labelFor(field) {
    var label = form.querySelector('label[for="' + field.id + '"]');
    return label ? label.textContent.replace('*', '').trim() : field.name;
  }

  // Validates a single field; updates aria-invalid and the linked error span.
  // Returns true when valid.
  function validateField(field) {
    var errorEl  = document.getElementById(
      (field.getAttribute('aria-describedby') || '').split(' ').pop()
    );
    var errorMsg = '';

    if (field.validity.valueMissing) {
      errorMsg = labelFor(field) + ' is required.';
    } else if (field.validity.typeMismatch && field.type === 'email') {
      errorMsg = 'Enter a valid email address (e.g. you@example.com).';
    } else if (field.validity.tooShort) {
      errorMsg = labelFor(field) + ' must be at least ' + field.minLength + ' characters.';
    }

    if (errorMsg) {
      field.setAttribute('aria-invalid', 'true');
      if (errorEl) errorEl.textContent = errorMsg;
      return false;
    }

    field.setAttribute('aria-invalid', 'false');
    if (errorEl) errorEl.textContent = '';
    return true;
  }

  // Validate on blur (after first interaction with the field)
  // Clear error live as the user corrects the value
  Array.prototype.forEach.call(
    form.querySelectorAll('input, select, textarea'),
    function (field) {
      field.addEventListener('blur', function () {
        validateField(field);
      });

      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') {
          validateField(field);
        }
      });
    }
  );

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var isValid      = true;
    var firstInvalid = null;

    Array.prototype.forEach.call(
      form.querySelectorAll('input, select, textarea'),
      function (field) {
        if (!validateField(field) && !firstInvalid) {
          firstInvalid = field;
          isValid = false;
        }
      }
    );

    if (!isValid) {
      firstInvalid.focus();
      if (statusRegion) {
        statusRegion.className = 'form-status is-error';
        statusRegion.textContent =
          'Please correct the errors below before submitting.';
      }
      return;
    }

    // Simulated success — replace with real network request as needed
    if (statusRegion) {
      statusRegion.className = 'form-status is-success';
      statusRegion.textContent =
        'Your message has been sent. We will reply within 2 business days.';
      statusRegion.focus();
    }

    form.reset();

    Array.prototype.forEach.call(
      form.querySelectorAll('[aria-invalid]'),
      function (field) {
        field.removeAttribute('aria-invalid');
      }
    );
  });
})();
