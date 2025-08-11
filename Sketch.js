/**
 * kandinsky-painter.js
 *
 * A single-file, self-contained JavaScript sketch that:
 * - Creates a full-window canvas (Hi-DPI aware)
 * - Draws a colorful, Kandinsky-inspired abstract composition
 * - Animates shapes with rotation, translation, pulsing, and parallax
 * - Exposes a small API: pause/resume/destroy
 *
 * Drop this file into any page or load it with:
 *   <script src="kandinsky-painter.js"></script>
 *
 * Only uses vanilla Canvas 2D.
 */

(() => {
  // --- Config ---
  const DPR = Math.max(1, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.id = 'kandinsky-canvas';
  canvas.style.position = 'fixed';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '9999';
  canvas.style.pointerEvents = 'auto';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: true });

  let width = 0, height = 0;
  function resize() {
    width = Math.max(300, window.innerWidth);
    height = Math.max(200, window.innerHeight);
    canvas.width = Math.round(width * DPR);
    canvas.height = Math.round(height * DPR);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // --- Utilities ---
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // --- Color palette (Kandinsky-inspired bright contrasts) ---
  const PALETTE = [
    '#F23B5A', // warm red
    '#FFC857', // golden yellow
    '#8BD3DD', // pale teal
    '#3A7CA5', // deep blue
    '#6F2DA8', // violet
    '#FFFFFF', // white
    '#000000', // black
    '#FF7AB6'  // pink
  ];

  // --- Scene objects ---
  // We'll create layers: background texture, floating circles, angular shapes, strokes, and rotating groups.
  const shapes = [];
  const strokes = [];
  const groups = []; // rotating groups of primitives

  // --- Build scene generator functions ---
  function makeCircle(opts = {}) {
    return Object.assign({
      type: 'circle',
      x: rand(0.1 * width, 0.9 * width),
      y: rand(0.12 * height, 0.88 * height),
      r: rand(18, 120),
      fill: PALETTE[Math.floor(rand(0, PALETTE.length))],
      stroke: null,
      strokeWidth: rand(0, 6),
      vx: rand(-6, 6) / 200, // slow drift
      vy: rand(-6, 6) / 200,
      wobble: rand(0.2, 1.2),
      phase: rand(0, TAU)
    }, opts);
  }

  function makeTriangle(opts = {}) {
    return Object.assign({
      type: 'triangle',
      x: rand(0.12 * width, 0.88 * width),
      y: rand(0.12 * height, 0.88 * height),
      size: rand(40, 220),
      rotation: rand(0, TAU),
      rotationSpeed: rand(-0.01, 0.01),
      fill: PALETTE[Math.floor(rand(0, PALETTE.length))],
      stroke: '#000000',
      strokeWidth: rand(1, 4),
      skew: rand(-0.3, 0.3),
    }, opts);
  }

  function makeRect(opts = {}) {
    return Object.assign({
      type: 'rect',
      x: rand(0.05 * width, 0.95 * width),
      y: rand(0.05 * height, 0.95 * height),
      w: rand(30, 240),
      h: rand(20, 160),
      rotation: rand(0, TAU),
      rotationSpeed: rand(-0.008, 0.008),
      fill: PALETTE[Math.floor(rand(0, PALETTE.length))],
      stroke: '#000000',
      strokeWidth: rand(1, 4),
    }, opts);
  }

  function makeStroke(opts = {}) {
    return Object.assign({
      type: 'stroke',
      points: buildWavyLine(rand(100, width - 100), rand(100, height - 100), rand(0.3, 1.5)),
      color: PALETTE[Math.floor(rand(0, PALETTE.length))],
      width: rand(1.2, 6),
      drift: rand(0.001, 0.006),
      phase: rand(0, TAU)
    }, opts);
  }

  function buildWavyLine(cx, cy, scale) {
    const pts = [];
    const segs = Math.floor(rand(3, 8));
    const length = rand(120, Math.min(width, height) * 0.8) * scale;
    const angle = rand(0, TAU);
    for (let i = 0; i < segs + 1; i++) {
      const t = i / segs;
      pts.push({
        x: cx + Math.cos(angle) * (t - 0.5) * length + rand(-40, 40),
        y: cy + Math.sin(angle) * (t - 0.5) * length + rand(-40, 40),
      });
    }
    return pts;
  }

  function makeGroup(count = 6, cx = null, cy = null) {
    const centerX = cx ?? rand(width * 0.2, width * 0.8);
    const centerY = cy ?? rand(height * 0.2, height * 0.8);
    const g = {
      type: 'group',
      x: centerX,
      y: centerY,
      rotation: rand(0, TAU),
      speed: rand(-0.003, 0.003),
      scale: rand(0.6, 1.4),
      children: []
    };
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * TAU + rand(-0.2, 0.2);
      const dist = rand(30, 140) * g.scale;
      const child = {
        kind: Math.random() > 0.5 ? 'circle' : (Math.random() > 0.5 ? 'rect' : 'triangle'),
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist,
        r: rand(8, 48) * g.scale,
        w: rand(18, 80) * g.scale,
        h: rand(12, 60) * g.scale,
        fill: PALETTE[Math.floor(rand(0, PALETTE.length))],
        stroke: Math.random() > 0.6 ? '#000' : null,
        strokeWidth: rand(0.5, 3)
      };
      g.children.push(child);
    }
    return g;
  }

  // --- Populate scene ---
  for (let i = 0; i < 9; i++) shapes.push(makeCircle());
  for (let i = 0; i < 8; i++) shapes.push(makeTriangle());
  for (let i = 0; i < 6; i++) shapes.push(makeRect());
  for (let i = 0; i < 5; i++) strokes.push(makeStroke());
  for (let i = 0; i < 3; i++) groups.push(makeGroup(rand(5, 10)));

  // Add a subtle textured grid in the background
  function drawBackgroundTexture() {
    // soft radial wash
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, '#FFF9F2');
    g.addColorStop(1, '#F0F7FF');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // light diagonal hatch
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    const step = Math.max(20, Math.min(60, Math.floor((width + height) / 60)));
    for (let x = -height; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height, height);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Render helpers ---
  function drawCircle(s, t) {
    const wobble = Math.sin(s.phase + t * s.wobble) * 0.08;
    s.x += s.vx;
    s.y += s.vy;
    // wrap-around subtlely
    if (s.x < -s.r) s.x = width + s.r;
    if (s.x > width + s.r) s.x = -s.r;
    if (s.y < -s.r) s.y = height + s.r;
    if (s.y > height + s.r) s.y = -s.r;

    const rad = s.r * (1 + 0.06 * Math.sin(t * 0.9 + s.phase));
    ctx.save();
    ctx.translate(s.x, s.y);
    // soft glow
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(0, 0, rad * 0.1, 0, 0, rad * 1.1);
    grad.addColorStop(0, s.fill);
    grad.addColorStop(1, hexToRgba(s.fill, 0.05));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // crisp inner circle
    ctx.beginPath();
    ctx.fillStyle = s.fill;
    ctx.arc(0, 0, rad * 0.6 * (1 + wobble * 0.6), 0, TAU);
    ctx.fill();

    // optional stroke
    if (s.strokeWidth > 0) {
      ctx.lineWidth = s.strokeWidth;
      ctx.strokeStyle = hexToRgba('#000000', 0.12);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTriangle(s, t) {
    ctx.save();
    ctx.translate(s.x, s.y);
    s.rotation = (s.rotation || 0) + s.rotationSpeed;
    ctx.rotate(s.rotation);
    const size = s.size;
    const skew = s.skew || 0;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(size * 0.6 + skew * size, size * 0.4);
    ctx.lineTo(-size * 0.6 + skew * size, size * 0.4);
    ctx.closePath();
    // gradient fill
    const g = ctx.createLinearGradient(-size, -size, size, size);
    g.addColorStop(0, s.fill);
    g.addColorStop(1, hexToRgba(s.fill, 0.6));
    ctx.fillStyle = g;
    ctx.fill();
    if (s.stroke) {
      ctx.lineWidth = s.strokeWidth;
      ctx.strokeStyle = s.stroke;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRect(s, t) {
    ctx.save();
    ctx.translate(s.x, s.y);
    s.rotation = (s.rotation || 0) + s.rotationSpeed;
    ctx.rotate(s.rotation);
    ctx.beginPath();
    ctx.rect(-s.w / 2, -s.h / 2, s.w, s.h);
    const g = ctx.createLinearGradient(-s.w / 2, -s.h / 2, s.w / 2, s.h / 2);
    g.addColorStop(0, s.fill);
    g.addColorStop(1, hexToRgba(s.fill, 0.6));
    ctx.fillStyle = g;
    ctx.fill();
    if (s.stroke) {
      ctx.lineWidth = s.strokeWidth;
      ctx.strokeStyle = s.stroke;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawStroke(st, t) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    const pts = st.points;
    // drift a bit over time
    const dx = Math.sin(t * st.drift + st.phase) * 6;
    const dy = Math.cos(t * st.drift + st.phase) * 6;
    ctx.moveTo(pts[0].x + dx, pts[0].y + dy);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      ctx.quadraticCurveTo(
        p.x - 10 + dx,
        p.y - 10 + dy,
        p.x + dx,
        p.y + dy
      );
    }
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.width;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.restore();
  }

  function drawGroup(g, t) {
    g.rotation += g.speed;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rotation + Math.sin(t * 0.2) * 0.03);
    ctx.scale(g.scale, g.scale);
    for (const c of g.children) {
      ctx.save();
      ctx.translate(c.x, c.y);
      if (c.kind === 'circle') {
        const r = c.r * (1 + 0.08 * Math.sin(t * 0.9 + (c.x + c.y) * 0.01));
        ctx.beginPath();
        ctx.fillStyle = c.fill;
        ctx.arc(0, 0, r, 0, TAU);
        ctx.fill();
        if (c.stroke) {
          ctx.lineWidth = c.strokeWidth;
          ctx.strokeStyle = c.stroke;
          ctx.stroke();
        }
      } else if (c.kind === 'rect') {
        ctx.fillStyle = c.fill;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        if (c.stroke) { ctx.lineWidth = c.strokeWidth; ctx.strokeStyle = c.stroke; ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h); }
      } else if (c.kind === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(0, -c.r);
        ctx.lineTo(c.r, c.r);
        ctx.lineTo(-c.r, c.r);
        ctx.closePath();
        ctx.fillStyle = c.fill;
        ctx.fill();
        if (c.stroke) { ctx.lineWidth = c.strokeWidth; ctx.strokeStyle = c.stroke; ctx.stroke(); }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // --- Helpers ---
  function hexToRgba(hex, alpha = 1) {
    // supports #rrggbb or #rgb
    const h = hex.replace('#', '');
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // --- Animation loop ---
  let running = true;
  let last = performance.now();
  let time = 0;

  function frame(now) {
    const dt = Math.min(40, now - last);
    last = now;
    if (!running) {
      requestAnimationFrame(frame);
      return;
    }
    time += dt * 0.001; // seconds

    // draw
    ctx.clearRect(0, 0, width, height);

    // background
    drawBackgroundTexture();

    // deep background rotating translucent ring
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.translate(width * 0.5, height * 0.45);
    ctx.rotate(Math.sin(time * 0.1) * 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(width, height) * 0.28, 0, TAU);
    ctx.lineWidth = Math.min(width, height) * 0.1;
    ctx.strokeStyle = '#FFC857';
    ctx.stroke();
    ctx.restore();

    // groups (foreground decor)
    for (const g of groups) drawGroup(g, time);

    // strokes (curved lines)
    for (const s of strokes) drawStroke(s, time);

    // shapes (circles, triangles, rects) - mix drawing order for lively composition
    // Slight parallax: objects higher on canvas move slightly differently (simple effect)
    shapes.sort((a, b) => (a.y || 0) - (b.y || 0));
    for (const s of shapes) {
      const par = 1 + ((s.y / height) - 0.5) * 0.08;
      // subtle temporal motion
      if (s.type === 'circle') {
        s.x += Math.sin(time * 0.2 + (s.x + s.y) * 0.001) * 0.02 * par;
        s.y += Math.cos(time * 0.14 + (s.x - s.y) * 0.001) * 0.02 * par;
        drawCircle(s, time);
      } else if (s.type === 'triangle') {
        s.x += Math.sin(time * 0.18 + s.phase || 0) * 0.01 * par;
        drawTriangle(s, time);
      } else if (s.type === 'rect') {
        drawRect(s, time);
      }
    }

    // small overlay accents: rotating small shapes
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.translate(width * 0.85, height * 0.18);
    ctx.rotate(Math.sin(time * 0.6) * 0.6);
    // small black circle with white dot
    ctx.beginPath();
    ctx.fillStyle = '#000';
    ctx.arc(0, 0, 22, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(-6, -6, 6, 0, TAU);
    ctx.fill();
    ctx.restore();

    // signature-esque mark (abstract "K")
    ctx.save();
    ctx.translate(width * 0.06, height * 0.92);
    ctx.rotate(-0.12 + Math.sin(time * 0.4) * 0.02);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#3A7CA5';
    ctx.fillRect(0, 0, 10, 36);
    ctx.beginPath();
    ctx.moveTo(8, 18);
    ctx.lineTo(34, 0);
    ctx.lineTo(34, 6);
    ctx.lineTo(12, 22);
    ctx.lineTo(34, 36);
    ctx.lineTo(34, 42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  // --- Public API ---
  window.__kandinskyPainter = {
    pause() { running = false; },
    resume() { running = true; last = performance.now(); },
    toggle() { running = !running; last = performance.now(); },
    destroy() {
      running = false;
      window.removeEventListener('resize', resize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      delete window.__kandinskyPainter;
    }
  };

  // Pause/resume on canvas click for easy interaction
  canvas.addEventListener('click', () => {
    window.__kandinskyPainter.toggle();
  }, { passive: true });

})();
