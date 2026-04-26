/* ============================================================
   cursor-fx.js — TEXTBOOK PALETTE
   The cursor as a growth cone, retreatments for paper:
   the halo is warm coral, the trail is warm-ink, and the
   chemotactic gradients to interactive elements are drawn
   in soft warm tones rather than glowing cyan.
   ============================================================ */

(function () {
    'use strict';

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

    const trail = [];
    const TRAIL_MAX_LENGTH = 30;
    const TRAIL_LIFETIME = 0.85;

    const pulses = [];
    let lastPulseTime = 0;

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

    window.addEventListener('mousemove', (e) => {
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
        mouseX = -9999; mouseY = -9999;
    });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length === 0) return;
        const t = e.touches[0];
        mouseX = t.clientX;
        mouseY = t.clientY;
        lastMouseMoveTime = performance.now();
        trail.push({ x: mouseX, y: mouseY, t: performance.now() / 1000 });
        if (trail.length > TRAIL_MAX_LENGTH) trail.shift();
    }, { passive: true });

    let attractors = [];
    const ATTRACTOR_SELECTOR =
        '.bio-btn, .neural-btn, .tab-btn, .discovery-node, .nda-btn-primary';
    const CHEMO_RADIUS = 170;

    function refreshAttractors() {
        attractors = Array.from(document.querySelectorAll(ATTRACTOR_SELECTOR));
    }
    setInterval(refreshAttractors, 1500);
    refreshAttractors();

    /* -------- Render helpers -------- */
    function drawTrail(now) {
        if (trail.length < 2) return;

        const cutoff = now - TRAIL_LIFETIME;
        while (trail.length && trail[0].t < cutoff) trail.shift();
        if (trail.length < 2) return;

        ctx.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) {
            const a = trail[i - 1];
            const b = trail[i];
            const age = (now - b.t) / TRAIL_LIFETIME;
            const alpha = Math.max(0, 1 - age);

            // Outer warm halo
            ctx.strokeStyle = `rgba(217, 102, 80, ${alpha * 0.16})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            // Mid layer
            ctx.strokeStyle = `rgba(168, 68, 42, ${alpha * 0.4})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // Ink core
            ctx.strokeStyle = `rgba(122, 50, 30, ${alpha * 0.7})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
        }
    }

    function spawnAndDrawPulses(now, dt) {
        const movingRecently = (performance.now() - lastMouseMoveTime) < 200;
        if (movingRecently && now - lastPulseTime > 0.13) {
            lastPulseTime = now;
            if (mouseX > 0) {
                pulses.push({
                    x: mouseX, y: mouseY,
                    born: now,
                    lifetime: 0.7,
                    radius: 0
                });
            }
        }

        for (let i = pulses.length - 1; i >= 0; i--) {
            const p = pulses[i];
            const age = now - p.born;
            const t = age / p.lifetime;
            if (t >= 1) { pulses.splice(i, 1); continue; }

            const r = 4 + t * 22;
            const alpha = (1 - t) * 0.45;

            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            grad.addColorStop(0, `rgba(255, 240, 220, ${alpha * 0.6})`);
            grad.addColorStop(0.4, `rgba(232, 144, 128, ${alpha * 0.5})`);
            grad.addColorStop(1, 'rgba(232, 144, 128, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCursorHalo(now) {
        if (mouseX < 0) return;

        const phase = now * 1.6;
        const baseR = 12 + Math.sin(phase) * 1.5;

        // Outer warm halo
        const haloR = baseR + 16;
        const halo = ctx.createRadialGradient(
            mouseX, mouseY, 0, mouseX, mouseY, haloR
        );
        halo.addColorStop(0, 'rgba(232, 144, 128, 0.32)');
        halo.addColorStop(0.5, 'rgba(217, 102, 80, 0.14)');
        halo.addColorStop(1, 'rgba(217, 102, 80, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, haloR, 0, Math.PI * 2);
        ctx.fill();

        // Inner growth-cone tip — warm bright
        const tipR = baseR * 0.65;
        const tip = ctx.createRadialGradient(
            mouseX, mouseY, 0, mouseX, mouseY, tipR
        );
        tip.addColorStop(0, 'rgba(255, 240, 220, 0.55)');
        tip.addColorStop(1, 'rgba(232, 144, 128, 0)');
        ctx.fillStyle = tip;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, tipR, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawChemotacticGradients(now) {
        if (mouseX < 0) return;

        for (const el of attractors) {
            if (el.offsetParent === null && el.tagName !== 'BUTTON') continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) continue;

            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = cx - mouseX;
            const dy = cy - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > CHEMO_RADIUS) continue;
            if (dist < 8) continue;

            const proximity = 1 - dist / CHEMO_RADIUS;
            const strength = Math.pow(proximity, 1.6);

            // Warm gradient line — ink to faint
            const grad = ctx.createLinearGradient(mouseX, mouseY, cx, cy);
            grad.addColorStop(0, `rgba(168, 68, 42, ${strength * 0.55})`);
            grad.addColorStop(1, `rgba(217, 102, 80, ${strength * 0.15})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.0 * strength + 0.3;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.moveTo(mouseX, mouseY);
            ctx.lineTo(cx, cy);
            ctx.stroke();
            ctx.setLineDash([]);

            // Bud at element end
            ctx.fillStyle = `rgba(168, 68, 42, ${strength * 0.65})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 2 + strength * 1.8, 0, Math.PI * 2);
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

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(render);

})();
