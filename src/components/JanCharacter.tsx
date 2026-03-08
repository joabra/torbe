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
        .jan-character .jan-hands {
          transform: translateY(220px);
          transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .jan-character.state-peeking .jan-hands {
          transform: translateY(0px);
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

            {/* Hand gradients */}
            <radialGradient id="handGradL" cx="55%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#e07550"/>
              <stop offset="40%" stopColor="#c85e32"/>
              <stop offset="100%" stopColor="#a84820"/>
            </radialGradient>
            <radialGradient id="handGradR" cx="45%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#e07550"/>
              <stop offset="40%" stopColor="#c85e32"/>
              <stop offset="100%" stopColor="#a84820"/>
            </radialGradient>
            <radialGradient id="fingerGradL" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#e8845c"/>
              <stop offset="100%" stopColor="#bf5828"/>
            </radialGradient>
            <radialGradient id="fingerGradR" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#e8845c"/>
              <stop offset="100%" stopColor="#bf5828"/>
            </radialGradient>
            <linearGradient id="palmShadowL" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b34e22" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#b34e22" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="palmShadowR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b34e22" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#b34e22" stopOpacity="0"/>
            </linearGradient>
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

          {/* Hands — slide up from below to cover face in peeking state */}
          <g className="jan-hands">

            {/* ── LEFT HAND ── */}
            {/* palm base */}
            <rect x="132" y="300" width="122" height="260" rx="40" fill="url(#handGradL)"/>
            {/* palm highlight */}
            <ellipse cx="193" cy="338" rx="48" ry="28" fill="#e8845c" opacity="0.35"/>
            {/* palm shadow overlay */}
            <rect x="132" y="300" width="122" height="100" rx="40" fill="url(#palmShadowL)"/>

            {/* finger bases merged into palm */}
            <ellipse cx="193" cy="295" rx="65" ry="32" fill="url(#handGradL)"/>

            {/* fingers: pinky → index */}
            <rect x="134" y="215" width="28" height="95" rx="14" fill="url(#fingerGradL)"/>
            <rect x="164" y="195" width="30" height="115" rx="15" fill="url(#fingerGradL)"/>
            <rect x="196" y="188" width="30" height="122" rx="15" fill="url(#fingerGradL)"/>
            <rect x="228" y="198" width="28" height="110" rx="14" fill="url(#fingerGradL)"/>
            {/* thumb */}
            <rect x="245" y="270" width="26" height="72" rx="13" fill="url(#fingerGradL)" transform="rotate(-38, 258, 310)"/>

            {/* knuckle creases */}
            <ellipse cx="148" cy="228" rx="9" ry="4" fill="#9e3e14" opacity="0.3"/>
            <ellipse cx="179" cy="210" rx="10" ry="4" fill="#9e3e14" opacity="0.3"/>
            <ellipse cx="211" cy="203" rx="10" ry="4" fill="#9e3e14" opacity="0.3"/>
            <ellipse cx="242" cy="212" rx="9" ry="4" fill="#9e3e14" opacity="0.3"/>
            {/* fingertip highlights */}
            <ellipse cx="148" cy="220" rx="7" ry="5" fill="#f09878" opacity="0.5"/>
            <ellipse cx="179" cy="200" rx="8" ry="5" fill="#f09878" opacity="0.5"/>
            <ellipse cx="211" cy="193" rx="8" ry="5" fill="#f09878" opacity="0.5"/>
            <ellipse cx="242" cy="203" rx="7" ry="5" fill="#f09878" opacity="0.5"/>

            {/* ── RIGHT HAND ── */}
            {/* palm base */}
            <rect x="258" y="300" width="122" height="260" rx="40" fill="url(#handGradR)"/>
            {/* palm highlight */}
            <ellipse cx="319" cy="338" rx="48" ry="28" fill="#e8845c" opacity="0.35"/>
            {/* palm shadow overlay */}
            <rect x="258" y="300" width="122" height="100" rx="40" fill="url(#palmShadowR)"/>

            {/* finger bases merged into palm */}
            <ellipse cx="319" cy="295" rx="65" ry="32" fill="url(#handGradR)"/>

            {/* fingers: index → pinky */}
            <rect x="254" y="198" width="28" height="110" rx="14" fill="url(#fingerGradR)"/>
            <rect x="286" y="188" width="30" height="122" rx="15" fill="url(#fingerGradR)"/>
            <rect x="318" y="195" width="30" height="115" rx="15" fill="url(#fingerGradR)"/>
            <rect x="350" y="215" width="28" height="95" rx="14" fill="url(#fingerGradR)"/>
            {/* thumb */}
            <rect x="241" y="270" width="26" height="72" rx="13" fill="url(#fingerGradR)" transform="rotate(38, 254, 310)"/>

            {/* knuckle creases */}
            <ellipse cx="268" cy="212" rx="9" ry="4" fill="#9e3e14" opacity="0.3"/>
            <ellipse cx="301" cy="203" rx="10" ry="4" fill="#9e3e14" opacity="0.3"/>
            <ellipse cx="333" cy="210" rx="10" ry="4" fill="#9e3e14" opacity="0.3"/>
            <ellipse cx="364" cy="228" rx="9" ry="4" fill="#9e3e14" opacity="0.3"/>
            {/* fingertip highlights */}
            <ellipse cx="268" cy="203" rx="7" ry="5" fill="#f09878" opacity="0.5"/>
            <ellipse cx="301" cy="193" rx="8" ry="5" fill="#f09878" opacity="0.5"/>
            <ellipse cx="333" cy="200" rx="8" ry="5" fill="#f09878" opacity="0.5"/>
            <ellipse cx="364" cy="220" rx="7" ry="5" fill="#f09878" opacity="0.5"/>
          </g>
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
