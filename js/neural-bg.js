/* ============================================================
   neural-bg.js — TEXTBOOK PALETTE
   The microscopic tissue field rendered in textbook ink-and-
   paper tones. Same structures as before (neurons, axons,
   Schwann cells, sutures, growth cones, ECM) but now drawn
   with anatomical-illustration colors that read against the
   warm cream paper background rather than the dark cosmos.
   ============================================================ */

(function () {
    'use strict';

    const canvas = document.getElementById('neural-bg');
    const ctx = canvas.getContext('2d');

    let width = 0, height = 0;
    let dpr = window.devicePixelRatio || 1;

    // Configuration
    const PAGE_COUNT = 4;
    const VIRTUAL_WIDTH_MULT = PAGE_COUNT;
    const NEURON_COUNT = 50;
    const AXON_COUNT = 20;
    const SCHWANN_PER_AXON = 6;
    const SUTURE_COUNT = 12;
    const ECM_NODE_COUNT = 180;
    const GROWTH_CONE_COUNT = 16;

    // Per-page ignition state
    const pageIgnition = new Array(PAGE_COUNT).fill(0);

    // Environment
    let neurons = [];
    let axons = [];
    let sutures = [];
    let ecmNodes = [];
    let growthCones = [];

    let viewportOffset = 0;
    let mouseX = -9999, mouseY = -9999;

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

        if (neurons.length === 0) initEnvironment();
    }

    /* -------- Environment init -------- */
    function initEnvironment() {
        const virtualWidth = width * VIRTUAL_WIDTH_MULT;

        neurons = [];
        for (let i = 0; i < NEURON_COUNT; i++) {
            const dendriteCount = 4 + Math.floor(Math.random() * 4);
            const dendrites = [];
            for (let d = 0; d < dendriteCount; d++) {
                const angle = (Math.PI * 2 / dendriteCount) * d
                    + (Math.random() - 0.5) * 0.6;
                dendrites.push({
                    angle,
                    length: 18 + Math.random() * 26,
                    bend: (Math.random() - 0.5) * 0.7,
                    branchAt: 0.55 + Math.random() * 0.3,
                    branchAngle: (Math.random() < 0.5 ? -1 : 1)
                        * (0.5 + Math.random() * 0.4),
                    branchLength: 8 + Math.random() * 14
                });
            }
            neurons.push({
                x: Math.random() * virtualWidth,
                y: 60 + Math.random() * (height - 120),
                radius: 2.4 + Math.random() * 2.2,
                phase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.3 + Math.random() * 0.6,
                baseBrightness: 0.45 + Math.random() * 0.45,
                dendrites
            });
        }

        axons = [];
        for (let i = 0; i < AXON_COUNT; i++) {
            const startX = Math.random() * virtualWidth;
            const startY = 80 + Math.random() * (height - 160);
            const length = 220 + Math.random() * 380;
            const baseAngle = (Math.random() - 0.5) * 0.8;
            const pts = [];
            const segCount = 14;
            let curAngle = baseAngle;
            let cx = startX, cy = startY;
            pts.push({ x: cx, y: cy });
            for (let s = 0; s < segCount; s++) {
                const segLen = length / segCount;
                cx += Math.cos(curAngle) * segLen;
                cy += Math.sin(curAngle) * segLen;
                curAngle += (Math.random() - 0.5) * 0.3;
                pts.push({ x: cx, y: cy });
            }
            const schwann = [];
            for (let k = 1; k <= SCHWANN_PER_AXON; k++) {
                schwann.push({
                    t: k / (SCHWANN_PER_AXON + 1),
                    phase: Math.random() * Math.PI * 2,
                    width: 5 + Math.random() * 3
                });
            }
            axons.push({
                points: pts,
                phase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.4 + Math.random() * 0.5,
                baseBrightness: 0.4 + Math.random() * 0.35,
                schwann
            });
        }

        sutures = [];
        for (let i = 0; i < SUTURE_COUNT; i++) {
            const anchorCount = 2 + Math.floor(Math.random() * 2);
            const anchors = [];
            const baseY = 100 + Math.random() * (height - 200);
            const baseX = Math.random() * virtualWidth;
            for (let a = 0; a < anchorCount; a++) {
                anchors.push({
                    x: baseX + a * (60 + Math.random() * 50),
                    y: baseY + (Math.random() - 0.5) * 90
                });
            }
            sutures.push({
                anchors,
                phase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.2 + Math.random() * 0.3,
                baseBrightness: 0.45 + Math.random() * 0.3
            });
        }

        ecmNodes = [];
        for (let i = 0; i < ECM_NODE_COUNT; i++) {
            ecmNodes.push({
                x: Math.random() * virtualWidth,
                y: Math.random() * height,
                phase: Math.random() * Math.PI * 2
            });
        }

        growthCones = [];
        for (let i = 0; i < GROWTH_CONE_COUNT; i++) {
            growthCones.push({
                x: Math.random() * virtualWidth,
                y: 100 + Math.random() * (height - 200),
                phase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.6 + Math.random() * 0.8,
                radius: 3 + Math.random() * 2,
                trailAngle: Math.random() * Math.PI * 2,
                trailLength: 30 + Math.random() * 40
            });
        }
    }

    /* -------- Public API -------- */
    window.neuralBg = {
        ignitePage(pageIndex) {
            const start = pageIgnition[pageIndex] || 0;
            const startTime = performance.now();
            const duration = 900;
            function step(now) {
                const t = Math.min(1, (now - startTime) / duration);
                pageIgnition[pageIndex] = start + (1 - start) * easeOutCubic(t);
                if (t < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        },
        setViewportOffset(offsetPx) { viewportOffset = offsetPx; },
        getPageIgnition(pageIndex) { return pageIgnition[pageIndex] || 0; }
    };

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    /* -------- Mouse -------- */
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
        mouseX = -9999; mouseY = -9999;
    });

    function getBrightnessAtVirtualX(virtualX) {
        const pageIdx = Math.min(PAGE_COUNT - 1,
            Math.max(0, Math.floor(virtualX / width)));
        return pageIgnition[pageIdx] || 0;
    }

    function mouseBoost(screenX, screenY) {
        if (mouseX < 0) return 0;
        const dx = screenX - mouseX;
        const dy = screenY - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 180) return 0;
        return (1 - dist / 180) * 0.4;
    }

    /* -------- Render layers -------- */

    function drawECM(now) {
        // ECM mesh: very faint warm-ochre webbing
        ctx.lineWidth = 0.5;
        for (let i = 0; i < ecmNodes.length; i++) {
            const n = ecmNodes[i];
            const sx = n.x - viewportOffset;
            if (sx < -100 || sx > width + 100) continue;
            const brightness = getBrightnessAtVirtualX(n.x);
            if (brightness < 0.05) continue;

            for (let j = i + 1; j < Math.min(i + 4, ecmNodes.length); j++) {
                const m = ecmNodes[j];
                const mx = m.x - viewportOffset;
                if (mx < -100 || mx > width + 100) continue;
                const dx = sx - mx;
                const dy = n.y - m.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 90) continue;
                const alpha = brightness * (1 - dist / 90) * 0.10;
                if (alpha < 0.005) continue;
                // Warm sepia ECM lines
                ctx.strokeStyle = `rgba(168, 130, 60, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(sx, n.y);
                ctx.lineTo(mx, m.y);
                ctx.stroke();
            }
        }
    }

    function drawSutures(now, dt) {
        for (const s of sutures) {
            s.phase += s.pulseSpeed * dt;
            const anchors = s.anchors.map(a => ({
                x: a.x - viewportOffset, y: a.y
            }));
            const minX = Math.min(...anchors.map(a => a.x));
            const maxX = Math.max(...anchors.map(a => a.x));
            if (maxX < -50 || minX > width + 50) continue;

            const brightness = getBrightnessAtVirtualX(s.anchors[0].x);
            if (brightness < 0.03) continue;

            const pulse = 0.65 + 0.35 * Math.sin(s.phase);
            const baseAlpha = brightness * s.baseBrightness * pulse;

            ctx.lineCap = 'round';
            for (let i = 0; i < anchors.length - 1; i++) {
                const a = anchors[i];
                const b = anchors[i + 1];
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2 - 8;

                // Cream suture thread on warm paper
                ctx.setLineDash([5, 4]);
                ctx.strokeStyle = `rgba(184, 152, 96, ${baseAlpha * 0.65})`;
                ctx.lineWidth = 1.0;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.quadraticCurveTo(mx, my, b.x, b.y);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Anchor knots
            for (const a of anchors) {
                const localBoost = mouseBoost(a.x, a.y);
                const dotAlpha = baseAlpha + localBoost * brightness;
                ctx.fillStyle = `rgba(122, 88, 58, ${dotAlpha * 0.85})`;
                ctx.beginPath();
                ctx.arc(a.x, a.y, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawAxons(now, dt) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const ax of axons) {
            ax.phase += ax.pulseSpeed * dt;

            let anyVisible = false;
            for (const p of ax.points) {
                const sx = p.x - viewportOffset;
                if (sx > -100 && sx < width + 100) { anyVisible = true; break; }
            }
            if (!anyVisible) continue;

            const brightness = getBrightnessAtVirtualX(ax.points[0].x);
            if (brightness < 0.04) continue;

            const pulse = 0.7 + 0.3 * Math.sin(ax.phase);
            const baseAlpha = brightness * ax.baseBrightness * pulse;

            // Coral-tinted axon, drawn as ink line on paper
            // Outer halo (faint warm)
            ctx.strokeStyle = `rgba(217, 102, 80, ${baseAlpha * 0.10})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(ax.points[0].x - viewportOffset, ax.points[0].y);
            for (let i = 1; i < ax.points.length; i++) {
                ctx.lineTo(ax.points[i].x - viewportOffset, ax.points[i].y);
            }
            ctx.stroke();

            // Mid stroke
            ctx.strokeStyle = `rgba(168, 68, 42, ${baseAlpha * 0.32})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // Ink core
            ctx.strokeStyle = `rgba(122, 50, 30, ${baseAlpha * 0.55})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Schwann cells along axon — ochre ovals
            for (const sc of ax.schwann) {
                sc.phase += sc.pulseSpeed * dt * 0.5;
                const totalSegs = ax.points.length - 1;
                const segIdx = Math.min(totalSegs - 1, Math.floor(sc.t * totalSegs));
                const localT = (sc.t * totalSegs) - segIdx;
                const p1 = ax.points[segIdx];
                const p2 = ax.points[segIdx + 1];
                const sx = (p1.x + (p2.x - p1.x) * localT) - viewportOffset;
                const sy = p1.y + (p2.y - p1.y) * localT;
                if (sx < -30 || sx > width + 30) continue;

                const tangent = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const w = sc.width;
                const len = 8;

                const scAlpha = baseAlpha * (0.6 + 0.4 * Math.sin(sc.phase));
                ctx.fillStyle = `rgba(232, 184, 96, ${scAlpha * 0.5})`;
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(tangent);
                ctx.beginPath();
                ctx.ellipse(0, 0, len, w, 0, 0, Math.PI * 2);
                ctx.fill();
                // Outline
                ctx.strokeStyle = `rgba(168, 130, 60, ${scAlpha * 0.6})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    function drawNeurons(now, dt) {
        for (const n of neurons) {
            n.phase += n.pulseSpeed * dt;
            const sx = n.x - viewportOffset;
            if (sx < -80 || sx > width + 80) continue;

            const brightness = getBrightnessAtVirtualX(n.x);
            if (brightness < 0.03) continue;

            const pulse = 0.6 + 0.4 * Math.sin(n.phase);
            const localBoost = mouseBoost(sx, n.y);
            const intensity = brightness * n.baseBrightness *
                (0.55 + 0.45 * pulse) + localBoost * brightness;

            ctx.lineCap = 'round';
            // Dendrites — teal-ink lines
            for (const d of n.dendrites) {
                const endX = sx + Math.cos(d.angle) * d.length;
                const endY = n.y + Math.sin(d.angle) * d.length;
                const ctrlX = sx + Math.cos(d.angle + d.bend) * d.length * 0.6;
                const ctrlY = n.y + Math.sin(d.angle + d.bend) * d.length * 0.6;

                ctx.strokeStyle = `rgba(74, 138, 138, ${intensity * 0.45})`;
                ctx.lineWidth = 1.0;
                ctx.beginPath();
                ctx.moveTo(sx, n.y);
                ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
                ctx.stroke();

                // Branch
                const branchStartX = sx + (endX - sx) * d.branchAt;
                const branchStartY = n.y + (endY - n.y) * d.branchAt;
                const branchEndX = branchStartX
                    + Math.cos(d.angle + d.branchAngle) * d.branchLength;
                const branchEndY = branchStartY
                    + Math.sin(d.angle + d.branchAngle) * d.branchLength;
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.moveTo(branchStartX, branchStartY);
                ctx.lineTo(branchEndX, branchEndY);
                ctx.stroke();
            }

            // Faint warm halo
            const haloR = n.radius * 4.5;
            const halo = ctx.createRadialGradient(sx, n.y, 0, sx, n.y, haloR);
            halo.addColorStop(0, `rgba(232, 144, 128, ${intensity * 0.32})`);
            halo.addColorStop(1, 'rgba(232, 144, 128, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(sx, n.y, haloR, 0, Math.PI * 2);
            ctx.fill();

            // Soma — coral filled circle with darker outline
            ctx.fillStyle = `rgba(217, 102, 80, ${intensity * 0.85})`;
            ctx.beginPath();
            ctx.arc(sx, n.y, n.radius, 0, Math.PI * 2);
            ctx.fill();

            // Outline
            ctx.strokeStyle = `rgba(122, 50, 30, ${intensity})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();

            // Inner highlight
            ctx.fillStyle = `rgba(255, 220, 200, ${intensity * 0.7})`;
            ctx.beginPath();
            ctx.arc(sx - n.radius * 0.3, n.y - n.radius * 0.3,
                n.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawGrowthCones(now, dt) {
        for (const g of growthCones) {
            g.phase += g.pulseSpeed * dt;
            const sx = g.x - viewportOffset;
            if (sx < -50 || sx > width + 50) continue;

            const brightness = getBrightnessAtVirtualX(g.x);
            if (brightness < 0.04) continue;

            const pulse = 0.55 + 0.45 * Math.sin(g.phase);
            const intensity = brightness * (0.65 + 0.35 * pulse);

            // Trail (warm)
            const trailEndX = sx - Math.cos(g.trailAngle) * g.trailLength;
            const trailEndY = g.y - Math.sin(g.trailAngle) * g.trailLength;
            const trailGrad = ctx.createLinearGradient(
                trailEndX, trailEndY, sx, g.y
            );
            trailGrad.addColorStop(0, 'rgba(217, 102, 80, 0)');
            trailGrad.addColorStop(1, `rgba(168, 68, 42, ${intensity * 0.65})`);
            ctx.strokeStyle = trailGrad;
            ctx.lineWidth = 1.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(trailEndX, trailEndY);
            ctx.lineTo(sx, g.y);
            ctx.stroke();

            // Tip — warm/bright
            const tipR = g.radius * 2.8;
            const tip = ctx.createRadialGradient(sx, g.y, 0, sx, g.y, tipR);
            tip.addColorStop(0, `rgba(255, 240, 220, ${intensity * 0.95})`);
            tip.addColorStop(0.5, `rgba(232, 144, 128, ${intensity * 0.5})`);
            tip.addColorStop(1, 'rgba(232, 144, 128, 0)');
            ctx.fillStyle = tip;
            ctx.beginPath();
            ctx.arc(sx, g.y, tipR, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* -------- Render loop -------- */
    let lastTime = performance.now();

    function render(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        ctx.clearRect(0, 0, width, height);

        drawECM(now);
        drawSutures(now, dt);
        drawAxons(now, dt);
        drawNeurons(now, dt);
        drawGrowthCones(now, dt);

        requestAnimationFrame(render);
    }

    /* -------- Boot -------- */
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(render);

})();
