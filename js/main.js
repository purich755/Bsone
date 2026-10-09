/* BSONE — общие анимации: Lenis + ScrollTrigger, прелоадер, кольцо, FREEZE, раунды, меню.
   Всё, что видит пользователь, есть в HTML и без скриптов: здесь только движение. */
(() => {
  'use strict';

  const body = document.body;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const anim = hasGsap && !reduced;
  const isDesk = () => innerWidth >= 1024;
  const isMob = () => innerWidth < 768;

  const BS = (window.BS = { reduced, fine, anim, hasGsap, lenis: null, isMob });
  window.__bs = BS;
  body.classList.add(anim ? 'is-anim' : hasGsap ? 'reduced' : 'no-anim');

  /* ———————————— Маркерные круги: неровный контур «от руки», две обводки ———————————— */
  const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  function markerD(seed, o = {}) {
    const r = rng(seed);
    const cx = o.cx ?? 100, cy = o.cy ?? 100;
    const rx = o.rx ?? 86, ry = o.ry ?? 84, turns = o.turns ?? 1.1, wob = o.wob ?? 1, drift = o.drift ?? 0.05;
    const start = ((o.start ?? -110) * Math.PI) / 180;
    const N = Math.round(60 * turns);
    const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = start + t * turns * Math.PI * 2;
      const k = 1 + (Math.sin(a * 2 + ph[0]) * 0.022 + Math.sin(a * 3 + ph[1]) * 0.014 + Math.sin(a * 5 + ph[2]) * 0.006) * wob + (t - 0.5) * drift;
      pts.push([cx + Math.cos(a) * rx * k + (r() - 0.5) * 0.5, cy + Math.sin(a) * ry * k + (r() - 0.5) * 0.5]);
    }
    const f = (n) => n.toFixed(2);
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
    }
    return d;
  }
  function fillMarker(svg, seed, o = {}) {
    if (!svg) return;
    const a = $('.mk-a', svg), b = $('.mk-b', svg);
    a.setAttribute('d', markerD(seed, o));
    b.setAttribute('d', markerD(seed + 11, { ...o, rx: (o.rx ?? 86) - 3 * ((o.cx ?? 100) / 100), ry: (o.ry ?? 84) + 2, turns: (o.turns ?? 1.1) - 0.07, start: (o.start ?? -110) + 16, wob: (o.wob ?? 1) * 1.3 }));
    a.setAttribute('pathLength', 1); b.setAttribute('pathLength', 1);
  }
  // эллипс под пропорции рамки: viewBox подгоняется под реальный размер, толщина штриха остаётся ровной
  const fitList = [];
  function fitMarker(svg, seed, o = {}, again) {
    if (!svg) return;
    if (!again) fitList.push([svg, seed, o]);
    const r = svg.getBoundingClientRect();
    const ar = r.width && r.height ? r.width / r.height : 1;
    svg.setAttribute('viewBox', `0 0 ${(200 * ar).toFixed(1)} 200`);
    fillMarker(svg, seed, { ...o, cx: 100 * ar, rx: (o.rx ?? 86) * ar });
  }
  let fitT;
  addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(() => fitList.forEach(([s, sd, o]) => fitMarker(s, sd, o, true)), 250); });
  const RING = { rx: 84, ry: 83.5, turns: 1.06, start: -96, wob: 0.6, drift: 0.035 };
  fillMarker($('.cypher-mark'), 7, RING);
  fillMarker($('.preloader-ring'), 7, RING);
  fillMarker($('.menu-circle'), 21, { turns: 1.04, wob: 0.8 });
  fitMarker($('.freeze-mark'), 33, { rx: 92, ry: 80, turns: 1.12, start: -150, wob: 1.2 });
  fillMarker($('.coach-mark'), 45, { rx: 80, ry: 86, turns: 1.12, start: -60, wob: 1.6 });
  fitMarker($('.address-mark'), 58, { rx: 94, ry: 86, turns: 1.08, start: -170, wob: 1 });
  $$('.frame-mark').forEach((s, i) => fitMarker(s, 70 + i * 13, { rx: 84 + (i % 2) * 6, ry: 80, turns: 1.1 + (i % 3) * 0.04, start: -130 + i * 40, wob: 1.6 }));
  BS.fillMarker = fillMarker;

  const drawMk = (svg, vars = {}) => {
    const paths = $$('path', svg);
    return gsap.fromTo(paths, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.28, ...vars });
  };
  BS.drawMk = drawMk;

  /* ———————————— Меню: раскладка по окружности ———————————— */
  const menu = $('#menu'), burger = $('#burger'), ring = $('#menuRing');
  const items = $$('.menu-list li');
  function layoutMenu() {
    const R = ring.offsetWidth * 0.47;
    items.forEach((li, i) => { li.style.setProperty('--a', `${-90 + (360 / items.length) * i}deg`); li.style.setProperty('--ring', R.toFixed(1)); });
  }
  layoutMenu();
  addEventListener('resize', layoutMenu);
  let menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    $('#hdr').classList.remove('is-hidden');
    $('#rounds').classList.toggle('is-off', open);
    if (BS.lenis) open ? BS.lenis.stop() : BS.lenis.start();
    if (open) {
      if (anim) {
        drawMk($('.menu-circle'), { duration: 1.2 });
        gsap.fromTo($$('.menu-list a'), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)', stagger: 0.035 });
      }
      setTimeout(() => $('.menu-list a').focus({ preventScroll: true }), 60);
    } else burger.focus({ preventScroll: true });
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });
  BS.closeMenu = () => menuOpen && setMenu(false);

  /* ———————————— Якоря ———————————— */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id.length > 1 && document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const wasOpen = menuOpen;
    if (wasOpen) { menuOpen = false; menu.classList.remove('is-open'); menu.inert = true; burger.setAttribute('aria-expanded', 'false'); $('#rounds').classList.remove('is-off'); }
    const y = target.id === 'cypher' ? 0 : target;
    if (BS.lenis) { BS.lenis.start(); BS.lenis.scrollTo(y, { duration: wasOpen ? 1.2 : 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) }); }
    else (y === 0 ? scrollTo(0, 0) : target.scrollIntoView());
    if (target.id !== 'cypher') { target.setAttribute('tabindex', '-1'); setTimeout(() => target.focus({ preventScroll: true }), 900); }
  });

  /* ———————————— Счётчик раундов (без GSAP — просто текст) ———————————— */
  const rNum = $('.rounds-num'), rTitle = $('.rounds-title');
  let curRound = '01';
  function setRound(sec) {
    const n = sec.dataset.round, t = sec.dataset.title.toUpperCase();
    if (n === curRound) return;
    const dir = Number(n) > Number(curRound) ? 1 : -1;
    curRound = n;
    if (!anim) { rNum.textContent = n; rTitle.textContent = t; return; }
    gsap.to([rNum, rTitle], { yPercent: -100 * dir, duration: 0.18, ease: 'power2.in', onComplete: () => {
      rNum.textContent = n; rTitle.textContent = t;
      gsap.fromTo([rNum, rTitle], { yPercent: 100 * dir }, { yPercent: 0, duration: 0.42, ease: 'expo.out', stagger: 0.05 });
    } });
  }

  /* Шапка: прячется при скролле вниз, возвращается вверх */
  const hdr = $('#hdr');
  let lastY = 0;
  function onScrollY(y) {
    if (!menuOpen) {
      if (y > innerHeight * 0.6 && y > lastY + 2) hdr.classList.add('is-hidden');
      else if (y < lastY - 2 || y < 80) hdr.classList.remove('is-hidden');
    }
    hdr.classList.toggle('is-solid', y > 40);
    lastY = y;
  }

  if (!hasGsap) {
    // без GSAP: нативный скролл, раунды через IntersectionObserver
    addEventListener('scroll', () => onScrollY(scrollY), { passive: true });
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setRound(e.target)), { rootMargin: '-50% 0px -50% 0px' });
    $$('[data-round]').forEach((s) => io.observe(s));
    $$('[data-flip]').forEach((el) => (el.textContent = el.dataset.flip));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ———————————— Lenis ———————————— */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    lenis.on('scroll', (e) => onScrollY(e.scroll));
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    BS.lenis = lenis;
  } else addEventListener('scroll', () => onScrollY(scrollY), { passive: true });

  /* ———————————— Сплит заголовков на строки (своя функция) ———————————— */
  function splitLines(el) {
    if (el.dataset.split) return [];
    el.dataset.split = '1';
    const parts = [];
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3) n.textContent.split(/ +/).forEach((w) => w.trim() && parts.push(w.replace(/\n/g, '')));
      else if (n.nodeName === 'BR') parts.push('\n');
      else parts.push(n.outerHTML);
    });
    el.innerHTML = parts.map((p) => (p === '\n' ? '<br>' : `<span class="tw">${p}</span>`)).join(' ');
    const lines = [];
    let top = null, cur = [];
    el.childNodes.forEach((n) => {
      if (n.nodeName === 'BR') { if (cur.length) lines.push(cur); cur = []; top = null; return; }
      if (n.nodeType !== 1) return;
      const t = n.offsetTop;
      if (top !== null && Math.abs(t - top) > 4) { lines.push(cur); cur = []; }
      top = t; cur.push(n.innerHTML);
    });
    if (cur.length) lines.push(cur);
    el.innerHTML = lines.map((l) => `<span class="sline"><span>${l.join(' ')}</span></span>`).join('');
    return $$('.sline > span', el);
  }
  BS.splitLines = splitLines;

  /* ═══════════ ПИНЫ — создаём первыми, сверху вниз ═══════════ */

  /* ROUND 02 — FREEZE */
  const fzStage = $('#freezeStage');
  const fzImg = $('.freeze-img'), ghosts = $$('.freeze-ghost'), fzTc = $('#freezeTc');
  const fzWord = $('.freeze-word-in'), fzMark = $('.freeze-mark'), fzA = $('.freeze-line--a'), fzB = $('.freeze-line--b');
  if (anim) {
    const mob = isMob();
    if (mob) ghosts.forEach((g) => g.remove());
    gsap.set($$('path', fzMark), { strokeDasharray: 1, strokeDashoffset: 1 });
    const freezeTl = gsap.timeline({ paused: true })
      .set(fzImg, { x: 0, y: 0, filter: 'blur(0px)' }, 0)
      .set(ghosts, { opacity: 0 }, 0)
      .fromTo('.freeze-flash', { opacity: 0 }, { opacity: 1, duration: 0.04, ease: 'none' }, 0)
      .to('.freeze-flash', { opacity: 0, duration: 0.42, ease: 'power2.out' }, 0.1)
      .to(fzA, { opacity: 0, y: -20, duration: 0.3 }, 0.05)
      .fromTo(fzWord, { opacity: 0, yPercent: -260, scaleY: 1.2 }, { opacity: 1, yPercent: 0, scaleY: 1, duration: 0.48, ease: 'power4.in' }, 0.14)
      .to(fzWord, { scaleY: 0.9, scaleX: 1.04, duration: 0.07, ease: 'power1.out', transformOrigin: '50% 100%' }, 0.62)
      .to(fzWord, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, .45)' }, 0.69)
      .to($$('path', fzMark), { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut', stagger: 0.18 }, 0.7)
      .fromTo(fzB, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' }, 0.95);
    let frozen = false, lastStep = -1;
    const R = rng(99);
    const jit = Array.from({ length: 40 }, () => [R() - 0.5, R() - 0.5, R()]);
    ScrollTrigger.create({
      trigger: fzStage, start: 'top top', end: () => '+=' + innerHeight * (mob ? 0.5 : 1.2), pin: true, anticipatePin: 1,
      onUpdate(self) {
        const p = self.progress;
        fzTc.textContent = `00:00:${String(Math.floor(p * 59)).padStart(2, '0')}`;
        if (p >= 0.62) { if (!frozen) { frozen = true; freezeTl.timeScale(1).play(); } return; }
        if (frozen && p < 0.56) { frozen = false; freezeTl.timeScale(2.2).reverse(); }
        if (frozen) return;
        const step = Math.floor(p * 30);
        if (step === lastStep) return;
        lastStep = step;
        const [jx, jy, jb] = jit[step % jit.length];
        const amp = p < 0.04 ? 0 : 6 + p * 46;
        gsap.set(fzImg, { x: jx * amp * 2, y: jy * amp * 0.6, filter: `blur(${(p < 0.04 ? 0 : (1 + p * 7) * (0.4 + jb)).toFixed(1)}px)` });
        ghosts.forEach((g, i) => gsap.set(g, { opacity: Math.max(0, Math.min(0.32, (p - 0.12 - i * 0.07) * 1.6)), x: -jx * amp * (i + 1) * 1.3, y: jy * amp * 0.3 * (i + 1) }));
      },
    });
  } else {
    ghosts.forEach((g) => g.remove());
  }

  /* ROUND 04 — Путь: горизонтальный скролл на десктопе, свайп-слайдер на мобиле */
  const path = $('#path'), track = $('#pathTrack'), stages = $$('.stage', track), dots = $$('.path-dot', path), roadFill = $('#roadFill');
  const setDot = (i) => dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
  let pathMode = null;
  function setupPath() {
    const mode = anim && isDesk() ? 'pin' : 'swipe';
    if (mode === pathMode) return;
    pathMode = mode;
    if (mode === 'pin') {
      path.classList.remove('path--swipe');
      const hTween = gsap.to(track, {
        x: () => -(track.scrollWidth - innerWidth), ease: 'none',
        scrollTrigger: {
          trigger: '#pathPin', start: 'top top', end: () => '+=' + (track.scrollWidth - innerWidth), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (s) => gsap.set(roadFill, { scaleX: s.progress }),
        },
      });
      stages.forEach((st, i) => {
        ScrollTrigger.create({
          trigger: st, containerAnimation: hTween, start: 'left 70%', end: 'right 30%',
          onToggle: (s) => { $('.stage-photo', st).classList.toggle('is-color', s.isActive); if (s.isActive) setDot(i); },
        });
      });
    } else {
      path.classList.add('path--swipe');
      track.parentNode.insertBefore($('.path-intro', path), track);
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        const ph = $('.stage-photo', e.target);
        ph.classList.toggle('is-color', e.intersectionRatio > 0.6);
        if (e.intersectionRatio > 0.6) setDot(stages.indexOf(e.target));
      }), { root: track, threshold: [0, 0.6, 1] });
      stages.forEach((s) => io.observe(s));
      track.addEventListener('scroll', () => {
        const max = track.scrollWidth - track.clientWidth;
        roadFill.style.transform = `scaleX(${max > 0 ? track.scrollLeft / max : 0})`;
      }, { passive: true });
    }
  }
  setupPath();

  /* ROUND 10 — CAMP */
  const campFill = $('#campFill'), luggage = $('#luggage'), campBg = $('.camp-bg');
  if (anim) {
    gsap.timeline({
      scrollTrigger: { trigger: '#campStage', start: 'top top', end: () => '+=' + innerHeight * 0.8, pin: true, scrub: 0.7, anticipatePin: 1,
        onUpdate: (s) => campBg.classList.toggle('is-color', s.progress > 0.72) },
    })
      .fromTo(campFill, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 1 })
      .fromTo(luggage, { xPercent: 160, rotation: 22 }, { xPercent: 0, rotation: 4, ease: 'back.out(1.3)', duration: 0.55 }, 0.62)
      .to({}, { duration: 0.15 });
  } else {
    campBg.classList.add('is-color');
  }

  /* ═══════════ HERO ═══════════ */
  const heroRing = $('#heroRing'), ringText = $('#ringText'), heroImg = $('#heroImg');
  const cw = $$('.cw > span'), heroMark = $('.cypher-mark');
  if (anim) {
    // вращение кольца: база + разгон от скорости скролла (как виндмилл), плавно гаснет
    const st = { angle: 0, boost: 0 };
    const toBoost = gsap.quickTo(st, 'boost', { duration: 0.7, ease: 'power3.out' });
    let heroVisible = true;
    ScrollTrigger.create({ trigger: '#cypher', start: 'top bottom', end: 'bottom top', onToggle: (s) => (heroVisible = s.isActive) });
    gsap.ticker.add((time, dt) => {
      const v = lenis ? Math.abs(lenis.velocity) : 0;
      toBoost(Math.min(v * 3.2, 140));
      if (!heroVisible) return;
      st.angle = (st.angle + (9 + st.boost) * (dt / 1000)) % 360;
      ringText.style.transform = `rotate(${st.angle.toFixed(2)}deg)`;
    });
    // параллакс фото внутри кольца от мыши
    if (fine) {
      const qx = gsap.quickTo(heroImg, 'x', { duration: 0.9, ease: 'power3.out' });
      const qy = gsap.quickTo(heroImg, 'y', { duration: 0.9, ease: 'power3.out' });
      addEventListener('pointermove', (e) => {
        if (!heroVisible) return;
        qx(((e.clientX / innerWidth) - 0.5) * -26);
        qy(((e.clientY / innerHeight) - 0.5) * -22);
      }, { passive: true });
    }
    // уход hero: слово ONE и кольцо чуть разъезжаются
    gsap.to('.cypher-word', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '#cypher', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to(heroRing, { scale: 0.86, ease: 'none', scrollTrigger: { trigger: '#cypher', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.cypher-xray', { '--xr': '26.5vmin', ease: 'none', scrollTrigger: { trigger: '#cypher', start: 'top top', end: 'bottom top', scrub: true } });
  }

  function heroEnter(delay = 0) {
    if (!anim) return;
    gsap.fromTo(cw, { yPercent: 105 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay });
    gsap.fromTo(['.cypher-lead', '.cypher-cta', '.cypher-coords', '.cypher-scroll'], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, delay: delay + 0.25 });
    gsap.fromTo(ringText, { opacity: 0 }, { opacity: 1, duration: 1, delay: delay + 0.1 });
  }

  /* ———————————— PRELOADER (≤1.6 с, раз за сессию) ———————————— */
  const pre = $('#preloader');
  let seen = document.documentElement.classList.contains('intro-seen');
  if (anim && !seen) {
    try { sessionStorage.setItem('bsone-intro', '1'); } catch (e) {}
    lenis && lenis.stop();
    const r = heroRing.getBoundingClientRect();
    const pr = $('.preloader-ring');
    gsap.set(pr, { left: r.left + r.width / 2, top: r.top + r.height / 2, width: r.width, height: r.height, xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.42, translate: 'none' });
    gsap.set(cw, { yPercent: 105 });
    gsap.set(['.cypher-lead', '.cypher-cta', '.cypher-coords', '.cypher-scroll', ringText], { opacity: 0 });
    const word = $('.preloader-word');
    gsap.timeline({ onComplete: () => { pre.remove(); lenis && lenis.start(); } })
      .add(drawMk(pr, { duration: 0.72, stagger: 0.12, ease: 'power2.inOut' }), 0)
      .fromTo(word, { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 0.14, ease: 'power2.out' }, 0.62)
      .to(word, { opacity: 0, scale: 1.25, duration: 0.25, ease: 'power2.in' }, 0.98)
      .to(pr, { scale: 1, duration: 0.6, ease: 'power3.inOut' }, 0.9)
      .to(pre, { backgroundColor: 'rgba(10,10,11,0)', duration: 0.42, ease: 'power2.out' }, 1.18)
      .call(() => heroEnter(0), null, 1.12);
    // страховка: если rAF заторможен (фоновая вкладка) — всё равно открываем страницу
    setTimeout(() => { if (document.body.contains(pre)) { pre.remove(); lenis && lenis.start(); gsap.set([cw, '.cypher-lead', '.cypher-cta', '.cypher-coords', '.cypher-scroll', ringText], { clearProps: 'all' }); } }, 3200);
  } else {
    pre && pre.remove();
    if (anim) { gsap.set($$('path', heroMark), { strokeDasharray: 1, strokeDashoffset: 1 }); drawMk(heroMark, { duration: 0.9, stagger: 0.15 }); heroEnter(0.15); }
  }

  /* ═══════════ ROUND 03 — манифест и табло ═══════════ */
  const big = $('#manifestBig');
  big.innerHTML = big.textContent.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
  const words = $$('.w', big);
  if (anim) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#manifest', start: 'top bottom', end: 'center 40%', scrub: 0.6 } });
    tl.fromTo(words, { color: '#F2F1EC' }, { color: '#3A3A3E', duration: 0.5, immediateRender: false }, 0);
    words.forEach((w, i) => {
      tl.to(w, { color: '#E3241B', duration: 0.4, ease: 'none' }, 0.8 + i * 0.32);
      tl.to(w, { color: '#F2F1EC', duration: 0.6, ease: 'none' }, 0.8 + i * 0.32 + 0.45);
    });
  }

  // Табло с механическим перелистыванием каждой цифры
  const POOL = { d: '0123456789', l: 'АБВГДЕЖЗИКЛМНОПРСТУ', s: '+–-=/×' };
  $$('[data-flip]').forEach((el) => {
    const chars = [...el.dataset.flip];
    el.textContent = '';
    chars.forEach((ch, i) => {
      const pool = /\d/.test(ch) ? POOL.d : /[А-ЯA-Z]/.test(ch) ? POOL.l : POOL.s;
      const cell = document.createElement('span');
      cell.className = 'flap' + (/[\d]/.test(ch) || /[А-ЯA-Z]/.test(ch) ? '' : ' flap--narrow');
      const strip = document.createElement('span');
      strip.className = 'flap-strip';
      const n = anim ? 7 + i * 2 : 0;
      const r = rng(ch.charCodeAt(0) * 31 + i);
      let html = '';
      for (let k = 0; k < n; k++) html += `<span>${pool[Math.floor(r() * pool.length)]}</span>`;
      strip.innerHTML = html + `<span>${ch}</span>`;
      cell.appendChild(strip);
      el.appendChild(cell);
      if (anim) {
        gsap.fromTo(strip, { yPercent: 0 }, {
          yPercent: () => -(100 * n) / (n + 1), duration: 0.9 + i * 0.22, ease: `steps(${n})`,
          scrollTrigger: { trigger: '.boards', start: 'top 82%', toggleActions: 'play none none none' },
          onComplete: () => gsap.fromTo(cell, { y: -3 }, { y: 0, duration: 0.3, ease: 'bounce.out' }),
        });
      }
    });
  });

  /* ═══════════ Остальные секции ═══════════ */
  if (anim) {
    // заголовки: построчно из маски снизу
    $$('.reveal-lines').forEach((h) => {
      const lines = splitLines(h);
      gsap.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: h, start: 'top 86%' } });
    });
    // мягкие появления текста
    $$('.kicker, .lead, .manifest-side p, .stage-text, .thesis, .champion-text p:not(.lead):not(.kicker), .step, .address-sub, .contact > *, .more, .spot-note, .sampler-cap').forEach((el) => {
      if (el.closest('.path-track') && isDesk()) return;
      gsap.fromTo(el, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });
    // фото: раскрытие снизу через clip-path + лёгкий scale
    $$('.coach-img, .map, .camp-snaps .snap, .contact-door').forEach((el) => {
      const img = $('img', el);
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%' } })
        .fromTo(img, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.08 }, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.3, ease: 'expo.out' });
    });
    // тренер: маркер вокруг лица
    const cm = $('.coach-mark');
    gsap.set($$('path', cm), { strokeDasharray: 1, strokeDashoffset: 1 });
    ScrollTrigger.create({ trigger: '.coach-photo', start: 'top 55%', once: true, onEnter: () => drawMk(cm, { duration: 1.1 }) });

    // контактный лист: маркер обводит лучшие кадры по очереди
    const marks = $$('.frame-mark');
    gsap.set(marks.flatMap((m) => $$('path', m)), { strokeDasharray: 1, strokeDashoffset: 1 });
    const mt = gsap.timeline({ scrollTrigger: { trigger: '#sheet', start: 'top 65%', end: 'bottom 55%', scrub: 0.5 } });
    marks.forEach((m, i) => mt.to($$('path', m), { strokeDashoffset: 0, duration: 1, ease: 'power1.inOut', stagger: 0.35 }, i * 1.1));
    $$('.strip').forEach((s, i) => gsap.fromTo(s, { opacity: 0, x: i % 2 ? 60 : -60 }, { opacity: 1, x: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 92%' } }));

    // турнирная сетка: линии слева направо по скроллу
    const lines = $$('.br-lines path');
    const bt = gsap.timeline({ scrollTrigger: { trigger: '#bracket', start: 'top 78%', end: 'bottom 50%', scrub: 0.6 } });
    bt.fromTo('.br-slot:not(.br-slot--2):not(.br-slot--3)', { opacity: 0, x: -14 }, { opacity: 1, x: 0, stagger: 0.05, duration: 0.3 }, 0)
      .to(lines.slice(0, 4), { strokeDashoffset: 0, duration: 0.6, stagger: 0.08, ease: 'none' }, 0.3)
      .fromTo('.br-slot--2', { opacity: 0 }, { opacity: 1, stagger: 0.06, duration: 0.2 }, 0.75)
      .to(lines.slice(4, 6), { strokeDashoffset: 0, duration: 0.6, stagger: 0.1, ease: 'none' }, 1.0)
      .fromTo('.br-slot--3', { opacity: 0 }, { opacity: 1, stagger: 0.08, duration: 0.2 }, 1.5)
      .to(lines[6], { strokeDashoffset: 0, duration: 0.5, ease: 'none' }, 1.7)
      .fromTo('.br-final', { opacity: 0, scale: 0.6, transformOrigin: '710px 230px' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, 2.15);
    gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });

    // финал: дуга между шагами и круг вокруг адреса
    gsap.fromTo('#stepsArc', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 80%', end: 'bottom 60%', scrub: 0.6 } });
    const am = $('.address-mark');
    gsap.set($$('path', am), { strokeDasharray: 1, strokeDashoffset: 1 });
    ScrollTrigger.create({ trigger: '.address', start: 'top 70%', once: true, onEnter: () => drawMk(am, { duration: 1.6, stagger: 0.35, ease: 'power3.inOut' }) });
    gsap.fromTo('.address-line', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.address', start: 'top 78%' } });

    // футер: слово ONE поднимается из-за края
    gsap.fromTo('.ftr-word span', { yPercent: 40 }, { yPercent: 0, ease: 'none', stagger: 0.05, scrollTrigger: { trigger: '.ftr', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  // голоса: дублируем бирки для бесконечной ленты
  if (!reduced) $$('.voices-col').forEach((ul) => [...ul.children].forEach((li) => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); ul.appendChild(c); }));

  /* ═══════════ Раунды и прогресс ═══════════ */
  $$('[data-round]').forEach((sec) => ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && setRound(sec) }));
  const fill = $('.rounds-fill');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => (fill.style.strokeDashoffset = (1 - s.progress).toFixed(4)) });

  /* ═══════════ Курсор ═══════════ */
  if (fine && anim) {
    body.classList.add('has-cursor');
    const cur = $('#cursor'), label = $('.cursor-label', cur);
    const qx = gsap.quickTo(cur, 'x', { duration: 0.32, ease: 'power3.out' });
    const qy = gsap.quickTo(cur, 'y', { duration: 0.32, ease: 'power3.out' });
    gsap.set(cur, { x: innerWidth / 2, y: innerHeight / 2 });
    $$('.stage-photo, .reel-item, .snap, .camp-bg, .contact-door').forEach((el) => (el.dataset.cursor = 'view'));
    addEventListener('pointermove', (e) => { qx(e.clientX); qy(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor]');
      const kind = t ? t.dataset.cursor : '';
      cur.classList.toggle('is-big', !!kind);
      label.textContent = kind === 'pad' ? 'БАХ' : kind === 'view' ? 'СМОТРЕТЬ' : '';
    });
    document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => cur.classList.remove('is-hidden'));
  }

  /* пересчёт после загрузки картинок и шрифтов */
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  // смена режима «Пути» (пин ↔ свайп) при пересечении 1024 px — проще и надёжнее пересобрать страницу
  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if ((anim && isDesk() ? 'pin' : 'swipe') !== pathMode) location.reload(); }, 400);
  });
})();
