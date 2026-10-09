/* ROUND 07 — контактный лист и лайтбокс.
   Кадр вырастает из миниатюры (FLIP: замер rect миниатюры → анимация к центру с подрезкой как у object-fit),
   лента миниатюр, стрелки, свайп, колесо, Esc, счётчик «07 / 24». */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const BS = window.BS || {};
  const frames = $$('.frame');
  const lb = $('#lb');
  if (!frames.length || !lb) return;
  const stage = $('#lbStage'), big = $('#lbImg'), count = $('#lbCount'), cap = $('#lbCap'), strip = $('#lbStrip');
  const hasGsap = !!window.gsap;
  const anim = hasGsap && !BS.reduced;
  const total = frames.length;
  const data = frames.map((f) => {
    const t = $('img', f);
    return { full: f.dataset.full, w: +f.dataset.w, h: +f.dataset.h, thumb: t.getAttribute('src'), alt: t.alt, el: f };
  });

  // лента миниатюр
  strip.innerHTML = data.map((d, i) => `<button type="button" aria-label="Кадр ${String(i + 1).padStart(2, '0')}"><img src="${d.thumb}" alt="" loading="lazy" decoding="async"></button>`).join('');
  const sBtns = $$('button', strip);
  sBtns.forEach((b, i) => b.addEventListener('click', () => go(i, i > cur ? 1 : -1)));

  let cur = 0, open = false, lastFocus = null, busy = false;

  function fit(d) {
    const cs = getComputedStyle(stage);
    const aw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ah = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.min(aw / d.w, ah / d.h, 1.6);
    return [Math.round(d.w * s), Math.round(d.h * s)];
  }
  function setImg(i) {
    const d = data[i];
    const [w, h] = fit(d);
    big.style.width = w + 'px'; big.style.height = h + 'px';
    big.alt = d.alt;
    big.src = d.thumb;
    const hi = new Image();
    hi.onload = () => { if (cur === i) big.src = d.full; };
    hi.src = d.full;
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    cap.textContent = d.alt;
    sBtns.forEach((b, k) => b.classList.toggle('is-on', k === i));
    sBtns[i].scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  // FLIP: из прямоугольника миниатюры (с её подрезкой 3:2) в полный кадр
  function flipFrom(thumbImg, reverse, done) {
    const a = thumbImg.getBoundingClientRect();
    const b = big.getBoundingClientRect();
    const s = Math.max(a.width / b.width, a.height / b.height);
    const vw = a.width / s, vh = a.height / s; // видимая часть в координатах большого кадра
    const ix = (b.width - vw) / 2, iy = (b.height - vh) / 2;
    const from = { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2), scale: s, clipPath: `inset(${iy}px ${ix}px ${iy}px ${ix}px)` };
    const to = { x: 0, y: 0, scale: 1, clipPath: 'inset(0px 0px 0px 0px)' };
    gsap.set(big, { transformOrigin: '50% 50%' });
    if (!reverse) gsap.fromTo(big, from, { ...to, duration: 0.75, ease: 'expo.out', onComplete: done });
    else gsap.fromTo(big, to, { ...from, duration: 0.55, ease: 'expo.inOut', onComplete: done });
  }

  function openAt(i) {
    if (open) return;
    open = true; cur = i; lastFocus = document.activeElement;
    lb.hidden = false;
    BS.lenis && BS.lenis.stop();
    document.documentElement.style.overflow = 'hidden';
    $('#rounds')?.classList.add('is-off');
    setImg(i);
    if (anim) {
      gsap.fromTo('.lb-bg', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
      gsap.fromTo('.lb-btn, .lb-count, .lb-cap, .lb-strip', { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.25 });
      flipFrom($('img', data[i].el), false);
    }
    $('#lbClose').focus({ preventScroll: true });
  }
  function close() {
    if (!open) return;
    const finish = () => {
      lb.hidden = true; open = false;
      gsap && gsap.set(big, { clearProps: 'transform,clipPath,opacity' });
      document.documentElement.style.overflow = '';
      BS.lenis && BS.lenis.start();
      $('#rounds')?.classList.remove('is-off');
      (data[cur].el || lastFocus)?.focus({ preventScroll: true });
    };
    if (!anim) return finish();
    const t = $('img', data[cur].el), r = t.getBoundingClientRect();
    gsap.to('.lb-bg, .lb-btn, .lb-count, .lb-cap, .lb-strip', { opacity: 0, duration: 0.45, ease: 'power2.in' });
    if (r.bottom > 0 && r.top < innerHeight) flipFrom(t, true, finish);
    else gsap.to(big, { opacity: 0, scale: 0.92, duration: 0.35, onComplete: finish });
  }
  function go(i, dir) {
    if (busy) return;
    i = (i + total) % total;
    if (i === cur) return;
    cur = i;
    if (!anim) return setImg(i);
    busy = true;
    gsap.to(big, { x: -60 * dir, opacity: 0, duration: 0.18, ease: 'power2.in', onComplete: () => {
      setImg(i);
      gsap.fromTo(big, { x: 60 * dir, opacity: 0, scale: 1, clipPath: 'inset(0px 0px 0px 0px)' }, { x: 0, opacity: 1, duration: 0.45, ease: 'expo.out', onComplete: () => (busy = false) });
    } });
  }
  const next = () => go(cur + 1, 1), prev = () => go(cur - 1, -1);

  frames.forEach((f, i) => f.addEventListener('click', () => openAt(i)));
  $('#lbClose').addEventListener('click', close);
  $('#lbNext').addEventListener('click', next);
  $('#lbPrev').addEventListener('click', prev);
  $('.lb-bg').addEventListener('click', close);
  stage.addEventListener('click', (e) => { if (e.target === stage) close(); });

  addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'Tab') { // фокус не выходит из диалога
      const f = $$('button', lb).filter((b) => b.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // колесо
  let wheelT = 0;
  lb.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - wheelT < 420) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 8) return;
    wheelT = now; d > 0 ? next() : prev();
  }, { passive: false });
  // свайп
  let sx = null, sy = 0;
  stage.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? next() : prev();
  });
  big.addEventListener('dragstart', (e) => e.preventDefault());
  addEventListener('resize', () => { if (open) { const [w, h] = fit(data[cur]); big.style.width = w + 'px'; big.style.height = h + 'px'; } });
})();
