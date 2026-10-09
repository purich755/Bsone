/* ROUND 05 — Сэмплер MPC: восемь пэдов, синтез ударных на WebAudio (без файлов), дисплей с «печатью».
   Звук по умолчанию выключен. Первое нажатие пэда разблокирует AudioContext. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const BS = window.BS || {};
  const mpc = $('#mpc');
  if (!mpc) return;

  const PADS = [
    { name: 'TOPROCK', img: 'pad-toprock', snd: 'hat', alt: 'Топрок: ученица танцует стоя в свете прожекторов',
      desc: 'Танец стоя: с него начинается каждый выход. Шаги, ритм и характер — ещё до того, как руки коснулись пола.' },
    { name: 'FOOTWORK', img: 'pad-footwork', snd: 'snare', alt: 'Футворк: мальчик низко у пола переставляет ноги вокруг себя',
      desc: 'Работа ногами в партере: быстрые переступания вокруг себя с опорой на руки. Здесь видно, кто слышит музыку.' },
    { name: 'FREEZE', img: 'pad-freeze', snd: 'clap', alt: 'Фриз: девочка замерла на одной руке, ноги в воздухе',
      desc: 'Стоп-кадр: танцор замирает в сложной позе. Нужны сила, баланс и умение остановиться точно в бит.' },
    { name: 'WINDMILL', img: 'pad-windmill', snd: 'kick', alt: 'Силовое вращение на сцене: танцор на плече, ноги разведены',
      desc: '«Мельница»: вращение на спине и плечах с разведёнными ногами. Классика силовых элементов.' },
    { name: 'FLARE', img: 'pad-flare', snd: 'tomLow', alt: 'Танцор на руках, ноги широко разведены в махе',
      desc: 'Махи ногами по кругу с опорой на руки — как у гимнастов на коне, только на полу.' },
    { name: 'HEADSPIN', img: 'pad-headspin', snd: 'tomHigh', alt: 'Ученица стоит на голове на сцене, ноги разведены в стороны',
      desc: 'Вращение на голове. До него доходят постепенно: сначала стойки, сила шеи и плеч, страховка.' },
    { name: 'TWIST', img: 'pad-twist', snd: 'scratch', alt: 'Танцор переворачивается в воздухе на одной руке',
      desc: 'Скрутки и переходы: как связать один элемент с другим и не потерять темп. Из них рождается связка.' },
    { name: 'BATTLE', img: 'pad-battle', snd: 'battle', alt: 'Баттл: ученик в кругу зрителей на полу',
      desc: 'Баттл: двое по очереди выходят в круг и отвечают друг другу танцем. Судьи смотрят на технику, музыку и характер.' },
  ];

  /* ———————————— Звук ———————————— */
  let ctx = null, out = null, noise = null, soundOn = false;
  function ensureCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC({ latencyHint: 'interactive' });
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      out = ctx.createGain(); out.gain.value = 0.85;
      out.connect(comp).connect(ctx.destination);
      const len = ctx.sampleRate * 1.2;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const env = (g, t, peak, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); };
  function noiseSrc(t, dur) { const s = ctx.createBufferSource(); s.buffer = noise; s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); return s; }
  function tone(t, type, f0, f1, dur, peak, dest = out) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    env(g, t, peak, dur); o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function filtered(t, type, freq, q, dur, peak) {
    const s = noiseSrc(t, dur), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = type; f.frequency.value = freq; f.Q.value = q; env(g, t, peak, dur);
    s.connect(f).connect(g).connect(out); return f;
  }
  const SND = {
    kick(t) { tone(t, 'sine', 165, 42, 0.5, 1); filtered(t, 'highpass', 3000, 0.7, 0.02, 0.25); },
    snare(t) { filtered(t, 'bandpass', 1900, 0.8, 0.2, 0.9); tone(t, 'triangle', 220, 160, 0.12, 0.45); },
    hat(t) { filtered(t, 'highpass', 7500, 0.6, 0.055, 0.5); },
    clap(t) { [0, 0.011, 0.023].forEach((d) => filtered(t + d, 'bandpass', 1250, 1.3, 0.02, 0.8)); filtered(t + 0.03, 'bandpass', 1200, 1.1, 0.2, 0.6); },
    tomLow(t) { tone(t, 'sine', 140, 82, 0.38, 0.95); filtered(t, 'bandpass', 600, 1, 0.04, 0.2); },
    tomHigh(t) { tone(t, 'sine', 260, 150, 0.3, 0.85); filtered(t, 'highpass', 5000, 0.7, 0.18, 0.12); },
    scratch(t) {
      const dur = 0.32, f = filtered(t, 'bandpass', 900, 5, dur, 0.9);
      f.frequency.setValueAtTime(500, t);
      f.frequency.exponentialRampToValueAtTime(3200, t + 0.08);
      f.frequency.exponentialRampToValueAtTime(700, t + 0.17);
      f.frequency.exponentialRampToValueAtTime(2600, t + 0.26);
      tone(t, 'sawtooth', 180, 420, 0.09, 0.12); tone(t + 0.12, 'sawtooth', 420, 160, 0.12, 0.1);
    },
    battle(t) { SND.kick(t); SND.snare(t + 0.005); filtered(t, 'highpass', 6000, 0.6, 0.3, 0.25); },
  };

  /* ———————————— Тумблер ———————————— */
  const toggle = $('#soundToggle'), toggleLabel = $('.mpc-sound-label', toggle), toast = $('#soundToast');
  toggle.addEventListener('click', () => {
    soundOn = !soundOn;
    toggle.setAttribute('aria-pressed', String(soundOn));
    toggleLabel.textContent = soundOn ? 'Звук вкл' : 'Звук выкл';
    toggle.classList.remove('is-nudge');
    if (soundOn) { ensureCtx(); ctx && SND.hat(ctx.currentTime + 0.01); }
  });
  let toastShown = false, toastT;
  function nudge() {
    if (toastShown || soundOn) return;
    toastShown = true;
    toggle.classList.add('is-nudge');
    toast.textContent = 'Звук выключен — включи тумблер на сэмплере';
    toast.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('is-on'), 2600);
  }

  /* ———————————— Дисплей с эффектом печати ———————————— */
  const img = $('#screenImg'), title = $('#screenTitle'), desc = $('#screenDesc'), padNo = $('#screenPad'), screen = $('.screen'), live = $('#screenLive'), led = $('#mpcLed');
  let typeT, hotT;
  const cache = {};
  const preload = () => PADS.forEach((p) => { if (!cache[p.img]) { cache[p.img] = new Image(); cache[p.img].src = `assets/img/${p.img}.webp`; } });
  function typeInto(el, text, speed, done) {
    let i = 0;
    el.textContent = '';
    el.classList.add('screen-caret');
    const step = () => {
      i = Math.min(text.length, i + Math.max(1, Math.round(text.length / 60)));
      el.textContent = text.slice(0, i);
      if (i < text.length) typeT = setTimeout(step, speed);
      else { el.classList.remove('screen-caret'); done && done(); }
    };
    step();
  }
  let current = -1;
  function show(i) {
    const p = PADS[i];
    padNo.textContent = `PAD ${String(i + 1).padStart(2, '0')} / 08`;
    screen.classList.add('is-hot');
    clearTimeout(hotT); hotT = setTimeout(() => screen.classList.remove('is-hot'), 900);
    if (current === i) return;
    current = i;
    clearTimeout(typeT);
    title.classList.remove('screen-caret'); desc.classList.remove('screen-caret');
    img.src = `assets/img/${p.img}.webp`;
    img.alt = p.alt;
    live.textContent = `${p.name}. ${p.desc}`;
    desc.textContent = '';
    typeInto(title, p.name, 28, () => typeInto(desc, p.desc, 14));
  }

  /* ———————————— Пэды ———————————— */
  const pads = $$('.pad', mpc);
  pads.forEach((pad) => (pad.dataset.cursor = 'pad'));
  function hit(i, pad) {
    if (ensureCtx() && soundOn) SND[PADS[i].snd](ctx.currentTime + 0.001);
    else nudge();
    preload();
    pads.forEach((p) => p.classList.toggle('is-active', p === pad));
    if (window.gsap) gsap.fromTo(pad, { '--glow': 1 }, { '--glow': 0, duration: 0.7, ease: 'power2.out', overwrite: true });
    led.classList.add('is-on'); setTimeout(() => led.classList.remove('is-on'), 90);
    show(i);
  }
  const down = (pad) => pad.classList.add('is-down');
  const up = (pad) => pad.classList.remove('is-down');
  pads.forEach((pad, i) => {
    pad.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; down(pad); hit(i, pad); });
    pad.addEventListener('pointerup', () => up(pad));
    pad.addEventListener('pointerleave', () => up(pad));
    pad.addEventListener('pointercancel', () => up(pad));
    // клавиатура (Enter/Space) даёт click с detail === 0
    pad.addEventListener('click', (e) => { if (e.detail === 0) { down(pad); hit(i, pad); setTimeout(() => up(pad), 110); } });
  });

  // клавиши 1–8, пока сэмплер в зоне видимости
  let inView = false;
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) preload(); }, { threshold: 0.25 }).observe(mpc);
  addEventListener('keydown', (e) => {
    if (!inView || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/input|textarea|select/i.test(document.activeElement?.tagName || '')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 8) { const pad = pads[n - 1]; down(pad); hit(n - 1, pad); setTimeout(() => up(pad), 110); }
  });
})();
