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
  var phone = window.matchMedia('(max-width: 900px)');
  var lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    if (topbar) topbar.classList.toggle('scrolled', y > 8);
    // Phones: tuck the bar away while reading down, bring it back on any scroll up.
    var dy = y - lastY;
    if (Math.abs(dy) > 6 || y < 80) {
      var menuOpen = document.body.classList.contains('menu-open');
      root.classList.toggle('bar-away', phone.matches && !menuOpen && dy > 0 && y > 200 && !topbar.contains(document.activeElement));
      lastY = y;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.querySelector('.menu-toggle');
  var menu = document.getElementById('mobile-menu');
  if (menuBtn && menu && topbar) {
    var setMenu = function (open) {
      if (open === !menu.hidden) return;
      // Keep the page from shifting when a classic scrollbar goes away.
      document.body.style.paddingRight = open ? (window.innerWidth - root.clientWidth) + 'px' : '';
      document.body.classList.toggle('menu-open', open);
      menu.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
      // The top bar is sticky, so a plain focus() would scroll the page to where it sits in the flow.
      (open ? menu.querySelector('a') : menuBtn).focus({ preventScroll: true });
    };
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
    // Closing first unlocks the page, so the link's own scroll to its section can run.
    topbar.addEventListener('click', function (e) {
      if (!e.target.closest('a') || menu.hidden) return;
      setMenu(false);
      // Following a link drops focus, so hand it back once the browser has done that.
      setTimeout(function () { menuBtn.focus({ preventScroll: true }); });
    });
    document.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key !== 'Tab') return;
      // The page behind is locked, so Tab stays in the top bar and the panel. Moved by hand because Safari's Tab skips links.
      var items = [].filter.call(topbar.querySelectorAll('a, button'), function (el) { return el.offsetWidth > 0; });
      var at = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(at + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus({ preventScroll: true });
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

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

  // Count the headline numbers up from zero the first time they come into view.
  var stats = document.querySelector('.stats');
  if (stats && 'IntersectionObserver' in window && !reduceMotion.matches) {
    var counters = [].filter.call(stats.querySelectorAll('dd'), function (dd) { return /\d/.test(dd.textContent) && dd.textContent.indexOf('\u2192') < 0; });
    var statIo = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      statIo.disconnect();
      counters.forEach(function (dd) {
        var text = dd.textContent, target = parseInt(text.match(/\d+/)[0], 10), t0 = performance.now();
        dd.setAttribute('aria-label', text);
        (function tick(now) {
          var p = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - p, 3);
          dd.textContent = text.replace(/\d+/, String(Math.round(target * e)));
          if (p < 1) requestAnimationFrame(tick); else dd.removeAttribute('aria-label');
        })(t0);
      });
    }, { threshold: 0.4 });
    statIo.observe(stats);
  }

  // Only links to sections on this page take part; a link to another page keeps its own state.
  var navLinks = [].filter.call(document.querySelectorAll('.nav a, .mobile-nav a'), function (a) {
    return a.getAttribute('href').charAt(0) === '#';
  });
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      (byId[id] = byId[id] || []).push(a);
    });
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('active'); });
        (byId[e.target.id] || []).forEach(function (a) { a.classList.add('active'); });
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

  /* ---------- Organizations marquee ---------- */
  var marquee = document.querySelector('.marquee');
  if (marquee) {
    // A logo that is missing or fails to load leaves its card as a plain name.
    var dropLogo = function (img) {
      img.parentNode.classList.remove('org--logo');
      img.remove();
    };
    marquee.addEventListener('error', function (e) {
      if (e.target.tagName === 'IMG') dropLogo(e.target);
    }, true);
    marquee.querySelectorAll('img').forEach(function (img) {
      if (img.complete && !img.naturalWidth) dropLogo(img);
    });

    var list = marquee.querySelector('.org-list');
    if (list && !reduceMotion.matches) {
      var clone = list.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.removeAttribute('aria-label');
      list.parentNode.appendChild(clone);

      // Constant speed (px per second) whatever the number of logos.
      var sizeMarquee = function () {
        marquee.style.setProperty('--marquee-dur', Math.max(20, list.offsetWidth / 40) + 's');
      };
      sizeMarquee();
      window.addEventListener('load', sizeMarquee);
      window.addEventListener('resize', sizeMarquee);
      marquee.classList.add('is-moving');
    }
  }

  /* ---------- Scroll-linked sections ---------- */
  var stackable = window.matchMedia('(min-width: 821px)');
  var stacking = window.matchMedia('screen and (min-width: 821px) and (min-height: 720px) and (prefers-reduced-motion: no-preference)');
  var proc = document.querySelector('.process');
  var procView = proc && proc.querySelector('.process-viewport');
  var stacks = [].slice.call(document.querySelectorAll('[data-stack]')).map(function (s) {
    return [].slice.call(s.children);
  });
  var timeline = document.querySelector('.timeline');
  var jobs = timeline ? [].slice.call(timeline.querySelectorAll('.job')) : [];
  var stage = document.querySelector('.hood-stage');
  var hoodItems = [].slice.call(document.querySelectorAll('.hood-item'));
  var scenes = stage ? [].slice.call(stage.querySelectorAll('.scene')) : [];
  var segments = stage ? [].slice.call(stage.querySelectorAll('.stage-progress span')) : [];
  var hoodActive = 0;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function setHoodActive(i) {
    if (i === hoodActive) return;
    hoodItems[hoodActive].classList.remove('is-active');
    scenes[hoodActive].classList.remove('is-active');
    hoodActive = i;
    hoodItems[i].classList.add('is-active');
    scenes[i].classList.add('is-active');
    stage.querySelector('.stage-count b').textContent = (i < 9 ? '0' : '') + (i + 1);
    stage.querySelector('.stage-name').textContent = hoodItems[i].querySelector('h3').textContent;
  }

  // What I do: where the cards overflow, show how far along the scroller is and that there's more.
  function updateProcess() {
    if (!proc) return;
    var max = procView.scrollWidth - procView.clientWidth;
    var canScroll = max > 1;
    proc.classList.toggle('can-scroll', canScroll);
    proc.classList.toggle('at-end', canScroll && procView.scrollLeft >= max - 2);
    if (canScroll) {
      procView.tabIndex = 0;
      proc.style.setProperty('--thumb', (procView.clientWidth / procView.scrollWidth * 100).toFixed(2) + '%');
      proc.style.setProperty('--pos', (procView.scrollLeft / procView.clientWidth * 100).toFixed(2) + '%');
    } else {
      procView.removeAttribute('tabindex');
    }
  }

  function updateScrollFx() {
    // Work: each card shrinks a little and its content fades as the next one slides over it.
    stacks.forEach(function (cards) {
      for (var i = 0; i < cards.length - 1; i++) {
        var q = 0;
        if (stacking.matches) {
          var gap = cards[i + 1].getBoundingClientRect().top - cards[i].getBoundingClientRect().top;
          q = clamp01(1 - gap / cards[i].offsetHeight);
        }
        cards[i].style.transform = q ? 'scale(' + (1 - q * 0.05).toFixed(4) + ')' : '';
        cards[i].style.setProperty('--covered', clamp01((q - 0.15) / 0.6).toFixed(3));
      }
    });

    // Platforms: whichever item has crossed the reading line drives the pinned stage.
    // On phones the stage pins to the top, so the line sits a third of the way into the space below it.
    if (stage && hoodItems.length) {
      var vh = window.innerHeight;
      var read = stackable.matches ? vh * 0.5 : stage.getBoundingClientRect().bottom + (vh - stage.getBoundingClientRect().bottom) * 0.35;
      var next = 0;
      hoodItems.forEach(function (item, i) {
        var b = item.getBoundingClientRect();
        if (b.top <= read) next = i;
        if (segments[i]) segments[i].style.setProperty('--p', clamp01((read - b.top) / b.height).toFixed(3));
      });
      setHoodActive(next);
    }

    // Experience: fill the rail down to a line 60% of the way down the screen.
    if (timeline) {
      var line = window.innerHeight * 0.6;
      var t = timeline.getBoundingClientRect();
      timeline.style.setProperty('--tl', Math.round(Math.max(0, Math.min(t.height, line - t.top - 10))) + 'px');
      jobs.forEach(function (job) {
        job.classList.toggle('passed', job.getBoundingClientRect().top + 38 <= line);
      });
    }
  }

  var fxQueued = false;
  function queueFx() {
    if (fxQueued) return;
    fxQueued = true;
    requestAnimationFrame(function () { fxQueued = false; updateScrollFx(); });
  }
  function relayout() { updateProcess(); updateScrollFx(); }
  if (procView) procView.addEventListener('scroll', updateProcess, { passive: true });
  window.addEventListener('scroll', queueFx, { passive: true });
  window.addEventListener('resize', relayout);
  window.addEventListener('load', relayout);
  relayout();

  // How I work: play the step sequence once, when it comes into view.
  var steps = document.querySelector('.steps');
  if (steps) {
    if ('IntersectionObserver' in window && !reduceMotion.matches) {
      var stepIo = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          steps.classList.add('play');
          stepIo.disconnect();
        }
      }, { threshold: 0.35 });
      stepIo.observe(steps);
    } else {
      steps.classList.add('play');
    }
  }

  /* ---------- Hero honeycomb: cells ping in the ring around the portrait,
     and each ping hops cell by cell inward toward it ---------- */
  var canvas = document.getElementById('hive');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, R = 0, cx = 0, cy = 0, rIn = 0, rOut = 0, cells = [], ring = [], packets = [];
  var colors = {};
  var running = false, visible = true, raf = 0, last = 0, acc = 0;

  // Matches .portrait { width: 74% } and the canvas mask in style.css.
  var PORTRAIT = 0.74;

  function readColors() {
    var cs = getComputedStyle(root);
    colors.line = cs.getPropertyValue('--hive-line').trim();
    colors.brand = cs.getPropertyValue('--brand').trim();
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

  function distC(c) {
    var dx = c.x - cx, dy = c.y - cy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function build() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cx = W / 2; cy = H / 2;
    rIn = Math.min(W, H) * PORTRAIT / 2;
    rOut = Math.min(W, H) / 2;
    R = Math.max(10, Math.min(22, W / 20));
    var w = Math.sqrt(3) * R, h = 1.5 * R;
    cells = [];
    for (var row = -1; row * h < H + R; row++) {
      for (var col = -1; col * w < W + w; col++) {
        var c = { x: col * w + (row % 2 ? w / 2 : 0), y: row * h, a: 0, n: [] };
        c.d = distC(c);
        if (c.d < rIn - R * 1.2 || c.d > rOut + R) continue; // hidden by the photo or the mask
        cells.push(c);
      }
    }
    var lim = w * 1.05;
    for (var i = 0; i < cells.length; i++) {
      for (var j = i + 1; j < cells.length; j++) {
        var dx = cells[i].x - cells[j].x, dy = cells[i].y - cells[j].y;
        if (dx * dx + dy * dy < lim * lim) { cells[i].n.push(j); cells[j].n.push(i); }
      }
    }
    ring = [];
    cells.forEach(function (c, idx) {
      if (c.d > rIn + R * 1.5 && c.d < rOut - R * 0.2) ring.push(idx);
    });
    packets = [];
  }

  function spawn() {
    if (!ring.length) return;
    var start = ring[Math.floor(Math.random() * ring.length)];
    cells[start].a = 1;
    packets.push({ at: start, t: 0 });
  }

  function step(dt) {
    cells.forEach(function (c) { c.a = Math.max(0, c.a - dt * 0.9); });
    acc += dt;
    if (acc > 0.28) { acc = 0; spawn(); }
    for (var p = packets.length - 1; p >= 0; p--) {
      var pk = packets[p];
      pk.t += dt;
      if (pk.t < 0.12) continue;
      pk.t = 0;
      var cur = cells[pk.at];
      if (cur.d < rIn - R * 0.5) { packets.splice(p, 1); continue; }
      var next = pk.at, best = cur.d;
      for (var k = 0; k < cur.n.length; k++) {
        var d = cells[cur.n[k]].d * (0.92 + Math.random() * 0.16);
        if (d < best) { best = d; next = cur.n[k]; }
      }
      if (next === pk.at) { packets.splice(p, 1); continue; }
      pk.at = next;
      cells[next].a = Math.max(cells[next].a, 0.55);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      hexPath(c.x, c.y, R * 0.9);
      if (c.a > 0.01) {
        ctx.globalAlpha = c.a * 0.9;
        ctx.fillStyle = colors.brand;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = colors.line;
      ctx.stroke();
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    step(dt);
    draw();
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
    for (var i = 0; i < ring.length; i += 5) cells[ring[i]].a = 0.25 + (i % 3) * 0.15;
    draw();
  }

  function init() {
    readColors();
    build();
    if (reduceMotion.matches) staticFrame(); else { draw(); start(); }
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 150);
  });
  document.addEventListener('themechange', function () { readColors(); draw(); });
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
