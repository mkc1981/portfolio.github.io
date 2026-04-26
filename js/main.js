/* ============================================================
   main.js
   Orchestration of the regenerative cascade across page
   transitions.

   When a button is clicked, the transition unfolds in distinct
   biological phases, mirroring the actual wound healing
   response:

   PHASE 1 — INJURY / HEMOSTASIS  (t = 0)
       A warm flash erupts at the click point. The originating
       button briefly registers as "fired."

   PHASE 2 — AXON SPROUTING       (t = ~0.1s)
       A regenerating axon emerges from the click point and
       races toward the right edge of the viewport, leaving a
       trail of branching collaterals.

   PHASE 3 — TERRITORY PREPARATION (t = ~0.4s)
       A Schwann cell wave sweeps across the field, releasing
       chemotactic guidance signals into the new territory.
       The viewport begins panning to the destination page.

   PHASE 4 — REINNERVATION         (t = ~1.5s)
       An incoming axon enters the destination page from the
       left edge and races to make synaptic contact with the
       title. The contact triggers ignition.

   PHASE 5 — REMODELING            (t = ~2.0s)
       Content elements assemble in waves: title, subtitle,
       primary content, footer. Each appears like a regenerated
       structure coming online.

   This sequence is faithful to the real wound healing cascade
   while remaining compact enough (~2 seconds total) that the
   user is not made to wait.
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

    /* -------- Initial ignition (home page on first load) -------- */
    function runInitialIgnition() {
        setTimeout(() => {
            const title = getTitleCenterForPage('home');
            window.axonFg.fireIgnitionAxon(title.x, title.y, () => {
                ignitePage('home');
            });
        }, 700);
    }

    /* ============================================================
       The wound healing cascade — orchestrated transition
       ============================================================ */
    function performTransition(targetPage, originElement) {
        if (transitioning) return;
        if (targetPage === currentPage) return;
        transitioning = true;

        if (originElement) {
            originElement.classList.add('firing');
        }

        // Compute origin point (click site)
        let originX = window.innerWidth / 2;
        let originY = window.innerHeight / 2;
        if (originElement) {
            const c = getElementCenter(originElement);
            originX = c.x;
            originY = c.y;
        }

        /* PHASE 1 — Hemostasis flash at click site (t = 0) */
        window.axonFg.fireHemostasisFlash(originX, originY);

        /* PHASE 2 — Axon sprouting (t = 0.15s) */
        setTimeout(() => {
            window.axonFg.fireOutgoingAxon(originX, originY);
            window.axonFg.startTransitionBurst();
        }, 150);

        /* PHASE 3 — Territory preparation (t = 0.45s) */
        setTimeout(() => {
            window.axonFg.fireSchwannWave();
            panToPage(targetPage);
        }, 450);

        /* PHASE 4 — Reinnervation (t = 1.85s) */
        setTimeout(() => {
            window.axonFg.stopTransitionBurst();

            const newTitle = getTitleCenterForPage(targetPage);
            const finalize = () => {
                currentPage = targetPage;
                transitioning = false;
                updateDiscoveryNodes();
                if (originElement) originElement.classList.remove('firing');
            };

            if (ignited[targetPage]) {
                // Already lit (return visit) — finalize immediately
                finalize();
            } else {
                window.axonFg.fireIgnitionAxon(newTitle.x, newTitle.y, () => {
                    /* PHASE 5 — Remodeling: page ignition triggers
                       the staged content assembly via CSS animation
                       cascade in styles.css */
                    ignitePage(targetPage);
                    finalize();
                });
            }
        }, 1850);
    }

    /* -------- Public transition entry point with NDA gating -------- */
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

    /* -------- Bind navigation buttons -------- */
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

    /* -------- Bind startup-page tabs --------
       Tab transitions also use a small synaptic burst:
       a hemostasis flash at the new tab and the panel
       fades in like a regenerated structure.
    */
    function bindTabs() {
        const tabContainer = document.getElementById('startup-tabs');
        if (!tabContainer) return;

        const tabBtns = tabContainer.querySelectorAll('.tab-btn');
        const panels = document.querySelectorAll('.tab-panel');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;

                // Small synaptic flash at the tab
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
