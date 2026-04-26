/* ============================================================
   neural-bg.js
   Background canvas: a sparse, slow-pulsing field of neurons
   connected by axonal links. This represents the persistent
   neural substrate that exists across all three pages.

   Two intensity modes:
   - dim:  pre-ignition state, very low brightness (page is "dark")
   - lit:  post-ignition state, full ambient glow

   Each page is ignited independently the first time the user
   navigates to it.
   ============================================================ */

(function () {
    'use strict';

    const canvas = document.getElementById('neural-bg');
    const ctx = canvas.getContext('2d');

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    // Configuration
    const NEURON_COUNT = 90;          // total neurons across full virtual width
    const VIRTUAL_WIDTH_MULT = 3;     // background extends across all 3 pages
    const CONNECTION_RADIUS = 180;    // px — neurons within this distance link
    const MAX_CONNECTIONS = 3;        // per-neuron cap to avoid clutter

    // Per-page ignition state
    // Each page index (0=home, 1=about, 2=startup) tracks brightness 0..1
    const pageIgnition = [0, 0, 0];

    let neurons = [];
    let viewportOffset = 0;  // matches the page-track's translateX, in px

    /* -------- Resize handling -------- */
    function resize() {
        dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (neurons.length === 0) {
            initNeurons();
        }
    }

    /* -------- Neuron initialization --------
       Neurons are distributed across the virtual width
       (3x viewport) so as the user pans between pages,
       new neurons come into view smoothly. */
    function initNeurons() {
        neurons = [];
        const virtualWidth = width * VIRTUAL_WIDTH_MULT;
        for (let i = 0; i < NEURON_COUNT; i++) {
            neurons.push({
                x: Math.random() * virtualWidth,
                y: Math.random() * height,
                radius: 1.2 + Math.random() * 1.8,
                phase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.4 + Math.random() * 0.8,  // rad/sec
                baseBrightness: 0.3 + Math.random() * 0.5
            });
        }
    }

    /* -------- Public API --------
       main.js calls these to coordinate with page transitions
       and axon contact events. */
    window.neuralBg = {
        ignitePage(pageIndex) {
            // Smooth ramp from current value to 1.0
            const start = pageIgnition[pageIndex];
            const startTime = performance.now();
            const duration = 1100;
            function step(now) {
                const t = Math.min(1, (now - startTime) / duration);
                pageIgnition[pageIndex] = start + (1 - start) * easeOutCubic(t);
                if (t < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        },

        setViewportOffset(offsetPx) {
            // Background pans with the page track but at full speed
            // (no parallax — we want neurons to feel attached to pages)
            viewportOffset = offsetPx;
        },

        // Allows axon-fg.js to query whether a page is lit
        getPageIgnition(pageIndex) {
            return pageIgnition[pageIndex];
        }
    };

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /* -------- Render loop -------- */
    let lastTime = performance.now();

    function getBrightnessAtX(virtualX) {
        // Determine which page this neuron belongs to,
        // and return that page's ignition level.
        const pageWidth = width;
        const pageIndex = Math.min(2, Math.max(0, Math.floor(virtualX / pageWidth)));
        return pageIgnition[pageIndex];
    }

    function render(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        ctx.clearRect(0, 0, width, height);

        // Draw connections first (so neurons sit on top)
        ctx.lineCap = 'round';
        for (let i = 0; i < neurons.length; i++) {
            const a = neurons[i];
            const ax = a.x - viewportOffset;
            // Skip neurons far outside viewport
            if (ax < -200 || ax > width + 200) continue;

            let connectionsDrawn = 0;
            for (let j = i + 1; j < neurons.length; j++) {
                if (connectionsDrawn >= MAX_CONNECTIONS) break;
                const b = neurons[j];
                const bx = b.x - viewportOffset;
                if (bx < -200 || bx > width + 200) continue;

                const dx = ax - bx;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > CONNECTION_RADIUS) continue;

                connectionsDrawn++;

                // Brightness uses the average of both endpoints' page lighting
                const brightnessA = getBrightnessAtX(a.x);
                const brightnessB = getBrightnessAtX(b.x);
                const brightness = (brightnessA + brightnessB) / 2;

                // Distance falloff
                const distAlpha = 1 - (dist / CONNECTION_RADIUS);
                const alpha = brightness * distAlpha * 0.18;

                if (alpha < 0.01) continue;

                ctx.strokeStyle = `rgba(140, 200, 255, ${alpha})`;
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(ax, a.y);
                ctx.lineTo(bx, b.y);
                ctx.stroke();
            }
        }

        // Draw neuron cell bodies with pulsing
        for (let i = 0; i < neurons.length; i++) {
            const n = neurons[i];
            n.phase += n.pulseSpeed * dt;
            const nx = n.x - viewportOffset;
            if (nx < -50 || nx > width + 50) continue;

            const pageBrightness = getBrightnessAtX(n.x);
            if (pageBrightness < 0.02) continue;  // dark page: skip

            const pulse = 0.5 + 0.5 * Math.sin(n.phase);
            const intensity = pageBrightness * n.baseBrightness * (0.5 + 0.5 * pulse);

            // Outer glow
            const glowRadius = n.radius * 4;
            const grad = ctx.createRadialGradient(nx, n.y, 0, nx, n.y, glowRadius);
            grad.addColorStop(0, `rgba(180, 230, 255, ${intensity * 0.6})`);
            grad.addColorStop(1, 'rgba(180, 230, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(nx, n.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            // Cell body
            ctx.fillStyle = `rgba(220, 245, 255, ${intensity})`;
            ctx.beginPath();
            ctx.arc(nx, n.y, n.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(render);
    }

    /* -------- Boot -------- */
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(render);

})();
