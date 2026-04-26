/* ============================================================
   neural-bg.js
   Microscopic connective-tissue environment.

   The visual goal is to make the visitor feel like they are
   inside peripheral nerve tissue at high magnification —
   surrounded by neurons, axons, Schwann cells, suture threads,
   and the extracellular matrix that holds it all together.

   Layered rendering (back to front):
   1. ECM mesh — fine collagen-like webbing in the deep background
   2. Endoneurial tubes — long, faint parallel channels
   3. Suture threads — segmented dashed lines threading through
      the tissue at intervals, with anchor points
   4. Long axons — primary neural highways traversing the field
   5. Schwann cells — myelin segments along the axons
   6. Neurons — cell bodies with dendritic processes
   7. Growth cones — bright tips at active regeneration sites
   8. Mouse-responsive halo — local brightening near the cursor

   Each page (home, about, marma, principles) has its own
   ignition state so the lighting cascades naturally as the
   visitor moves through the site.
   ============================================================ */

(function () {
    'use strict';

    const canvas = document.getElementById('neural-bg');
    const ctx = canvas.getContext('2d');

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    // Configuration
    const PAGE_COUNT = 4;
    const VIRTUAL_WIDTH_MULT = PAGE_COUNT;
    const NEURON_COUNT = 55;
    const AXON_COUNT = 22;
    const SCHWANN_PER_AXON = 6;
    const SUTURE_COUNT = 14;
    const ECM_NODE_COUNT = 200;
    const GROWTH_CONE_COUNT = 18;

    // Per-page ignition state
    const pageIgnition = new Array(PAGE_COUNT).fill(0);

    // Environment data
    let neurons = [];
    let axons = [];
    let sutures = [];
    let ecmNodes = [];
    let growthCones = [];

    let viewportOffset = 0;
    let mouseX = -9999;
    let mouseY = -9999;

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
            initEnvironment();
        }
    }

    /* -------- Environment initialization -------- */
    function initEnvironment() {
        const virtualWidth = width * VIRTUAL_WIDTH_MULT;

        // Neurons — cell bodies with dendrites
        neurons = [];
        for (let i = 0; i < NEURON_COUNT; i++) {
            const dendriteCount = 4 + Math.floor(Math.random() * 4);
            const dendrites = [];
            for (let d = 0; d < dendriteCount; d++) {
                const angle = (Math.PI * 2 / dendriteCount) * d
                    + (Math.random() - 0.5) * 0.6;
                const length = 18 + Math.random() * 26;
                // Slight bend in each dendrite
                dendrites.push({
                    angle,
                    length,
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

        // Axons — long curving paths across the field
        axons = [];
        for (let i = 0; i < AXON_COUNT; i++) {
            const startX = Math.random() * virtualWidth;
            const startY = 80 + Math.random() * (height - 160);
            const length = 220 + Math.random() * 380;
            const baseAngle = (Math.random() - 0.5) * 0.8; // mostly horizontal
            // Build a curving path as a sequence of points
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
            // Schwann cell positions along this axon
            const schwann = [];
            for (let k = 1; k <= SCHWANN_PER_AXON; k++) {
                const t = k / (SCHWANN_PER_AXON + 1);
                schwann.push({
                    t,
                    phase: Math.random() * Math.PI * 2,
                    width: 5 + Math.random() * 3
                });
            }
            axons.push({
                points: pts,
                phase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.4 + Math.random() * 0.5,
                baseBrightness: 0.35 + Math.random() * 0.35,
                schwann
            });
        }

        // Sutures — dashed thread paths with anchor points,
        // representing surgical sutures threading through the
        // tissue. Each suture goes through 2-3 anchor points.
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
                baseBrightness: 0.4 + Math.random() * 0.3
            });
        }

        // ECM mesh — distributed background nodes that connect
        // to nearest neighbors with very faint lines
        ecmNodes = [];
        for (let i = 0; i < ECM_NODE_COUNT; i++) {
            ecmNodes.push({
                x: Math.random() * virtualWidth,
                y: Math.random() * height,
                phase: Math.random() * Math.PI * 2
            });
        }

        // Growth cones — active regeneration sites
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
            const duration = 1100;
            function step(now) {
                const t = Math.min(1, (now - startTime) / duration);
                pageIgnition[pageIndex] = start + (1 - start) * easeOutCubic(t);
                if (t < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        },

        setViewportOffset(offsetPx) {
            viewportOffset = offsetPx;
        },

        getPageIgnition(pageIndex) {
            return pageIgnition[pageIndex] || 0;
        },

        setPageCount(n) {
            // Allow main.js to override page count if needed
            // (but we initialize for 4 by default)
        }
    };

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /* -------- Mouse tracking -------- */
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
        mouseX = -9999;
        mouseY = -9999;
    });

    /* -------- Brightness lookup -------- */
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
        return (1 - dist / 180) * 0.35;
    }

    /* -------- Render helpers -------- */
    function drawECM(now) {
        // Faint mesh of nodes connected to nearest neighbors.
        // Render only nodes near the visible viewport for perf.
        ctx.lineWidth = 0.4;
        for (let i = 0; i < ecmNodes.length; i++) {
            const n = ecmNodes[i];
            const sx = n.x - viewportOffset;
            if (sx < -100 || sx > width + 100) continue;
            const brightness = getBrightnessAtVirtualX(n.x);
            if (brightness < 0.05) continue;

            // Connect to a few nearest neighbors
            for (let j = i + 1; j < Math.min(i + 4, ecmNodes.length); j++) {
                const m = ecmNodes[j];
                const mx = m.x - viewportOffset;
                if (mx < -100 || mx > width + 100) continue;
                const dx = sx - mx;
                const dy = n.y - m.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 90) continue;
                const alpha = brightness * (1 - dist / 90) * 0.06;
                if (alpha < 0.005) continue;
                ctx.strokeStyle = `rgba(120, 160, 210, ${alpha})`;
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
            // Compute screen positions of anchors
            const anchors = s.anchors.map(a => ({
                x: a.x - viewportOffset,
                y: a.y
            }));
            // Skip if entirely off-screen
            const minX = Math.min(...anchors.map(a => a.x));
            const maxX = Math.max(...anchors.map(a => a.x));
            if (maxX < -50 || minX > width + 50) continue;

            const brightness = getBrightnessAtVirtualX(s.anchors[0].x);
            if (brightness < 0.03) continue;

            const pulse = 0.6 + 0.4 * Math.sin(s.phase);
            const baseAlpha = brightness * s.baseBrightness * pulse;

            // Draw the suture as dashed segments between anchors
            ctx.lineCap = 'round';
            for (let i = 0; i < anchors.length - 1; i++) {
                const a = anchors[i];
                const b = anchors[i + 1];

                // Create a slight curve between anchors using a midpoint offset
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2 - 8;

                ctx.setLineDash([5, 4]);
                ctx.strokeStyle = `rgba(200, 220, 240, ${baseAlpha * 0.5})`;
                ctx.lineWidth = 1.0;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.quadraticCurveTo(mx, my, b.x, b.y);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Anchor points (entry/exit knots)
            for (const a of anchors) {
                const localBoost = mouseBoost(a.x, a.y);
                const dotAlpha = baseAlpha + localBoost * brightness;
                ctx.fillStyle = `rgba(220, 235, 250, ${dotAlpha})`;
                ctx.beginPath();
                ctx.arc(a.x, a.y, 1.6, 0, Math.PI * 2);
                ctx.fill();

                // Soft glow around anchor
                const glow = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 8);
                glow.addColorStop(0, `rgba(180, 220, 255, ${dotAlpha * 0.3})`);
                glow.addColorStop(1, 'rgba(180, 220, 255, 0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(a.x, a.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawAxons(now, dt) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const ax of axons) {
            ax.phase += ax.pulseSpeed * dt;

            // Skip if all points off-screen
            let anyVisible = false;
            for (const p of ax.points) {
                const sx = p.x - viewportOffset;
                if (sx > -100 && sx < width + 100) { anyVisible = true; break; }
            }
            if (!anyVisible) continue;

            const brightness = getBrightnessAtVirtualX(ax.points[0].x);
            if (brightness < 0.04) continue;

            const pulse = 0.65 + 0.35 * Math.sin(ax.phase);
            const baseAlpha = brightness * ax.baseBrightness * pulse;

            // Outer glow stroke
            ctx.strokeStyle = `rgba(140, 200, 255, ${baseAlpha * 0.18})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(ax.points[0].x - viewportOffset, ax.points[0].y);
            for (let i = 1; i < ax.points.length; i++) {
                ctx.lineTo(ax.points[i].x - viewportOffset, ax.points[i].y);
            }
            ctx.stroke();

            // Mid stroke
            ctx.strokeStyle = `rgba(160, 215, 255, ${baseAlpha * 0.45})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // Bright core
            ctx.strokeStyle = `rgba(220, 240, 255, ${baseAlpha * 0.7})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();

            // Schwann cells along axon
            for (const sc of ax.schwann) {
                sc.phase += sc.pulseSpeed * dt * 0.5;
                // Compute position at parameter t along the polyline
                const totalSegs = ax.points.length - 1;
                const segIdx = Math.min(totalSegs - 1, Math.floor(sc.t * totalSegs));
                const localT = (sc.t * totalSegs) - segIdx;
                const p1 = ax.points[segIdx];
                const p2 = ax.points[segIdx + 1];
                const sx = (p1.x + (p2.x - p1.x) * localT) - viewportOffset;
                const sy = p1.y + (p2.y - p1.y) * localT;
                if (sx < -30 || sx > width + 30) continue;

                // Tangent angle for the segment
                const tangent = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const perp = tangent + Math.PI / 2;
                const w = sc.width;
                const len = 8;

                // Draw Schwann cell as a small elongated ellipse
                // perpendicular to the axon
                const scAlpha = baseAlpha * (0.6 + 0.4 * Math.sin(sc.phase));
                ctx.fillStyle = `rgba(190, 225, 255, ${scAlpha * 0.35})`;
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(tangent);
                ctx.beginPath();
                ctx.ellipse(0, 0, len, w, 0, 0, Math.PI * 2);
                ctx.fill();
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

            const pulse = 0.55 + 0.45 * Math.sin(n.phase);
            const localBoost = mouseBoost(sx, n.y);
            const intensity = brightness * n.baseBrightness * (0.5 + 0.5 * pulse)
                + localBoost * brightness;

            // Dendrites first (so cell body sits on top)
            ctx.lineCap = 'round';
            for (const d of n.dendrites) {
                const endX = sx + Math.cos(d.angle) * d.length;
                const endY = n.y + Math.sin(d.angle) * d.length;
                const ctrlX = sx + Math.cos(d.angle + d.bend) * d.length * 0.6;
                const ctrlY = n.y + Math.sin(d.angle + d.bend) * d.length * 0.6;

                ctx.strokeStyle = `rgba(170, 215, 255, ${intensity * 0.35})`;
                ctx.lineWidth = 1.0;
                ctx.beginPath();
                ctx.moveTo(sx, n.y);
                ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
                ctx.stroke();

                // Branch off the dendrite
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

            // Outer halo
            const haloR = n.radius * 5;
            const halo = ctx.createRadialGradient(sx, n.y, 0, sx, n.y, haloR);
            halo.addColorStop(0, `rgba(180, 230, 255, ${intensity * 0.5})`);
            halo.addColorStop(1, 'rgba(180, 230, 255, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(sx, n.y, haloR, 0, Math.PI * 2);
            ctx.fill();

            // Cell body
            ctx.fillStyle = `rgba(225, 245, 255, ${intensity})`;
            ctx.beginPath();
            ctx.arc(sx, n.y, n.radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner highlight
            ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.85})`;
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

            const pulse = 0.5 + 0.5 * Math.sin(g.phase);
            const intensity = brightness * (0.6 + 0.4 * pulse);

            // Trailing axon segment behind the growth cone
            const trailEndX = sx - Math.cos(g.trailAngle) * g.trailLength;
            const trailEndY = g.y - Math.sin(g.trailAngle) * g.trailLength;
            const trailGrad = ctx.createLinearGradient(
                trailEndX, trailEndY, sx, g.y
            );
            trailGrad.addColorStop(0, 'rgba(180, 220, 255, 0)');
            trailGrad.addColorStop(1, `rgba(220, 245, 255, ${intensity * 0.7})`);
            ctx.strokeStyle = trailGrad;
            ctx.lineWidth = 1.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(trailEndX, trailEndY);
            ctx.lineTo(sx, g.y);
            ctx.stroke();

            // Bright cone tip
            const tipR = g.radius * 3;
            const tip = ctx.createRadialGradient(sx, g.y, 0, sx, g.y, tipR);
            tip.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.95})`);
            tip.addColorStop(0.5, `rgba(180, 230, 255, ${intensity * 0.5})`);
            tip.addColorStop(1, 'rgba(180, 230, 255, 0)');
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
