(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  /* ---------- Theme toggle ---------- */
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return prefersDark.matches ? 'dark' : 'light';
  }

  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      document.dispatchEvent(new Event('themechange'));
    });
  }
  if (prefersDark.addEventListener) {
    prefersDark.addEventListener('change', function () {
      document.dispatchEvent(new Event('themechange'));
    });
  }

  /* ---------- Top bar border on scroll ---------- */
  var topbar = document.querySelector('.topbar');
  function onScroll() {
    if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll + active nav ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  var navLinks = document.querySelectorAll('.nav a');
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('active'); });
        var link = byId[e.target.id];
        if (link) link.classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { navIo.observe(s); });
  }

  /* ---------- Copy email ---------- */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  });

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Hero honeycomb: sensors ping, packets hop to the gateway ---------- */
  var canvas = document.getElementById('hive');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, R = 0, cells = [], gateway = null, packets = [];
  var colors = {};
  var running = false, visible = true, raf = 0, last = 0, acc = 0;

  function readColors() {
    var cs = getComputedStyle(root);
    colors.line = cs.getPropertyValue('--hive-line').trim();
    colors.honey = cs.getPropertyValue('--honey').trim();
    colors.ink = cs.getPropertyValue('--ink').trim();
  }

  function hexPath(x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 180 * (60 * i - 90);
      var px = x + r * Math.cos(a), py = y + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function build() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    R = Math.max(13, Math.min(24, W / 18));
    var w = Math.sqrt(3) * R, h = 1.5 * R;
    cells = [];
    for (var row = -1; row * h < H + R; row++) {
      for (var col = -1; col * w < W + w; col++) {
        cells.push({ x: col * w + (row % 2 ? w / 2 : 0), y: row * h, a: 0, n: [] });
      }
    }
    var lim = w * 1.05;
    for (var i = 0; i < cells.length; i++) {
      for (var j = i + 1; j < cells.length; j++) {
        var dx = cells[i].x - cells[j].x, dy = cells[i].y - cells[j].y;
        if (dx * dx + dy * dy < lim * lim) { cells[i].n.push(j); cells[j].n.push(i); }
      }
    }
    var best = Infinity;
    cells.forEach(function (c, idx) {
      var d = Math.pow(c.x - W * 0.52, 2) + Math.pow(c.y - H * 0.5, 2);
      if (d < best) { best = d; gateway = idx; }
    });
    packets = [];
  }

  function dist2(a, b) {
    var dx = cells[a].x - cells[b].x, dy = cells[a].y - cells[b].y;
    return dx * dx + dy * dy;
  }

  // A sensor pings, then its reading hops cell by cell toward the gateway.
  function spawn() {
    var start = Math.floor(Math.random() * cells.length);
    var c = cells[start];
    if (c.x < R || c.x > W - R || c.y < R || c.y > H - R) return;
    if (dist2(start, gateway) < Math.pow(R * 4, 2)) return;
    c.a = 1;
    packets.push({ at: start, t: 0 });
  }

  function step(dt) {
    cells.forEach(function (c) { c.a = Math.max(0, c.a - dt * 0.9); });
    acc += dt;
    if (acc > 0.32) { acc = 0; spawn(); }
    for (var p = packets.length - 1; p >= 0; p--) {
      var pk = packets[p];
      pk.t += dt;
      if (pk.t < 0.11) continue;
      pk.t = 0;
      if (pk.at === gateway) { packets.splice(p, 1); continue; }
      var nbrs = cells[pk.at].n, next = pk.at, bestD = dist2(pk.at, gateway);
      for (var k = 0; k < nbrs.length; k++) {
        var d = dist2(nbrs[k], gateway) * (0.85 + Math.random() * 0.3);
        if (d < bestD) { bestD = d; next = nbrs[k]; }
      }
      if (next === pk.at) { packets.splice(p, 1); continue; }
      pk.at = next;
      cells[next].a = Math.max(cells[next].a, 0.55);
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      hexPath(c.x, c.y, R * 0.9);
      if (c.a > 0.01) {
        ctx.globalAlpha = c.a * 0.9;
        ctx.fillStyle = colors.honey;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = colors.line;
      ctx.stroke();
    }
    if (gateway !== null && cells[gateway]) {
      var g = cells[gateway];
      var breathe = reduceMotion.matches ? 0 : Math.sin((time || 0) / 600) * 0.08;
      hexPath(g.x, g.y, R * 0.9);
      ctx.strokeStyle = colors.honey;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(g.x, g.y, R * (0.28 + breathe), 0, Math.PI * 2);
      ctx.fillStyle = colors.honey;
      ctx.fill();
      ctx.lineWidth = 1;
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    step(dt);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion.matches || !visible || document.hidden) return;
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function staticFrame() {
    // A calm, fixed pattern for reduced motion.
    for (var i = 0; i < cells.length; i += 7) cells[i].a = 0.25 + (i % 3) * 0.15;
    draw(0);
  }

  function init() {
    readColors();
    build();
    if (reduceMotion.matches) staticFrame(); else { draw(0); start(); }
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 150);
  });
  document.addEventListener('themechange', function () { readColors(); draw(0); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(canvas);
  }
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function () { stop(); init(); });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else init();
})();
