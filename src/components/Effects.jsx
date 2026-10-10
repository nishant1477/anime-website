import React, { useEffect, useRef, useState } from 'react';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ---------- 3D tilt + glare that follows the mouse ----------
   Writes CSS variables (--rx --ry --mx --my --tx --ty) straight onto the element,
   so moving the mouse never re-renders React. Mouse only; touch and reduced motion skip it. */
export function useTilt(max = 9) {
  const frame = useRef(0);
  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const el = event.currentTarget;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      el.style.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--tx', ((x - 0.5) * 2).toFixed(3));
      el.style.setProperty('--ty', ((y - 0.5) * 2).toFixed(3));
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    });
  };
  const onPointerLeave = (event) => {
    cancelAnimationFrame(frame.current);
    const el = event.currentTarget;
    ['--rx', '--ry'].forEach((name) => el.style.setProperty(name, '0deg'));
    ['--tx', '--ty'].forEach((name) => el.style.setProperty(name, '0'));
  };
  return { onPointerMove, onPointerLeave };
}

/* ---------- reveal on scroll ---------- */
export function useReveal(ready = true) {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => prefersReducedMotion());
  useEffect(() => {
    const el = ref.current;
    if (shown || !ready || !el) return undefined;
    // Reveal once the top edge is inside the viewport — or already above it, so a fast scroll,
    // anchor jump or restored scroll position can never leave a section invisible.
    let raf = 0;
    const check = () => {
      raf = 0;
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) setShown(true);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [shown, ready]);
  return [ref, shown];
}

/* ---------- sparkle burst when something gets saved ---------- */
export function SaveBurst({ k }) {
  if (!k) return null;
  return (
    <span className="burst" key={k} aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--a': `${i * 36}deg` }} />)}
    </span>
  );
}

/* ---------- falling sakura petals (canvas) ----------
   Pauses when offscreen or when the tab is hidden; skipped entirely for reduced motion. */
export function Petals({ count = 24 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const palette = ['255,140,185', '255,105,160', '255,196,220', '190,160,255'];
    let w = 0; let h = 0; let raf = 0; let onscreen = true; let petals = [];

    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -24,
      s: 5 + Math.random() * 8,
      vy: 0.35 + Math.random() * 0.75,
      drift: 0.1 + Math.random() * 0.45,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.035,
      phase: Math.random() * Math.PI * 2,
      freq: 0.008 + Math.random() * 0.02,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: 0.28 + Math.random() * 0.5,
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = w < 600 ? Math.round(count * 0.6) : count;
      petals = Array.from({ length: target }, () => spawn(true));
    };

    const draw = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.55 + Math.abs(Math.sin(p.phase * 1.6)) * 0.45); // flutter
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, -p.s);
      ctx.bezierCurveTo(p.s * 0.95, -p.s * 0.55, p.s * 0.7, p.s * 0.75, 0, p.s);
      ctx.bezierCurveTo(-p.s * 0.7, p.s * 0.75, -p.s * 0.95, -p.s * 0.55, 0, -p.s);
      ctx.fill();
      ctx.restore();
    };

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < petals.length; i += 1) {
        const p = petals[i];
        p.phase += p.freq * 6;
        p.x += Math.sin(p.phase) * 0.6 + p.drift;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h + 24 || p.x > w + 24) petals[i] = spawn(false);
        else draw(p);
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && onscreen && !document.hidden) raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    resize();
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => { onscreen = entry.isIntersecting; if (onscreen) start(); else stop(); })
      : null;
    io?.observe(canvas);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    start();
    return () => {
      stop();
      resizeObserver?.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [count]);

  return <canvas ref={canvasRef} className="petals" aria-hidden="true" />;
}
