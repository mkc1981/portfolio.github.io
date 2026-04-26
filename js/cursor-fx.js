/* ============================================================
   cursor-fx.js
   The cursor as a growth cone moving through tissue.

   Three effects rendered on this canvas:

   1. Cursor halo — a soft glow follows the cursor position,
      representing the growth-cone leading edge advancing
      through the field.

   2. Axonal trail — a fading trail of action-potential pulses
      deposited behind the cursor as it moves, mirroring how a
      real growth cone leaves material in its wake.

   3. Chemotactic gradients — when the cursor approaches an
      interactive element (button, tab, discovery node), a
      gradient line forms between the cursor and the element.
      Closer proximity intensifies the gradient, mirroring the
      way Schwann-cell-released growth factors guide axon
      navigation toward their target.

   This file does not replace the system cursor — it layers
   regenerative visual feedback ON TOP of the user's normal
   pointer, so usability and accessibility are preserved.
   ============================================================ */

(function () {
    'use strict';

    // Create the cursor canvas dynamically (avoids needing to
    // edit the HTML for what is a presentational layer)
    const canvas = document.createElement('canvas');
    canvas.id = 'cursor-fx';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        z-index: 6;
        pointer-events: none;
    `;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    let width = 0, height = 0;
    let dpr = window.devicePixelRatio || 1;

    let mouseX = -9999, mouseY = -9999;
    let lastMouseMoveTime = 0;

    // Trail history: recent cursor positions with timestamps.
    // Each entry decays; older entries fade out.
    const trail = [];
    const TRAIL_MAX_LENGTH = 32;
    const TRAIL_LIFETIME = 0.9; // seconds

    // Action-potential pulses spawned periodically along the trail
    const pulses = [];
    let lastPulseTime = 0;

    /* -------- Resize -------- */
    function resize() {
        dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* -------- Mouse tracking -------- */
    window.addEventListener('mousemove', (e) => {
        // If this is the first sample after entering, don't draw a trail
        // segment to it (would create a long line from previous position)
        const now = performance.now();
        const wasOff = mouseX < 0;
        mouseX = e.clientX;
        mouseY = e.clientY;
        lastMouseMoveTime = now;

        if (!wasOff) {
            trail.push({ x: mouseX, y: mouseY, t: now / 1000 });
            if (trail.length > TRAIL_MAX_LENGTH) trail.shift();
        }
    });

    window.addEventListener('mouseleave', () => {
        mouseX = -9999;
        mouseY = -9999;
    });

    // Touch devices: track touches as cursor too so the field
    // responds to finger gestures
    window.addEventListener('touchmove', (e) => {
        if (e.touches.length === 0) return;
        const t = e.touches[0];
        mouseX = t.clientX;
        mouseY = t.clientY;
        lastMouseMoveTime = performance.now();
        trail.push({ x: mouseX, y: mouseY, t: performance.now() / 1000 });
        if (trail.length > TRAIL_MAX_LENGTH) trail.shift();
    }, { passive: true });

    /* -------- Discover interactive elements ----------
       We scan the DOM for elements that should receive
       chemotactic feedback. The set is recomputed periodically
       so newly-rendered elements get picked up. */
    let attractors = [];
    const ATTRACTOR_SELECTOR =
        '.bio-btn, .neural-btn, .tab-btn, .discovery-node, .nda-btn-primary';
    const CHEMO_RADIUS = 180;  // px — within this, gradient forms

    function refreshAttractors() {
        attractors = Array.from(document.querySelectorAll(ATTRACTOR_SELECTOR));
    }
    setInterval(refreshAttractors, 1500);
    refreshAttractors();

    /* -------- Render helpers -------- */
    function drawTrail(now) {
        // Build trail segments connecting recent points,
        // fading by age
        if (trail.length < 2) return;

        const cutoff = now - TRAIL_LIFETIME;
        // Drop fully-decayed points
        while (trail.length && trail[0].t < cutoff) trail.shift();
        if (trail.length < 2) return;

        ctx.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) {
            const a = trail[i - 1];
            const b = trail[i];
            const age = (now - b.t) / TRAIL_LIFETIME;
            const alpha = Math.max(0, 1 - age);

            // Outer glow
            ctx.strokeStyle = `rgba(180, 230, 255, ${alpha * 0.18})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            // Mid layer
            ctx.strokeStyle = `rgba(180, 230, 255, ${alpha * 0.4})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Bright core
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
        }
    }

    function spawnAndDrawPulses(now, dt) {
        // Spawn an action-potential pulse periodically when
        // the cursor is moving
        const movingRecently = (performance.now() - lastMouseMoveTime) < 200;
        if (movingRecently && now - lastPulseTime > 0.12) {
            lastPulseTime = now;
            if (mouseX > 0) {
                pulses.push({
                    x: mouseX,
                    y: mouseY,
                    born: now,
                    lifetime: 0.7,
                    radius: 0
                });
            }
        }

        // Update and draw pulses
        for (let i = pulses.length - 1; i >= 0; i--) {
            const p = pulses[i];
            const age = now - p.born;
            const t = age / p.lifetime;
            if (t >= 1) { pulses.splice(i, 1); continue; }

            const r = 4 + t * 22;
            const alpha = (1 - t) * 0.5;

            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.6})`);
            grad.addColorStop(0.4, `rgba(180, 230, 255, ${alpha * 0.5})`);
            grad.addColorStop(1, 'rgba(180, 230, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCursorHalo(now) {
        if (mouseX < 0) return;

        // Pulsing halo radius — biological rhythm ~1.2 Hz
        const phase = now * 1.6;
        const baseR = 14 + Math.sin(phase) * 2;

        // Outer growth-cone halo
        const haloR = baseR + 18;
        const haloGrad = ctx.createRadialGradient(
            mouseX, mouseY, 0, mouseX, mouseY, haloR
        );
        haloGrad.addColorStop(0, 'rgba(180, 230, 255, 0.35)');
        haloGrad.addColorStop(0.5, 'rgba(140, 210, 255, 0.15)');
        haloGrad.addColorStop(1, 'rgba(140, 210, 255, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, haloR, 0, Math.PI * 2);
        ctx.fill();

        // Inner growth-cone tip — bright but small
        const tipGrad = ctx.createRadialGradient(
            mouseX, mouseY, 0, mouseX, mouseY, baseR * 0.7
        );
        tipGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        tipGrad.addColorStop(1, 'rgba(220, 245, 255, 0)');
        ctx.fillStyle = tipGrad;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, baseR * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawChemotacticGradients(now) {
        if (mouseX < 0) return;

        for (const el of attractors) {
            // Skip elements that are not currently visible
            if (el.offsetParent === null && el.tagName !== 'BUTTON') continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) continue;

            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = cx - mouseX;
            const dy = cy - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > CHEMO_RADIUS) continue;
            // Skip if cursor is essentially on top of the element
            if (dist < 8) continue;

            // Strength rises sharply as the cursor approaches
            const proximity = 1 - dist / CHEMO_RADIUS;
            const strength = Math.pow(proximity, 1.6);

            // Gradient line: faint at the element end, stronger at cursor
            const grad = ctx.createLinearGradient(mouseX, mouseY, cx, cy);
            grad.addColorStop(0, `rgba(180, 230, 255, ${strength * 0.6})`);
            grad.addColorStop(1, `rgba(140, 200, 255, ${strength * 0.15})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.2 * strength + 0.3;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.moveTo(mouseX, mouseY);
            ctx.lineTo(cx, cy);
            ctx.stroke();
            ctx.setLineDash([]);

            // Small bud at the element end — like a dendrite
            // reaching toward the growth cone
            ctx.fillStyle = `rgba(180, 230, 255, ${strength * 0.7})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 2 + strength * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* -------- Render loop -------- */
    let lastTime = performance.now() / 1000;

    function render() {
        const now = performance.now() / 1000;
        const dt = Math.min(0.05, now - lastTime);
        lastTime = now;

        ctx.clearRect(0, 0, width, height);

        if (mouseX > 0) {
            drawChemotacticGradients(now);
            drawTrail(now);
            spawnAndDrawPulses(now, dt);
            drawCursorHalo(now);
        }

        requestAnimationFrame(render);
    }

    /* -------- Boot -------- */
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(render);

})();
