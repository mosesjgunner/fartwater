export function BrandStyles() {
  return (
    <style>{`
      :root{ --mint:#00ffc3; --aqua:#14b8a6; --gold:#facc15; --pink:#d946ef; --purple:#a855f7; --ink:#0a0a0e; }
      body{background:linear-gradient(180deg,#0b0d11 0%, #0a0c10 100%);}
      @keyframes shimmer{0%{background-position:-300px 0}100%{background-position:300px 0}}
      .diamond-text{background-image:linear-gradient(90deg,#fff,var(--gold),#fff);background-size:320px 100%;-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 2px 18px rgba(255,255,255,.35);animation:shimmer 3.5s linear infinite}
      .chrome-border{position:relative}
      .chrome-border:before{content:"";position:absolute;inset:0;padding:1px;border-radius:16px;background:linear-gradient(90deg,#ffffff,rgba(255,255,255,.35),#ffffff);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
      .card{background:linear-gradient(180deg,rgba(18,22,30,.88),rgba(10,14,20,.88));border:1px solid rgba(255,255,255,.12);border-radius:16px;box-shadow:0 24px 70px -30px rgba(0,255,195,.35)}
      .hover-tilt{transition:transform .25s ease, box-shadow .25s ease}
      .hover-tilt:hover{transform:translateY(-6px) rotate3d(.5,1,0,4deg);box-shadow:0 44px 90px -30px rgba(217,70,239,.45)}
      .dash-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}
      .tone-casino{background:radial-gradient(1200px 500px at 10% 0%,rgba(250,204,21,.25),transparent 40%),radial-gradient(1200px 500px at 100% 0%,rgba(0,255,195,.22),transparent 45%),radial-gradient(1200px 600px at 50% 100%,rgba(168,85,247,.20),transparent 45%)}
      .foil{background:conic-gradient(from 0deg,#fff 0%, #fef3c7 12%, #e9d5ff 25%, #cffafe 37%, #fde68a 50%, #f5d0fe 62%, #bae6fd 75%, #fff 87%, #fde68a 100%);filter:saturate(1.2) brightness(1.05);opacity:.18;pointer-events:none}
    `}</style>
  );
}
