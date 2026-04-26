/* ============================================================
   axon-fg.js
   Foreground canvas: animated axon trails. Two propagation modes:

   1. Initial ignition: an axon enters from the left edge of the
      home page, races across the screen, and on contact with the
      title, triggers a flash that lights up the page.

   2. Transition propagation: when a button is clicked, an axon
      emerges from the button and races to the right edge,
      generating continuous synaptic activity. The viewport pans
      to the next page, and on the new page, an incoming axon
      enters from the left and lights up that page's title.

   Each axon is modeled as a moving leading-edge "action potential"
   with a trail of decaying segments behind it. Branches occasionally
   split off the main axon to create a richer synaptic feel.
   ============================================================ */

(function () {
    'use strict';

    const canvas = document.getElementById('axon-fg');
    const ctx = canvas.getContext('2d');

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    // Active axons currently animating
    let axons = [];

    // Continuous background firing during transitions
    let transitionMode = false;

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
    }

    /* -------- Axon model --------
       An axon is a sequence of points sampled along its path
       as the leading edge advances. Each segment has an age
       used for fading. */
    class Axon {
        constructor(opts) {
            this.startX = opts.startX;
            this.startY = opts.startY;
            this.targetX = opts.targetX;
            this.targetY = opts.targetY;
            this.speed = opts.speed || 1400;        // px/sec
            this.color = opts.color || '180, 230, 255';
            this.thickness = opts.thickness || 2.2;
            this.onComplete = opts.onComplete || null;
            this.onContact = opts.onContact || null;
            this.contactTriggered = false;
            this.complete = false;
            this.completedAt = null;
            this.age = 0;

            // Path is a list of {x, y} sampled as the head advances.
            // We use a slightly meandering path for organic feel.
            this.head = { x: this.startX, y: this.startY };
            this.path = [{ x: this.startX, y: this.startY }];

            // Pre-compute path direction
            const dx = this.targetX - this.startX;
            const dy = this.targetY - this.startY;
            this.totalDistance = Math.sqrt(dx * dx + dy * dy);
            this.dirX = dx / this.totalDistance;
            this.dirY = dy / this.totalDistance;

            // Perpendicular for meander
            this.perpX = -this.dirY;
            this.perpY = this.dirX;

            // Meander parameters
            this.traveled = 0;
            this.meanderAmplitude = opts.meanderAmplitude !== undefined
                ? opts.meanderAmplitude : 22;
            this.meanderFreq = 0.012;

            // Branches that have split off
            this.branches = [];
            this.lastBranchAt = 0;
            this.branchInterval = opts.branchInterval || 90;  // px between branches
        }

        update(dt) {
            this.age += dt;

            if (!this.complete) {
                const advance = this.speed * dt;
                this.traveled += advance;

                if (this.traveled >= this.totalDistance) {
                    // Reached target
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
                    // Compute new head position with meander
                    const meander = Math.sin(this.traveled * this.meanderFreq)
                        * this.meanderAmplitude;
                    const baseX = this.startX + this.dirX * this.traveled;
                    const baseY = this.startY + this.dirY * this.traveled;
                    this.head.x = baseX + this.perpX * meander;
                    this.head.y = baseY + this.perpY * meander;
                    this.path.push({ x: this.head.x, y: this.head.y });

                    // Spawn branches occasionally
                    if (this.traveled - this.lastBranchAt > this.branchInterval
                        && Math.random() < 0.6) {
                        this.spawnBranch();
                        this.lastBranchAt = this.traveled;
                    }
                }
            }

            // Update branches
            for (const branch of this.branches) {
                branch.update(dt);
            }
            this.branches = this.branches.filter(b => b.age < b.lifespan);
        }

        spawnBranch() {
            // A branch is a short axon stub that grows perpendicular-ish
            // and then fades.
            const angle = Math.atan2(this.dirY, this.dirX)
                + (Math.random() < 0.5 ? -1 : 1) * (Math.PI / 3 + Math.random() * Math.PI / 6);
            const length = 40 + Math.random() * 60;
            this.branches.push(new Branch({
                startX: this.head.x,
                startY: this.head.y,
                angle: angle,
                length: length,
                speed: this.speed * 0.6,
                color: this.color,
                thickness: this.thickness * 0.55
            }));
        }

        draw(ctx) {
            if (this.path.length < 2) return;

            // Trail fade: older points are dimmer.
            // We use age-since-completion to fade the whole axon out
            // after it reaches its target.
            const fadeAfterComplete = this.complete
                ? Math.max(0, 1 - (this.age - this.completedAt) / 1.5)
                : 1;

            // Draw main path with a glow underlay
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

            // Mid layer
            ctx.strokeStyle = `rgba(${this.color}, ${0.55 * fadeAfterComplete})`;
            ctx.lineWidth = this.thickness * 2;
            ctx.stroke();

            // Bright core
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * fadeAfterComplete})`;
            ctx.lineWidth = this.thickness;
            ctx.stroke();

            // Leading-edge action potential (bright pulse at head)
            if (!this.complete) {
                const headGlow = ctx.createRadialGradient(
                    this.head.x, this.head.y, 0,
                    this.head.x, this.head.y, 24
                );
                headGlow.addColorStop(0, `rgba(255, 255, 255, 0.95)`);
                headGlow.addColorStop(0.4, `rgba(${this.color}, 0.7)`);
                headGlow.addColorStop(1, `rgba(${this.color}, 0)`);
                ctx.fillStyle = headGlow;
                ctx.beginPath();
                ctx.arc(this.head.x, this.head.y, 24, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw branches
            for (const branch of this.branches) {
                branch.draw(ctx, fadeAfterComplete);
            }
        }

        isExpired() {
            return this.complete && (this.age - this.completedAt) > 1.5;
        }
    }

    /* -------- Branch: a short stub that grows from the main axon -------- */
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

    /* -------- Continuous transition firings --------
       During a button-triggered page transition, we keep firing
       short axon bursts across the screen so the journey to the
       next page feels like a wave of synaptic activity. */
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

    /* -------- Public API -------- */
    window.axonFg = {
        // Fire the initial ignition axon: enters from left,
        // travels to (targetX, targetY), and triggers onContact.
        fireIgnitionAxon(targetX, targetY, onContact) {
            const startX = -40;
            const startY = targetY + (Math.random() - 0.5) * 120;
            axons.push(new Axon({
                startX, startY,
                targetX, targetY,
                speed: 1500,
                color: '180, 230, 255',
                thickness: 2.6,
                meanderAmplitude: 28,
                branchInterval: 80,
                onContact
            }));
        },

        // Fire an axon from an origin point traveling rightward
        // off-screen. Used when a button is clicked.
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

        // Begin/end the burst of continuous transition firings
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

        // Continuous bursts during transition
        if (transitionMode) {
            transitionAxonTimer += dt;
            if (transitionAxonTimer > 0.08) {
                transitionAxonTimer = 0;
                spawnTransitionAxon();
            }
        }

        // Update + draw all axons
        for (const axon of axons) {
            axon.update(dt);
            axon.draw(ctx);
        }
        // Cull expired
        axons = axons.filter(a => !a.isExpired());

        requestAnimationFrame(render);
    }

    /* -------- Boot -------- */
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(render);

})();
