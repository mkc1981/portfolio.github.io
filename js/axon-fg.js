/* ============================================================
   axon-fg.js
   Foreground canvas: animated propagation effects representing
   the regenerative cascade.

   Effects:

   1. Ignition axon — an axon entering from off-screen, racing
      to a target point, with growth cone and branching trail.
      Used for the initial home-page lighting and for incoming
      axons on each newly-visited page.

   2. Outgoing axon — an axon emerging from a button click,
      racing toward the right edge of the viewport, with a
      bright leading-edge action potential and trailing
      branches.

   3. Hemostasis flash — a brief, warm-toned flash at the
      click point representing the immediate post-injury
      response. This is the first visible phase of the
      healing cascade.

   4. Schwann cell wave — a wave of small migrating cells that
      sweeps across the viewport during transitions, representing
      the support cells that release growth factors to guide
      axon regeneration into the new territory.

   5. Continuous transition burst — a sustained background of
      axon firings during the panning interval between pages.
   ============================================================ */

(function () {
    'use strict';

    const canvas = document.getElementById('axon-fg');
    const ctx = canvas.getContext('2d');

    let width = 0, height = 0;
    let dpr = window.devicePixelRatio || 1;

    // Active effects
    let axons = [];
    let flashes = [];
    let schwannWaves = [];

    let transitionMode = false;

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

    /* ============================================================
       AXON
       ============================================================ */
    class Axon {
        constructor(opts) {
            this.startX = opts.startX;
            this.startY = opts.startY;
            this.targetX = opts.targetX;
            this.targetY = opts.targetY;
            this.speed = opts.speed || 1400;
            this.color = opts.color || '180, 230, 255';
            this.thickness = opts.thickness || 2.2;
            this.onComplete = opts.onComplete || null;
            this.onContact = opts.onContact || null;
            this.contactTriggered = false;
            this.complete = false;
            this.completedAt = null;
            this.age = 0;

            this.head = { x: this.startX, y: this.startY };
            this.path = [{ x: this.startX, y: this.startY }];

            const dx = this.targetX - this.startX;
            const dy = this.targetY - this.startY;
            this.totalDistance = Math.sqrt(dx * dx + dy * dy);
            this.dirX = dx / this.totalDistance;
            this.dirY = dy / this.totalDistance;
            this.perpX = -this.dirY;
            this.perpY = this.dirX;

            this.traveled = 0;
            this.meanderAmplitude = opts.meanderAmplitude !== undefined
                ? opts.meanderAmplitude : 22;
            this.meanderFreq = 0.012;

            this.branches = [];
            this.lastBranchAt = 0;
            this.branchInterval = opts.branchInterval || 90;
        }

        update(dt) {
            this.age += dt;

            if (!this.complete) {
                const advance = this.speed * dt;
                this.traveled += advance;

                if (this.traveled >= this.totalDistance) {
                    this.head.x = this.targetX;
                    this.head.y = this.targetY;
                    this.path.push({ x: this.targetX, y: this.targetY });
                    this.complete = true;
                    this.completedAt = this.age;
                    if (!this.contactTriggered && this.onContact) {
                        this.onContact();
                        this.contactTriggered = true;
                    }
                    if (this.onComplete) this.onComplete();
                } else {
                    const meander = Math.sin(this.traveled * this.meanderFreq)
                        * this.meanderAmplitude;
                    const baseX = this.startX + this.dirX * this.traveled;
                    const baseY = this.startY + this.dirY * this.traveled;
                    this.head.x = baseX + this.perpX * meander;
                    this.head.y = baseY + this.perpY * meander;
                    this.path.push({ x: this.head.x, y: this.head.y });

                    if (this.traveled - this.lastBranchAt > this.branchInterval
                        && Math.random() < 0.6) {
                        this.spawnBranch();
                        this.lastBranchAt = this.traveled;
                    }
                }
            }

            for (const branch of this.branches) branch.update(dt);
            this.branches = this.branches.filter(b => b.age < b.lifespan);
        }

        spawnBranch() {
            const angle = Math.atan2(this.dirY, this.dirX)
                + (Math.random() < 0.5 ? -1 : 1)
                * (Math.PI / 3 + Math.random() * Math.PI / 6);
            const length = 40 + Math.random() * 60;
            this.branches.push(new Branch({
                startX: this.head.x,
                startY: this.head.y,
                angle, length,
                speed: this.speed * 0.6,
                color: this.color,
                thickness: this.thickness * 0.55
            }));
        }

        draw(ctx) {
            if (this.path.length < 2) return;

            const fadeAfterComplete = this.complete
                ? Math.max(0, 1 - (this.age - this.completedAt) / 1.5)
                : 1;

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Outer glow
            ctx.strokeStyle = `rgba(${this.color}, ${0.25 * fadeAfterComplete})`;
            ctx.lineWidth = this.thickness * 4;
            ctx.beginPath();
            ctx.moveTo(this.path[0].x, this.path[0].y);
            for (let i = 1; i < this.path.length; i++) {
                ctx.lineTo(this.path[i].x, this.path[i].y);
            }
            ctx.stroke();

            ctx.strokeStyle = `rgba(${this.color}, ${0.55 * fadeAfterComplete})`;
            ctx.lineWidth = this.thickness * 2;
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * fadeAfterComplete})`;
            ctx.lineWidth = this.thickness;
            ctx.stroke();

            // Leading-edge growth cone
            if (!this.complete) {
                const r = 24;
                const grad = ctx.createRadialGradient(
                    this.head.x, this.head.y, 0,
                    this.head.x, this.head.y, r
                );
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
                grad.addColorStop(0.4, `rgba(${this.color}, 0.7)`);
                grad.addColorStop(1, `rgba(${this.color}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(this.head.x, this.head.y, r, 0, Math.PI * 2);
                ctx.fill();
            }

            for (const branch of this.branches) {
                branch.draw(ctx, fadeAfterComplete);
            }
        }

        isExpired() {
            return this.complete && (this.age - this.completedAt) > 1.5;
        }
    }

    /* ============================================================
       BRANCH
       ============================================================ */
    class Branch {
        constructor(opts) {
            this.startX = opts.startX;
            this.startY = opts.startY;
            this.angle = opts.angle;
            this.length = opts.length;
            this.speed = opts.speed;
            this.color = opts.color;
            this.thickness = opts.thickness;
            this.traveled = 0;
            this.age = 0;
            this.lifespan = (opts.length / opts.speed) + 0.6;
            this.path = [{ x: this.startX, y: this.startY }];
        }

        update(dt) {
            this.age += dt;
            if (this.traveled < this.length) {
                this.traveled = Math.min(this.length, this.traveled + this.speed * dt);
                const x = this.startX + Math.cos(this.angle) * this.traveled;
                const y = this.startY + Math.sin(this.angle) * this.traveled;
                this.path.push({ x, y });
            }
        }

        draw(ctx, parentFade) {
            if (this.path.length < 2) return;
            const growing = this.traveled < this.length;
            const fade = growing
                ? 1
                : Math.max(0, 1 - (this.age - (this.length / this.speed)) / 0.6);
            const alpha = fade * parentFade;
            if (alpha < 0.02) return;

            ctx.lineCap = 'round';
            ctx.strokeStyle = `rgba(${this.color}, ${0.4 * alpha})`;
            ctx.lineWidth = this.thickness * 3;
            ctx.beginPath();
            ctx.moveTo(this.path[0].x, this.path[0].y);
            for (let i = 1; i < this.path.length; i++) {
                ctx.lineTo(this.path[i].x, this.path[i].y);
            }
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * alpha})`;
            ctx.lineWidth = this.thickness;
            ctx.stroke();
        }
    }

    /* ============================================================
       HEMOSTASIS FLASH
       Brief warm-toned radial flash at the click point.
       Represents the first phase of the wound healing response.
       ============================================================ */
    class HemostasisFlash {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.age = 0;
            this.lifespan = 0.65;
            this.maxRadius = 60;
        }

        update(dt) { this.age += dt; }

        isExpired() { return this.age >= this.lifespan; }

        draw(ctx) {
            const t = this.age / this.lifespan;
            const r = this.maxRadius * (0.3 + 0.7 * easeOutQuad(t));
            const alpha = (1 - t) * 0.8;

            // Warm palette: hint of coral suggesting hemostatic response
            const grad = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, r
            );
            grad.addColorStop(0, `rgba(255, 240, 200, ${alpha * 0.9})`);
            grad.addColorStop(0.3, `rgba(255, 180, 150, ${alpha * 0.7})`);
            grad.addColorStop(0.7, `rgba(220, 130, 130, ${alpha * 0.3})`);
            grad.addColorStop(1, 'rgba(220, 130, 130, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.fill();

            // Inner bright core
            const coreR = 8 * (1 - t);
            const core = ctx.createRadialGradient(
                this.x, this.y, 0, this.x, this.y, coreR
            );
            core.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            core.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(this.x, this.y, coreR, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* ============================================================
       SCHWANN CELL WAVE
       A wave of small migrating cells that sweeps across the
       viewport. Represents the support cells migrating ahead of
       regenerating axons to release growth factors and prepare
       the territory for incoming axons.
       ============================================================ */
    class SchwannWave {
        constructor() {
            this.age = 0;
            this.lifespan = 1.4;
            // Generate a population of cells distributed across the
            // vertical axis, each with its own horizontal speed and
            // delay so the wave has a natural front-edge feel
            this.cells = [];
            const count = 38;
            for (let i = 0; i < count; i++) {
                this.cells.push({
                    y: 60 + Math.random() * (height - 120),
                    delay: Math.random() * 0.25,
                    speed: 700 + Math.random() * 400,
                    radius: 2.2 + Math.random() * 1.4,
                    phase: Math.random() * Math.PI * 2,
                    pulseSpeed: 6 + Math.random() * 4
                });
            }
        }

        update(dt) {
            this.age += dt;
            for (const c of this.cells) c.phase += c.pulseSpeed * dt;
        }

        isExpired() { return this.age >= this.lifespan; }

        draw(ctx) {
            for (const c of this.cells) {
                const localAge = Math.max(0, this.age - c.delay);
                const x = -20 + localAge * c.speed;
                if (x < -20 || x > width + 20) continue;

                // Cells pulse as they migrate, fading out toward end of life
                const t = localAge / (this.lifespan - c.delay);
                const fade = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
                const pulse = 0.6 + 0.4 * Math.sin(c.phase);
                const alpha = fade * pulse * 0.85;

                // Glow
                const grad = ctx.createRadialGradient(
                    x, c.y, 0, x, c.y, c.radius * 4
                );
                grad.addColorStop(0, `rgba(180, 245, 220, ${alpha * 0.6})`);
                grad.addColorStop(1, 'rgba(180, 245, 220, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, c.y, c.radius * 4, 0, Math.PI * 2);
                ctx.fill();

                // Core
                ctx.fillStyle = `rgba(220, 255, 235, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x, c.y, c.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /* -------- Easing -------- */
    function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

    /* ============================================================
       Continuous transition burst — short axons crossing the
       viewport during the panning interval, suggesting a
       sustained wave of regenerative activity.
       ============================================================ */
    let transitionAxonTimer = 0;

    function spawnTransitionAxon() {
        const startX = -50;
        const startY = Math.random() * height;
        const targetX = width + 50;
        const targetY = startY + (Math.random() - 0.5) * 180;
        axons.push(new Axon({
            startX, startY, targetX, targetY,
            speed: 1600 + Math.random() * 600,
            color: '140, 210, 255',
            thickness: 1.4 + Math.random() * 1.0,
            meanderAmplitude: 18 + Math.random() * 22,
            branchInterval: 120
        }));
    }

    /* ============================================================
       PUBLIC API
       ============================================================ */
    window.axonFg = {
        fireIgnitionAxon(targetX, targetY, onContact) {
            const startX = -40;
            const startY = targetY + (Math.random() - 0.5) * 120;
            axons.push(new Axon({
                startX, startY, targetX, targetY,
                speed: 1500,
                color: '180, 230, 255',
                thickness: 2.6,
                meanderAmplitude: 28,
                branchInterval: 80,
                onContact
            }));
        },

        fireOutgoingAxon(originX, originY, onComplete) {
            const targetX = width + 80;
            const targetY = originY + (Math.random() - 0.5) * 80;
            axons.push(new Axon({
                startX: originX, startY: originY,
                targetX, targetY,
                speed: 1700,
                color: '200, 240, 255',
                thickness: 2.8,
                meanderAmplitude: 24,
                branchInterval: 70,
                onComplete
            }));
        },

        // Phase 1 of the wound healing cascade: hemostasis flash
        fireHemostasisFlash(x, y) {
            flashes.push(new HemostasisFlash(x, y));
        },

        // Phase 3 of the wound healing cascade: Schwann cell
        // migration wave
        fireSchwannWave() {
            schwannWaves.push(new SchwannWave());
        },

        startTransitionBurst() {
            transitionMode = true;
            transitionAxonTimer = 0;
        },

        stopTransitionBurst() {
            transitionMode = false;
        }
    };

    /* ============================================================
       RENDER LOOP
       ============================================================ */
    let lastTime = performance.now();

    function render(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        ctx.clearRect(0, 0, width, height);

        if (transitionMode) {
            transitionAxonTimer += dt;
            if (transitionAxonTimer > 0.08) {
                transitionAxonTimer = 0;
                spawnTransitionAxon();
            }
        }

        // Render order: Schwann waves behind axons behind flashes
        for (const w of schwannWaves) { w.update(dt); w.draw(ctx); }
        schwannWaves = schwannWaves.filter(w => !w.isExpired());

        for (const a of axons) { a.update(dt); a.draw(ctx); }
        axons = axons.filter(a => !a.isExpired());

        for (const f of flashes) { f.update(dt); f.draw(ctx); }
        flashes = flashes.filter(f => !f.isExpired());

        requestAnimationFrame(render);
    }

    /* -------- Boot -------- */
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(render);

})();
