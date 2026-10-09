/* ROUND 08 — трофейная стена. Стикеры «шлёпаются» со стаггером, на десктопе их можно таскать
   (pointer events, инерция, возврат наклона). На тач-экранах — без drag, лёгкое покачивание от скролла. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const BS = window.BS || {};
  const wall = $('#wall');
  if (!wall || !window.gsap || BS.reduced) return;
  const stickers = $$('.sticker', wall);
  const desk = matchMedia('(pointer: fine)').matches && innerWidth >= 768;
  const base = stickers.map((s) => parseFloat(getComputedStyle(s).getPropertyValue('--r')) || 0);

  stickers.forEach((s, i) => gsap.set(s, { rotation: base[i] }));
  gsap.fromTo(stickers, { scale: 1.7, opacity: 0, rotation: (i) => base[i] + (i % 2 ? 24 : -24) },
    { scale: 1, opacity: 1, rotation: (i) => base[i], duration: 0.55, ease: 'back.out(2)', stagger: 0.09,
      scrollTrigger: { trigger: wall, start: 'top 70%' } });

  if (!desk) {
    // мобильные: лёгкое покачивание при скролле
    stickers.forEach((s, i) => gsap.to(s, { rotation: base[i] + (i % 2 ? 4 : -4), ease: 'sine.inOut',
      scrollTrigger: { trigger: wall, start: 'top bottom', end: 'bottom top', scrub: 1.2 } }));
    return;
  }

  let z = 10;
  stickers.forEach((st, i) => {
    let drag = false, px = 0, py = 0, lx = 0, ly = 0, lt = 0, vx = 0, vy = 0;
    const qr = gsap.quickTo(st, 'rotation', { duration: 0.35, ease: 'power3.out' });
    st.addEventListener('dragstart', (e) => e.preventDefault());
    st.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      drag = true; st.setPointerCapture(e.pointerId); st.classList.add('is-drag');
      st.style.zIndex = ++z;
      gsap.killTweensOf(st, 'x,y');
      px = e.clientX - gsap.getProperty(st, 'x'); py = e.clientY - gsap.getProperty(st, 'y');
      lx = e.clientX; ly = e.clientY; lt = performance.now(); vx = vy = 0;
      gsap.to(st, { scale: 1.07, duration: 0.25, ease: 'power2.out' });
    });
    st.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const now = performance.now(), dt = Math.max(8, now - lt);
      vx = vx * 0.6 + ((e.clientX - lx) / dt) * 1000 * 0.4;
      vy = vy * 0.6 + ((e.clientY - ly) / dt) * 1000 * 0.4;
      lx = e.clientX; ly = e.clientY; lt = now;
      gsap.set(st, { x: e.clientX - px, y: e.clientY - py });
      qr(base[i] + Math.max(-16, Math.min(16, vx * 0.012)));
    });
    const end = () => {
      if (!drag) return;
      drag = false; st.classList.remove('is-drag');
      // инерция с ограничением рамкой стены
      const w = wall.getBoundingClientRect(), r = st.getBoundingClientRect();
      const x = gsap.getProperty(st, 'x'), y = gsap.getProperty(st, 'y');
      let tx = x + vx * 0.2, ty = y + vy * 0.2;
      const minX = x - (r.left - w.left) + 6, maxX = x + (w.right - r.right) - 6;
      const minY = y - (r.top - w.top) + 6, maxY = y + (w.bottom - r.bottom) - 6;
      tx = Math.max(minX, Math.min(maxX, tx)); ty = Math.max(minY, Math.min(maxY, ty));
      gsap.to(st, { x: tx, y: ty, duration: 0.8, ease: 'power3.out' });
      gsap.to(st, { scale: 1, duration: 0.5, ease: 'back.out(2)' });
      gsap.to(st, { rotation: base[i] + gsap.utils.random(-3, 3), duration: 1.1, ease: 'elastic.out(1, .45)', overwrite: 'auto' });
    };
    st.addEventListener('pointerup', end);
    st.addEventListener('pointercancel', end);
  });
})();
