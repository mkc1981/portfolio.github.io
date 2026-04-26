/* ============================================================
   nda.js
   Soft acknowledgment gate for the Startup page.

   Behavior:
   - When the user attempts to navigate to the Startup page and
     has not previously acknowledged, the modal is shown.
   - Acknowledgment is recorded in localStorage on the user's
     own device. No data is transmitted off the device.
   - On subsequent visits from the same browser, the user is
     not re-prompted.

   The data captured locally (name, affiliation, ISO timestamp)
   exists only on the visitor's device. This is by design: the
   site is hosted on GitHub Pages, which is purely static and
   has no server-side capability to store or retrieve such data.
   ============================================================ */

(function () {
    'use strict';

    const STORAGE_KEY = 'marma_nda_acknowledged_v1';

    // DOM references
    const overlay = document.getElementById('nda-overlay');
    const form = document.getElementById('nda-form');
    const nameInput = document.getElementById('nda-name');
    const affiliationInput = document.getElementById('nda-affiliation');
    const agreeCheckbox = document.getElementById('nda-agree');
    const errorEl = document.getElementById('nda-error');
    const cancelBtn = document.getElementById('nda-cancel');

    // Callback supplied by main.js: invoked when acknowledgment
    // is successful so the page transition can proceed.
    let pendingProceedCallback = null;

    /* -------- Public API --------
       main.js calls these to coordinate with page navigation.
       ============================================================ */
    window.ndaGate = {
        // Returns true if the user has already acknowledged on
        // this device.
        isAcknowledged() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return false;
                const data = JSON.parse(raw);
                return Boolean(data && data.acknowledged);
            } catch (e) {
                return false;
            }
        },

        // Show the modal. If the user successfully acknowledges,
        // onProceed() is invoked. If they cancel, onCancel() is
        // invoked.
        prompt(onProceed, onCancel) {
            pendingProceedCallback = onProceed;
            this._cancelCallback = onCancel || null;
            this._show();
        },

        // Programmatically clear the acknowledgment (useful for
        // debugging from the browser console).
        clear() {
            localStorage.removeItem(STORAGE_KEY);
        },

        _cancelCallback: null,

        _show() {
            overlay.classList.add('visible');
            overlay.setAttribute('aria-hidden', 'false');
            // Focus the name field for keyboard users
            setTimeout(() => nameInput.focus(), 100);
            // Lock background scroll
            document.body.style.overflow = 'hidden';
        },

        _hide() {
            overlay.classList.remove('visible');
            overlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    };

    /* -------- Form submission handler -------- */
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        errorEl.textContent = '';

        const name = nameInput.value.trim();
        const affiliation = affiliationInput.value.trim();
        const agreed = agreeCheckbox.checked;

        // Client-side validation
        if (name.length < 2) {
            errorEl.textContent = 'Please enter your full name.';
            nameInput.focus();
            return;
        }
        if (!agreed) {
            errorEl.textContent = 'You must acknowledge the terms to continue.';
            agreeCheckbox.focus();
            return;
        }

        // Persist acknowledgment locally. This is the only record
        // of the acknowledgment, and it lives only on this device.
        const record = {
            acknowledged: true,
            name: name,
            affiliation: affiliation || null,
            timestamp: new Date().toISOString()
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
        } catch (e) {
            // localStorage may be unavailable in private browsing.
            // The acknowledgment will still proceed for this session.
            console.warn('Local acknowledgment storage failed:', e);
        }

        // Hide modal and proceed
        window.ndaGate._hide();
        if (pendingProceedCallback) {
            const cb = pendingProceedCallback;
            pendingProceedCallback = null;
            cb();
        }
    });

    /* -------- Cancel handler -------- */
    cancelBtn.addEventListener('click', function () {
        errorEl.textContent = '';
        window.ndaGate._hide();
        if (window.ndaGate._cancelCallback) {
            const cb = window.ndaGate._cancelCallback;
            window.ndaGate._cancelCallback = null;
            cb();
        }
        pendingProceedCallback = null;
    });

    /* -------- Escape key closes the modal -------- */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('visible')) {
            cancelBtn.click();
        }
    });

})();
