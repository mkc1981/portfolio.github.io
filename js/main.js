/* ============================================================
   main.js
   Parallelized regenerative cascade.

   The previous version sequenced cascade phases at t=0, 150ms,
   450ms, and 1850ms, which made content arrival feel laggy.
   The new cascade fires all phases in the first 400ms and
   ignites the destination page during the pan rather than
   after it, dropping click-to-content-visible time from
   roughly 2.7s to roughly 800ms.

   Timeline:
       t=0      Click. Button .firing class applied. Hemostasis
                flash at click site. Outgoing axon launches.
                Pan begins. Transition burst starts.
       t=180    Schwann cell wave released.
       t=300    Incoming ignition axon fires from off-screen-left
                of destination page toward its title (this happens
                DURING the pan so the user sees it traveling
                across the new territory as the pan completes).
       t=~600   Ignition axon contacts title. Page ignites.
                Content begins assembly.
       t=~900   Pan transition completes. Burst stops.
       t=~1100  Content fully assembled and visible.
   ============================================================ */

(function () {
    'use strict';

    const track = document.getElementById('page-track');

    const PAGE_INDEX = {
        home: 0,
        about: 1,
        principles: 2,
        startup: 3
    };

    const ignited = {
        home: false,
        about: false,
        principles: false,
        startup: false
    };

    let currentPage = 'home';
    let transitioning = false;

    /* -------- Geometry helpers -------- */
    function getTitleCenterForPage(pageName) {
        const pageEl = document.getElementById('page-' + pageName);
        const titleEl = pageEl.querySelector('.title');
        const rect = titleEl.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    function getElementCenter(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    /* -------- Ignition -------- */
    function ignitePage(pageName) {
        if (ignited[pageName]) return;
        ignited[pageName] = true;
        const contentEl = document.getElementById(pageName + '-content');
        contentEl.classList.add('lit');
        contentEl.classList.remove('dark');
        if (window.neuralBg) {
            window.neuralBg.ignitePage(PAGE_INDEX[pageName]);
        }
    }

    function panToPage(pageName) {
        const idx = PAGE_INDEX[pageName];
        track.style.transform = `translateX(-${idx * 25}%)`;
        if (window.neuralBg) {
            window.neuralBg.setViewportOffset(idx * window.innerWidth);
        }
    }

    function updateDiscoveryNodes() {
        const nodes = document.querySelectorAll('.discovery-node');
        nodes.forEach(node => {
            if (node.dataset.target === currentPage) {
                node.classList.add('is-current');
            } else {
                node.classList.remove('is-current');
            }
        });
    }

    /* -------- Initial home-page ignition -------- */
    function runInitialIgnition() {
        let igniteTriggered = false;
        const triggerIgnite = () => {
            if (igniteTriggered) return;
            igniteTriggered = true;
            ignitePage('home');
        };

        setTimeout(() => {
            const title = getTitleCenterForPage('home');
            window.axonFg.fireIgnitionAxon(title.x, title.y, triggerIgnite);
            // Failsafe: ignite home after 1.2s regardless
            setTimeout(triggerIgnite, 1200);
        }, 400);
    }

    /* ============================================================
       Parallelized transition cascade
       ============================================================ */
    function performTransition(targetPage, originElement) {
        if (transitioning) return;
        if (targetPage === currentPage) return;
        transitioning = true;

        if (originElement) {
            originElement.classList.add('firing');
        }

        // Compute click site
        let originX = window.innerWidth / 2;
        let originY = window.innerHeight / 2;
        if (originElement) {
            const c = getElementCenter(originElement);
            originX = c.x;
            originY = c.y;
        }

        /* PHASE 0 — t=0
           All immediate-feedback events fire together: the
           hemostasis flash gives the user instant visual
           confirmation of the click; the outgoing axon and
           transition burst begin; the pan begins. */
        window.axonFg.fireHemostasisFlash(originX, originY);
        window.axonFg.fireOutgoingAxon(originX, originY);
        window.axonFg.startTransitionBurst();
        panToPage(targetPage);

        /* PHASE 1 — t=180ms
           Schwann cell wave sweeps across the new territory. */
        setTimeout(() => {
            window.axonFg.fireSchwannWave();
        }, 180);

        /* PHASE 2 — t=300ms
           Ignition axon fires from off-screen-left of the
           destination page and races toward the title. This
           happens DURING the pan, so the user sees it as a
           continuous narrative rather than a delay. */
        setTimeout(() => {
            const newTitle = getTitleCenterForPage(targetPage);

            const finalize = () => {
                currentPage = targetPage;
                transitioning = false;
                updateDiscoveryNodes();
                if (originElement) originElement.classList.remove('firing');
            };

            if (ignited[targetPage]) {
                finalize();
            } else {
                let igniteTriggered = false;
                const triggerIgnite = () => {
                    if (igniteTriggered) return;
                    igniteTriggered = true;
                    ignitePage(targetPage);
                    finalize();
                };

                window.axonFg.fireIgnitionAxon(newTitle.x, newTitle.y,
                    triggerIgnite);

                // Failsafe: ignite after 800ms regardless
                setTimeout(triggerIgnite, 800);
            }
        }, 300);

        /* PHASE 3 — t=950ms
           Pan has completed; stop the transition burst. */
        setTimeout(() => {
            window.axonFg.stopTransitionBurst();
        }, 950);
    }

    /* -------- NDA-gated entry point -------- */
    function transitionToPage(targetPage, originElement) {
        if (transitioning) return;

        if (targetPage === 'startup' && !window.ndaGate.isAcknowledged()) {
            window.ndaGate.prompt(
                () => performTransition(targetPage, originElement),
                () => {
                    if (originElement) originElement.classList.remove('firing');
                }
            );
            return;
        }

        performTransition(targetPage, originElement);
    }

    /* -------- Bind navigation -------- */
    function bindButtons() {
        const navButtons = document.querySelectorAll('.bio-btn, .neural-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                if (target) transitionToPage(target, btn);
            });
        });

        const discoveryNodes = document.querySelectorAll('.discovery-node');
        discoveryNodes.forEach(node => {
            node.addEventListener('click', () => {
                const target = node.dataset.target;
                if (target && target !== currentPage) {
                    transitionToPage(target, node);
                }
            });
        });
    }

    /* -------- Bind tabs -------- */
    function bindTabs() {
        const tabContainer = document.getElementById('startup-tabs');
        if (!tabContainer) return;

        const tabBtns = tabContainer.querySelectorAll('.tab-btn');
        const panels = document.querySelectorAll('.tab-panel');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                const c = getElementCenter(btn);
                window.axonFg.fireHemostasisFlash(c.x, c.y);

                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                panels.forEach(p => {
                    if (p.dataset.panel === target) {
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
                    }
                });
            });
        });
    }

    /* -------- Boot -------- */
    function boot() {
        bindButtons();
        bindTabs();
        updateDiscoveryNodes();
        runInitialIgnition();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
