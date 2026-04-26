/* ============================================================
   main.js
   Orchestration: ties the background neural field, foreground
   axon propagation, and HTML page-track together into the
   narrative sequence the user described.

   Sequence on load:
   1. Page is fully dark. Nothing visible except faint background.
   2. After ~600ms, an axon enters from the left edge.
   3. Axon races toward the home title and "contacts" it.
   4. On contact, the home page ignites (title flares, content
      fades in, ambient neurons brighten).
   5. User clicks a button -> outgoing axon, transition burst,
      viewport pans to the corresponding page, and that page
      ignites the moment its incoming axon reaches its title.
   6. "Return to home" works the same way in reverse.
   ============================================================ */

(function () {
    'use strict';

    // Page-track DOM element
    const track = document.getElementById('page-track');

    // Map of page name to index in the horizontal track
    const PAGE_INDEX = {
        home: 0,
        about: 1,
        startup: 2
    };

    // Track which pages have already been ignited so we don't
    // re-run the ignition animation unnecessarily.
    const ignited = { home: false, about: false, startup: false };

    // Currently visible page
    let currentPage = 'home';

    // Lock to prevent double-clicks during transition
    let transitioning = false;

    /* -------- Helpers -------- */
    function getTitleCenterForPage(pageName) {
        const pageEl = document.getElementById('page-' + pageName);
        const titleEl = pageEl.querySelector('.title');
        const rect = titleEl.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    function ignitePage(pageName) {
        if (ignited[pageName]) return;
        ignited[pageName] = true;

        const contentEl = document.getElementById(pageName + '-content');
        contentEl.classList.add('lit');
        contentEl.classList.remove('dark');

        // Brighten the ambient neurons on this page
        if (window.neuralBg) {
            window.neuralBg.ignitePage(PAGE_INDEX[pageName]);
        }
    }

    function panToPage(pageName) {
        const idx = PAGE_INDEX[pageName];
        // The track is 300% wide; each page is 33.333% of the track.
        // To bring page idx into view, translate by -idx * 100% of viewport.
        track.style.transform = `translateX(-${idx * (100 / 3)}%)`;

        // Mirror the same pan in the background so neurons follow
        if (window.neuralBg) {
            window.neuralBg.setViewportOffset(idx * window.innerWidth);
        }
    }

    /* -------- Initial ignition sequence -------- */
    function runInitialIgnition() {
        // Wait briefly so the user perceives the dark state
        setTimeout(() => {
            const title = getTitleCenterForPage('home');
            window.axonFg.fireIgnitionAxon(title.x, title.y, () => {
                ignitePage('home');
            });
        }, 700);
    }

    /* -------- Button-triggered page transition -------- */
    function transitionToPage(targetPage, originButton) {
        if (transitioning) return;
        if (targetPage === currentPage) return;
        transitioning = true;

        // Visual feedback on the originating button
        if (originButton) {
            originButton.classList.add('firing');
        }

        // Compute the origin point of the outgoing axon
        // (center of the clicked button, in viewport coords)
        let originX = window.innerWidth / 2;
        let originY = window.innerHeight / 2;
        if (originButton) {
            const r = originButton.getBoundingClientRect();
            originX = r.left + r.width / 2;
            originY = r.top + r.height / 2;
        }

        // 1. Fire outgoing axon from the button to the right edge
        window.axonFg.fireOutgoingAxon(originX, originY);

        // 2. Begin continuous burst of synaptic activity
        window.axonFg.startTransitionBurst();

        // 3. After a short delay, begin panning to the next page
        setTimeout(() => {
            panToPage(targetPage);
        }, 350);

        // 4. Once the pan completes, fire incoming axon on the new
        //    page. The pan transition is 1.4s in CSS; we time the
        //    incoming axon to arrive shortly after the pan settles.
        setTimeout(() => {
            window.axonFg.stopTransitionBurst();

            const newTitle = getTitleCenterForPage(targetPage);
            if (ignited[targetPage]) {
                // Already lit (return visit) — just clear the flag and finish
                currentPage = targetPage;
                transitioning = false;
                if (originButton) originButton.classList.remove('firing');
            } else {
                window.axonFg.fireIgnitionAxon(newTitle.x, newTitle.y, () => {
                    ignitePage(targetPage);
                    currentPage = targetPage;
                    transitioning = false;
                    if (originButton) originButton.classList.remove('firing');
                });
            }
        }, 1750);
    }

    /* -------- Bind button events -------- */
    function bindButtons() {
        const buttons = document.querySelectorAll('.neural-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = btn.dataset.target;
                if (target) {
                    transitionToPage(target, btn);
                }
            });
        });
    }

    /* -------- Boot -------- */
    function boot() {
        bindButtons();
        runInitialIgnition();
    }

    // Wait for fonts/layout to settle so title position is accurate
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
