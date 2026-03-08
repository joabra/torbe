'use client';
import { useRef, useEffect } from 'react';

export type CharacterState = 'idle' | 'watching' | 'peeking' | 'happy' | 'sad';

interface Props {
  state: CharacterState;
  emailValue?: string;
  onCardShake?: () => void;
}

export function JanCharacter({ state, emailValue, onCardShake }: Props) {
  const characterRef = useRef<HTMLDivElement>(null);
  const irisLRef = useRef<SVGCircleElement>(null);
  const irisRRef = useRef<SVGCircleElement>(null);
  const pupilLRef = useRef<SVGCircleElement>(null);
  const pupilRRef = useRef<SVGCircleElement>(null);
  const mouthHappyRef = useRef<SVGPathElement>(null);
  const teethHappyRef = useRef<SVGPathElement>(null);
  const mouthSadRef = useRef<SVGPathElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);

  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);
  const stateRef = useRef(state);
  const tiltRAFRef = useRef<number | null>(null);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // RAF eye tracking loop — runs once on mount
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseXRef.current = e.clientX;
      mouseYRef.current = e.clientY;
    };
    document.addEventListener('mousemove', handleMouseMove);

    const EL = { ix: 0, iy: 0, px: 0, py: 1 };
    const ER = { ix: 0, iy: 0, px: 0, py: 1 };

    let rafId: number;
    function updateEyes() {
      const s = stateRef.current;
      if (s !== 'happy' && s !== 'sad') {
        const el = irisLRef.current;
        const er = irisRRef.current;
        const pl = pupilLRef.current;
        const pr = pupilRRef.current;
        const character = characterRef.current;
        if (el && er && pl && pr && character) {
          const rect = character.getBoundingClientRect();
          const scaleX = rect.width / 512;
          const scaleY = rect.height / 512;
          const eyeCX = rect.left + 275 * scaleX;
          const eyeCY = rect.top + 216 * scaleY;

          const dx = mouseXRef.current - eyeCX;
          const dy = mouseYRef.current - eyeCY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const factor = Math.min(1, dist / 250);

          const iox = (dx / dist) * 8 * factor;
          const ioy = (dy / dist) * 8 * factor * 0.6;
          const pox = (dx / dist) * 10 * factor;
          const poy = (dy / dist) * 10 * factor * 0.6;

          el.setAttribute('cx', String(EL.ix + iox));
          el.setAttribute('cy', String(EL.iy + ioy));
          pl.setAttribute('cx', String(EL.px + pox));
          pl.setAttribute('cy', String(EL.py + poy));
          er.setAttribute('cx', String(ER.ix + iox));
          er.setAttribute('cy', String(ER.iy + ioy));
          pr.setAttribute('cx', String(ER.px + pox));
          pr.setAttribute('cy', String(ER.py + poy));
        }
      }
      rafId = requestAnimationFrame(updateEyes);
    }
    rafId = requestAnimationFrame(updateEyes);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Track cursor to email field when watching
  useEffect(() => {
    if (state !== 'watching') return;
    const emailInput = document.getElementById('email') as HTMLInputElement | null;
    if (!emailInput) return;
    const rect = emailInput.getBoundingClientRect();
    const textWidth = (emailValue?.length ?? 0) * 8;
    mouseXRef.current = rect.left + Math.min(textWidth + 16, rect.width - 10);
    mouseYRef.current = rect.top + rect.height / 2;
  }, [state, emailValue]);

  // Handle character state changes imperatively
  useEffect(() => {
    const character = characterRef.current;
    if (!character) return;

    // Cancel tilt tracking
    if (tiltRAFRef.current) {
      cancelAnimationFrame(tiltRAFRef.current);
      tiltRAFRef.current = null;
    }
    character.style.transform = '';

    // Mouth transitions
    const opacity = (el: SVGPathElement | null, v: number) => {
      if (el) el.style.opacity = String(v);
    };
    opacity(mouthHappyRef.current, 0);
    opacity(teethHappyRef.current, 0);
    opacity(mouthSadRef.current, 0);

    if (state === 'watching') {
      function tick() {
        if (stateRef.current !== 'watching') return;
        const rect = character!.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const dx = mouseXRef.current - cx;
        const rotateY = Math.max(-6, Math.min(6, dx * 0.02));
        const translateX = Math.max(-4, Math.min(4, dx * 0.008));
        character!.style.transform = `translateY(-8px) scale(1.05) rotate(${-2 + rotateY * 0.3}deg) translateX(${translateX}px)`;
        tiltRAFRef.current = requestAnimationFrame(tick);
      }
      tiltRAFRef.current = requestAnimationFrame(tick);

    } else if (state === 'happy') {
      opacity(mouthHappyRef.current, 1);
      opacity(teethHappyRef.current, 1);
      // Spawn confetti
      const container = confettiRef.current;
      if (container) {
        const colors = ['#c9a96e','#e8806a','#4a90d9','#15803d','#f4b89a','#b05a3a','#fbbf24','#e09070'];
        container.innerHTML = '';
        for (let i = 0; i < 60; i++) {
          const piece = document.createElement('div');
          piece.className = 'jan-confetti-piece';
          piece.style.left = Math.random() * 100 + '%';
          piece.style.background = colors[Math.floor(Math.random() * colors.length)];
          piece.style.width = (Math.random() * 8 + 5) + 'px';
          piece.style.height = (Math.random() * 8 + 5) + 'px';
          piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
          piece.style.animationDelay = (Math.random() * 1.2) + 's';
          piece.style.animationDuration = (Math.random() * 1.5 + 2) + 's';
          container.appendChild(piece);
        }
        setTimeout(() => { container.innerHTML = ''; }, 4000);
      }

    } else if (state === 'sad') {
      opacity(mouthSadRef.current, 1);
      // Look down
      irisLRef.current?.setAttribute('cy', '7');
      pupilLRef.current?.setAttribute('cy', '8');
      irisRRef.current?.setAttribute('cy', '7');
      pupilRRef.current?.setAttribute('cy', '8');
      onCardShake?.();
    }
  }, [state, onCardShake]);

  const className = [
    'jan-character',
    `state-${state}`,
    state === 'watching' ? 'tilt-active' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <style>{`
        .jan-character {
          position: absolute;
          bottom: -30px;
          width: 180px;
          transition: transform 0.5s cubic-bezier(0.34,1.56,0.64,1), filter 0.4s ease;
          transform-origin: center bottom;
          will-change: transform;
        }
        .jan-character svg { width: 100%; height: auto; display: block; }
        .jan-character.state-idle { transform: translateY(0) scale(1) rotate(0deg); }
        .jan-character.state-watching { transform: translateY(-8px) scale(1.05) rotate(-2deg); }
        .jan-character.state-peeking { transform: translateY(35px) scale(0.97) rotate(2deg); }
        .jan-character.state-happy { animation: janHappyBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) infinite alternate; }
        .jan-character.state-sad { animation: janSadShake 0.6s ease; filter: saturate(0.6) brightness(0.92); }
        .jan-character.tilt-active { transition: transform 0.15s ease-out; }
        #janMouthHappy, #janMouthSad, #janTeethHappy { transition: opacity 0.25s ease; }
        @keyframes janHappyBounce {
          0%   { transform: translateY(0)    scale(1)    rotate(-3deg); }
          100% { transform: translateY(-25px) scale(1.08) rotate(3deg); }
        }
        @keyframes janSadShake {
          0%,100% { transform: translateY(0) rotate(0deg); }
          10%  { transform: translateX(-8px) rotate(-3deg); }
          20%  { transform: translateX(7px)  rotate(2deg); }
          30%  { transform: translateX(-6px) rotate(-2deg); }
          40%  { transform: translateX(5px)  rotate(1.5deg); }
          50%  { transform: translateX(-4px) rotate(-1deg); }
          60%  { transform: translateX(3px)  rotate(0.5deg); }
          70%  { transform: translateX(-2px); }
          80%  { transform: translateY(4px); }
        }
        .jan-confetti-piece {
          position: absolute;
          top: -20px;
          animation: janConfettiFall 2.5s ease-out forwards;
        }
        @keyframes janConfettiFall {
          0%   { transform: translateY(0)     rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      <div ref={characterRef} className={className}>
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="eyeClipL">
              <ellipse cx="0" cy="0" rx="44" ry="22"/>
            </clipPath>
            <clipPath id="eyeClipR">
              <ellipse cx="0" cy="0" rx="62" ry="19"/>
            </clipPath>
          </defs>

          <image href="/icon-512.png" x="0" y="0" width="512" height="512"/>

          <circle cx="207" cy="223" r="16" fill="#f0f4fb"/>
          <circle cx="325" cy="213" r="15" fill="#edf2f9"/>

          <g clipPath="url(#eyeClipL)" transform="translate(210, 225) rotate(-8)">
            <circle ref={irisLRef} cx="0" cy="0" r="11" fill="#3080c0"/>
            <circle ref={pupilLRef} cx="0" cy="1" r="5" fill="#0a0e18"/>
            <circle cx="-3" cy="-3" r="2.5" fill="white" opacity={0.55}/>
          </g>

          <g clipPath="url(#eyeClipR)" transform="translate(325, 213)">
            <circle ref={irisRRef} cx="0" cy="0" r="11" fill="#3080c0"/>
            <circle ref={pupilRRef} cx="0" cy="1" r="5" fill="#0a0e18"/>
            <circle cx="-3" cy="-3" r="2.5" fill="white" opacity={0.55}/>
          </g>

          <path id="janMouthHappy" ref={mouthHappyRef}
            d="M210,345 Q240,380 270,380 Q300,380 330,345 Z"
            fill="#7a2828" stroke="#2d1a0e" strokeWidth={3}
            style={{ opacity: 0, transition: 'opacity 0.25s ease' }}/>
          <path id="janTeethHappy" ref={teethHappyRef}
            d="M220,348 L240,345 L240,356 L220,352Z M240,345 L260,343 L260,355 L240,356Z M260,343 L280,343 L280,355 L260,355Z"
            fill="#f0ece0"
            style={{ opacity: 0, transition: 'opacity 0.25s ease' }}/>
          <path id="janMouthSad" ref={mouthSadRef}
            d="M220,370 Q250,350 270,348 Q290,350 320,370"
            fill="none" stroke="#2d1a0e" strokeWidth={4} strokeLinecap="round"
            style={{ opacity: 0, transition: 'opacity 0.25s ease' }}/>
        </svg>
      </div>

      <div ref={confettiRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 100, overflow: 'hidden',
      }}/>
    </>
  );
}
