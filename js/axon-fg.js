/* ============================================================
   axon-fg.js — TEXTBOOK PALETTE
   Foreground propagation effects rendered in textbook
   anatomical colors. The mechanism (axons growing, branching,
   trailing growth cones; Schwann cell migration waves;
   hemostasis flashes) is identical to the previous version —
   only the palette and stroke weights change to match the
   paper-and-ink aesthetic.
   ============================================================ */

(function () {
    'use strict';

    const canvas = document.getElementById('axon-fg');
    const ctx = canvas.getContext('2d');

    let width = 0, height = 0;
    let dpr = window.devicePixelRatio || 1;

    let axons = [];
    let flashes = [];
    let schwannWaves = [];
    let transitionMode = false;

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
            this.speed = opts.speed || 1500;
            // Color tuple is now an RGB string — no more cyan default
            this.color = opts.color || '168, 68, 42';        // coral-dark
            this.glowColor = opts.glowColor || '217, 102, 80'; // coral
            this.thickness = opts.thickness || 2.0;
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

            for (const b of this.branches) b.update(dt);
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

            // Outer warm halo (visible against paper)
            ctx.strokeStyle = `rgba(${this.glowColor}, ${0.18 * fadeAfterComplete})`;
            ctx.lineWidth = this.thickness * 4;
            ctx.beginPath();
            ctx.moveTo(this.path[0].x, this.path[0].y);
            for (let i = 1; i < this.path.length; i++) {
                ctx.lineTo(this.path[i].x, this.path[i].y);
            }
            ctx.stroke();

            // Mid stroke
            ctx.strokeStyle = `rgba(${this.color}, ${0.55 * fadeAfterComplete})`;
            ctx.lineWidth = this.thickness * 1.8;
            ctx.stroke();

            // Ink core (dark coral, like a textbook ink line)
            ctx.strokeStyle = `rgba(122, 50, 30, ${0.85 * fadeAfterComplete})`;
            ctx.lineWidth = this.thickness * 0.6;
            ctx.stroke();

            // Growth cone tip — bright, warm
            if (!this.complete) {
                const r = 22;
                const grad = ctx.createRadialGradient(
                    this.head.x, this.head.y, 0,
                    this.head.x, this.head.y, r
                );
                grad.addColorStop(0, 'rgba(255, 240, 220, 0.95)');
                grad.addColorStop(0.4, `rgba(${this.glowColor}, 0.75)`);
                grad.addColorStop(1, `rgba(${this.glowColor}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(this.head.x, this.head.y, r, 0, Math.PI * 2);
                ctx.fill();
            }

            for (const b of this.branches) b.draw(ctx, fadeAfterComplete);
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
                this.traveled = Math.min(this.length,
                    this.traveled + this.speed * dt);
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

            ctx.strokeStyle = `rgba(122, 50, 30, ${0.7 * alpha})`;
            ctx.lineWidth = this.thickness;
            ctx.stroke();
        }
    }

    /* ============================================================
       HEMOSTASIS FLASH — warm bloom at click site
       ============================================================ */
    class HemostasisFlash {
        constructor(x, y) {
            this.x = x; this.y = y;
            this.age = 0;
            this.lifespan = 0.6;
            this.maxRadius = 50;
        }

        update(dt) { this.age += dt; }
        isExpired() { return this.age >= this.lifespan; }

        draw(ctx) {
            const t = this.age / this.lifespan;
            const r = this.maxRadius * (0.3 + 0.7 * easeOutQuad(t));
            const alpha = (1 - t) * 0.85;

            // Warm coral burst on paper
            const grad = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, r
            );
            grad.addColorStop(0, `rgba(255, 220, 180, ${alpha * 0.9})`);
            grad.addColorStop(0.3, `rgba(232, 144, 128, ${alpha * 0.75})`);
            grad.addColorStop(0.7, `rgba(217, 102, 80, ${alpha * 0.35})`);
            grad.addColorStop(1, 'rgba(168, 68, 42, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.fill();

            // Bright core
            const coreR = 7 * (1 - t);
            const core = ctx.createRadialGradient(
                this.x, this.y, 0, this.x, this.y, coreR
            );
            core.addColorStop(0, `rgba(255, 240, 220, ${alpha})`);
            core.addColorStop(1, 'rgba(255, 220, 180, 0)');
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(this.x, this.y, coreR, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* ============================================================
       SCHWANN CELL WAVE — ochre cells migrating across viewport
       ============================================================ */
    class SchwannWave {
        constructor() {
            this.age = 0;
            this.lifespan = 1.4;
            this.cells = [];
            const count = 36;
            for (let i = 0; i < count; i++) {
                this.cells.push({
                    y: 60 + Math.random() * (height - 120),
                    delay: Math.random() * 0.25,
                    speed: 700 + Math.random() * 400,
                    radius: 2.5 + Math.random() * 1.4,
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

                const t = localAge / (this.lifespan - c.delay);
                const fade = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
                const pulse = 0.6 + 0.4 * Math.sin(c.phase);
                const alpha = fade * pulse * 0.85;

                // Halo
                const grad = ctx.createRadialGradient(
                    x, c.y, 0, x, c.y, c.radius * 4
                );
                grad.addColorStop(0, `rgba(232, 184, 96, ${alpha * 0.55})`);
                grad.addColorStop(1, 'rgba(232, 184, 96, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, c.y, c.radius * 4, 0, Math.PI * 2);
                ctx.fill();

                // Body — ochre
                ctx.fillStyle = `rgba(200, 144, 48, ${alpha * 0.95})`;
                ctx.beginPath();
                ctx.arc(x, c.y, c.radius, 0, Math.PI * 2);
                ctx.fill();
                // Outline
                ctx.strokeStyle = `rgba(122, 88, 30, ${alpha})`;
                ctx.lineWidth = 0.6;
                ctx.stroke();
            }
        }
    }

    function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

    /* ============================================================
       Continuous transition burst
       ============================================================ */
    let transitionAxonTimer = 0;

    function spawnTransitionAxon() {
        const startX = -50;
        const startY = Math.random() * height;
        const targetX = width + 50;
        const targetY = startY + (Math.random() - 0.5) * 180;
        axons.push(new Axon({
            startX, startY, targetX, targetY,
            speed: 1700 + Math.random() * 600,
            color: '168, 68, 42',
            glowColor: '217, 102, 80',
            thickness: 1.2 + Math.random() * 0.8,
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
                color: '168, 68, 42',
                glowColor: '217, 102, 80',
                thickness: 2.4,
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
                color: '168, 68, 42',
                glowColor: '217, 102, 80',
                thickness: 2.6,
                meanderAmplitude: 24,
                branchInterval: 70,
                onComplete
            }));
        },

        fireHemostasisFlash(x, y) {
            flashes.push(new HemostasisFlash(x, y));
        },

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

    /* -------- Render loop -------- */
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
