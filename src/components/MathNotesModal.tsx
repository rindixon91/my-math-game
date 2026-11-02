import React, { useEffect } from 'react';
import {
  PROPORTION_NOTES_HEADER,
  solveCrossMultiplicationMethod,
  solveProportionMethod,
  solveUnitaryMethod,
  THREE_PROPORTION_METHODS,
  UNDERSTANDING_PROPORTION_POINTS,
  WORKED_EXAMPLE_PROBLEM,
} from '../game/proportionNotes';

interface MathNotesModalProps {
  onBack: () => void;
}

interface MathFractionProps {
  num: React.ReactNode;
  den: React.ReactNode;
  size?: 'md' | 'lg';
}

const MathFraction: React.FC<MathFractionProps> = ({ num, den, size = 'md' }) => {
  const textCls = size === 'lg' ? 'text-lg sm:text-xl' : 'text-sm sm:text-base';
  return (
    <span className={`inline-flex flex-col items-center align-middle mx-1 font-mono-tabular font-bold text-stone-900 ${textCls}`}>
      <span className="px-2 pb-0.5 leading-tight">{num}</span>
      <span className="w-full border-t-2 border-stone-900" />
      <span className="px-2 pt-0.5 leading-tight">{den}</span>
    </span>
  );
};

export const MathNotesModal: React.FC<MathNotesModalProps> = ({ onBack }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const unitary = solveUnitaryMethod(
    WORKED_EXAMPLE_PROBLEM.flourParts,
    WORKED_EXAMPLE_PROBLEM.waterParts,
    WORKED_EXAMPLE_PROBLEM.flourMassGrams
  );
  const propMethod = solveProportionMethod(
    WORKED_EXAMPLE_PROBLEM.flourParts,
    WORKED_EXAMPLE_PROBLEM.waterParts,
    WORKED_EXAMPLE_PROBLEM.flourMassGrams
  );
  const crossMethod = solveCrossMultiplicationMethod(
    WORKED_EXAMPLE_PROBLEM.flourParts,
    WORKED_EXAMPLE_PROBLEM.waterParts,
    WORKED_EXAMPLE_PROBLEM.flourMassGrams
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/82"
      role="dialog"
      aria-modal="true"
      aria-labelledby="math-notes-heading"
    >
      {/* Retro Hardcover School Folio Shell */}
      <div className="chalkboard-panel w-full max-w-4xl max-h-[94dvh] flex flex-col rounded-xl overflow-hidden">
        {/* Pinned Top Wood & Chalkboard Header Bar (Always Accessible BACK Button) */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5 border-b-4 border-[#8b5a2b] bg-[#102b1b]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Pixel-Art Red Revision Notebook & Ruler Icon */}
            <svg
              viewBox="0 0 32 32"
              className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 pixel-crisp"
              aria-hidden="true"
            >
              {/* Red Notebook Cover */}
              <rect x="4" y="3" width="20" height="26" fill="#991b1b" />
              <rect x="6" y="5" width="16" height="22" fill="#dc2626" />
              {/* Spiral Wire Rings */}
              <rect x="2" y="6" width="4" height="2" fill="#cbd5e1" />
              <rect x="2" y="11" width="4" height="2" fill="#cbd5e1" />
              <rect x="2" y="16" width="4" height="2" fill="#cbd5e1" />
              <rect x="2" y="21" width="4" height="2" fill="#cbd5e1" />
              <rect x="2" y="26" width="4" height="2" fill="#cbd5e1" />
              {/* Cream Label Plate */}
              <rect x="8" y="8" width="12" height="7" fill="#fef3c7" />
              <rect x="10" y="10" width="8" height="1.5" fill="#1e293b" />
              <rect x="10" y="12.5" width="5" height="1.5" fill="#1e293b" />
              {/* Diagonal Pixel Yellow Ruler */}
              <rect x="18" y="12" width="10" height="17" fill="#eab308" stroke="#713f12" strokeWidth="1.5" />
              <rect x="19" y="15" width="4" height="1.5" fill="#713f12" />
              <rect x="19" y="19" width="3" height="1.5" fill="#713f12" />
              <rect x="19" y="23" width="4" height="1.5" fill="#713f12" />
            </svg>

            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-mono-tabular text-amber-300/95 truncate">
                Here School · Lembaran Ulang Kaji Bilik Darjah
              </p>
              <h2
                id="math-notes-heading"
                className="font-display font-extrabold text-sm sm:text-xl md:text-2xl text-amber-100 tracking-wide leading-snug"
              >
                {PROPORTION_NOTES_HEADER.fullHeading}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] px-4 sm:px-6 py-2 bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 text-white font-display font-extrabold text-sm sm:text-base tracking-wider rounded-lg border-2 border-emerald-200 shadow-md transition-transform cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-yellow-300 touch-manipulation"
          >
            KEMBALI
          </button>
        </div>

        {/* Scrollable Vintage 1990s School Textbook / Notebook Pages */}
        <div
          data-testid="math-notes-scroll-body"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain vintage-revision-sheet text-stone-900 p-4 sm:p-6 md:p-8"
        >
          <div className="max-w-3xl mx-auto space-y-7 sm:space-y-8">
            {/* Vintage School Stamp & Quirky Baldi Teacher Marginalia */}
            <div className="border-b-2 border-stone-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-mono-tabular text-[11px] sm:text-xs font-bold tracking-wider text-red-900">
                  {PROPORTION_NOTES_HEADER.schoolStamp}
                </p>
                <p className="text-xs sm:text-sm text-stone-800 mt-1 italic leading-relaxed">
                  &ldquo;{PROPORTION_NOTES_HEADER.baldiNote}&rdquo;
                </p>
              </div>

              {/* Tiny Pixel Baldi Head & Ruler Stamp */}
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center border-2 border-red-900/70 px-2.5 py-1.5 bg-[#efe4c6]">
                <svg
                  viewBox="0 0 24 24"
                  className="w-7 h-7 shrink-0 pixel-crisp"
                  aria-hidden="true"
                >
                  <rect x="7" y="3" width="10" height="11" fill="#e6c28b" />
                  <rect x="11" y="1" width="2" height="2" fill="#78350f" />
                  <rect x="8" y="7" width="2" height="2" fill="#0f172a" />
                  <rect x="14" y="7" width="2" height="2" fill="#0f172a" />
                  <rect x="9" y="11" width="6" height="1.5" fill="#dc2626" />
                  <rect x="6" y="14" width="12" height="8" fill="#16a34a" />
                  <rect x="20" y="5" width="3" height="17" fill="#eab308" />
                </svg>
                <div className="font-mono-tabular text-[10px] leading-tight font-bold text-red-950">
                  <div>PANDUAN</div>
                  <div>CIKGU BALDI</div>
                </div>
              </div>
            </div>

            {/* =========================================================
                SECTION A: MEMAHAMI KADARAN
               ========================================================= */}
            <section aria-labelledby="section-a-title" className="space-y-4">
              <div className="flex items-baseline gap-2.5 border-b-2 border-stone-800 pb-1.5">
                <span className="font-mono-tabular font-extrabold text-base sm:text-lg text-red-900">
                  A.
                </span>
                <h3
                  id="section-a-title"
                  className="font-display font-extrabold text-lg sm:text-xl md:text-2xl text-stone-900 tracking-tight"
                >
                  Memahami Kadaran
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* Key Bullet Points */}
                <div className="md:col-span-7 vintage-method-page rounded-md p-4 sm:p-5 flex flex-col justify-between gap-3">
                  <ul className="space-y-2.5 text-sm sm:text-base text-stone-900 leading-relaxed">
                    {UNDERSTANDING_PROPORTION_POINTS.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="font-mono-tabular font-extrabold text-red-900 mt-0.5 shrink-0">
                          ■
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-xs sm:text-sm text-stone-700 border-t border-stone-400/70 pt-2.5">
                    Apabila dua nisbah dipermudahkan kepada nilai yang sama, kedua-dua kuantiti tersebut adalah{' '}
                    <strong className="text-stone-900">berkadaran (nisbah setara)</strong>.
                  </p>
                </div>

                {/* Fraction Form Chalkboard/Textbook Callout + Simple Ratio Illustration */}
                <div className="md:col-span-5 vintage-method-page rounded-md p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-3">
                  <div className="text-xs font-mono-tabular font-bold text-stone-700">
                    CONTOH BENTUK PECAHAN
                  </div>

                  <div
                    className="bg-[#143622] text-amber-100 border-2 border-[#713f12] rounded px-5 py-3 shadow-inner flex items-center justify-center gap-2.5 font-mono-tabular text-lg sm:text-xl font-bold"
                    aria-label="a1 per a2 sama dengan b1 per b2"
                  >
                    <span className="inline-flex flex-col items-center">
                      <span className="px-2 pb-0.5">
                        a<sub className="text-xs">1</sub>
                      </span>
                      <span className="w-full border-t-2 border-amber-200" />
                      <span className="px-2 pt-0.5">
                        a<sub className="text-xs">2</sub>
                      </span>
                    </span>
                    <span className="text-amber-300 font-extrabold">=</span>
                    <span className="inline-flex flex-col items-center">
                      <span className="px-2 pb-0.5">
                        b<sub className="text-xs">1</sub>
                      </span>
                      <span className="w-full border-t-2 border-amber-200" />
                      <span className="px-2 pt-0.5">
                        b<sub className="text-xs">2</sub>
                      </span>
                    </span>
                  </div>

                  {/* Pixel-Crisp Equivalent Ratio Visual (1:2 = 2:4) */}
                  <div className="w-full pt-1">
                    <svg
                      viewBox="0 0 220 44"
                      className="w-full max-w-[220px] mx-auto h-auto pixel-crisp"
                      role="img"
                      aria-label="Ilustrasi nisbah setara menunjukkan 1 daripada 2 bahagian berlorek sama dengan 2 daripada 4 bahagian berlorek"
                    >
                      {/* Left bar: 1/2 */}
                      <rect x="8" y="6" width="36" height="18" fill="#d97706" stroke="#292524" strokeWidth="2" />
                      <rect x="44" y="6" width="36" height="18" fill="#fef3c7" stroke="#292524" strokeWidth="2" />
                      <text x="44" y="38" textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold" fill="#292524">
                        1/2 = 0.5
                      </text>

                      {/* Equals sign */}
                      <text x="110" y="20" textAnchor="middle" fontSize="15" fontFamily="JetBrains Mono, monospace" fontWeight="bold" fill="#991b1b">
                        =
                      </text>

                      {/* Right bar: 2/4 */}
                      <rect x="140" y="6" width="18" height="18" fill="#d97706" stroke="#292524" strokeWidth="2" />
                      <rect x="158" y="6" width="18" height="18" fill="#d97706" stroke="#292524" strokeWidth="2" />
                      <rect x="176" y="6" width="18" height="18" fill="#fef3c7" stroke="#292524" strokeWidth="2" />
                      <rect x="194" y="6" width="18" height="18" fill="#fef3c7" stroke="#292524" strokeWidth="2" />
                      <text x="176" y="38" textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold" fill="#292524">
                        2/4 = 0.5
                      </text>
                    </svg>
                  </div>
                </div>
              </div>
            </section>

            {/* =========================================================
                SECTION B: TIGA KAEDAH MENYELESAIKAN KADARAN
               ========================================================= */}
            <section aria-labelledby="section-b-title" className="space-y-4">
              <div className="flex items-baseline gap-2.5 border-b-2 border-stone-800 pb-1.5">
                <span className="font-mono-tabular font-extrabold text-base sm:text-lg text-red-900">
                  B.
                </span>
                <h3
                  id="section-b-title"
                  className="font-display font-extrabold text-lg sm:text-xl md:text-2xl text-stone-900 tracking-tight"
                >
                  Tiga Kaedah Menyelesaikan Kadaran
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {THREE_PROPORTION_METHODS.map((method) => (
                  <div
                    key={method.number}
                    className="vintage-method-page rounded-md p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 border-b border-stone-800/40 pb-2 mb-3">
                        <h4 className="font-display font-extrabold text-base sm:text-lg text-stone-900">
                          {method.number}. {method.title}
                        </h4>
                      </div>

                      <ul className="space-y-2 text-xs sm:text-sm text-stone-800 leading-relaxed">
                        {method.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="font-mono-tabular font-bold text-red-900 shrink-0">
                              •
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Retro Textbook Mini Schematic per Method */}
                    <div className="pt-2 border-t border-stone-400/60 text-center font-mono-tabular text-xs font-bold text-stone-800 bg-[#efe7cf] rounded px-2 py-2">
                      {method.number === 1 && <span>k bahagian → ÷ k → 1 bahagian → × n</span>}
                      {method.number === 2 && <span>a / b = (a × m) / (b × m)</span>}
                      {method.number === 3 && <span>a / b = c / x  ⇒  a · x = b · c</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* =========================================================
                SECTION C: CONTOH PENYELESAIAN (KETIGA-TIGA KAEDAH)
               ========================================================= */}
            <section aria-labelledby="section-c-title" className="space-y-4">
              <div className="flex items-baseline gap-2.5 border-b-2 border-stone-800 pb-1.5">
                <span className="font-mono-tabular font-extrabold text-base sm:text-lg text-red-900">
                  C.
                </span>
                <h3
                  id="section-c-title"
                  className="font-display font-extrabold text-lg sm:text-xl md:text-2xl text-stone-900 tracking-tight"
                >
                  Contoh Penyelesaian
                </h3>
              </div>

              {/* Problem Statement & Pixel-Art Tepung : Air Illustration */}
              <div className="vintage-method-page rounded-md p-4 sm:p-5 bg-[#fbf6e8]">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-7 space-y-2">
                    <div className="font-mono-tabular text-xs font-extrabold tracking-wider text-red-900">
                      CONTOH SOALAN · NISBAH 5 : 3
                    </div>
                    <p className="text-base sm:text-lg font-bold text-stone-900 leading-snug">
                      {WORKED_EXAMPLE_PROBLEM.ratioStatement}
                    </p>
                    <p className="text-base sm:text-lg font-bold text-stone-900 leading-snug">
                      {WORKED_EXAMPLE_PROBLEM.questionStatement}
                    </p>
                    <div className="pt-1 font-mono-tabular text-xs sm:text-sm text-stone-800 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        <strong>Tepung : Air</strong> = 5 : 3
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        <strong>480 g : x g</strong>
                      </span>
                    </div>
                  </div>

                  {/* Pixel-Art Flour Sack, Water Beaker & 5:3 Parts Bar */}
                  <div className="md:col-span-5 bg-[#efe7cf] border-2 border-stone-800 rounded p-3">
                    <svg
                      viewBox="0 0 240 88"
                      className="w-full h-auto pixel-crisp"
                      role="img"
                      aria-label="5 bahagian tepung bersamaan 480 gram, 3 bahagian air bersamaan x gram"
                    >
                      {/* Pixel Flour Sack Icon */}
                      <rect x="8" y="10" width="22" height="24" fill="#d6c29f" stroke="#292524" strokeWidth="2" />
                      <rect x="11" y="6" width="16" height="4" fill="#b89f74" stroke="#292524" strokeWidth="1.5" />
                      <text x="19" y="25" textAnchor="middle" fontSize="8" fontFamily="JetBrains Mono, monospace" fontWeight="bold" fill="#292524">
                        TPG
                      </text>

                      {/* 5 Parts Flour Blocks */}
                      {[0, 1, 2, 3, 4].map((idx) => (
                        <rect
                          key={`f-${idx}`}
                          x={38 + idx * 24}
                          y="12"
                          width="22"
                          height="18"
                          fill="#eab308"
                          stroke="#292524"
                          strokeWidth="2"
                        />
                      ))}
                      <text x="166" y="25" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold" fill="#292524">
                        = 480 g
                      </text>

                      {/* Pixel Water Beaker Icon */}
                      <rect x="8" y="48" width="22" height="24" fill="#bae6fd" stroke="#292524" strokeWidth="2" />
                      <rect x="10" y="56" width="18" height="14" fill="#38bdf8" />
                      <text x="19" y="67" textAnchor="middle" fontSize="7" fontFamily="JetBrains Mono, monospace" fontWeight="bold" fill="#0f172a">
                        AIR
                      </text>

                      {/* 3 Parts Water Blocks */}
                      {[0, 1, 2].map((idx) => (
                        <rect
                          key={`w-${idx}`}
                          x={38 + idx * 24}
                          y="50"
                          width="22"
                          height="18"
                          fill="#38bdf8"
                          stroke="#292524"
                          strokeWidth="2"
                        />
                      ))}
                      <text x="118" y="63" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold" fill="#991b1b">
                        = x g (?)
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Three Worked Solution Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                {/* ---------------- KAEDAH 1: KAEDAH UNITARI ---------------- */}
                <div className="vintage-method-page rounded-md p-4 sm:p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="border-b-2 border-stone-800 pb-2">
                      <div className="font-mono-tabular text-[11px] font-bold text-red-900">
                        KAEDAH 1
                      </div>
                      <h4 className="font-display font-extrabold text-base sm:text-lg text-stone-900">
                        Kaedah Unitari
                      </h4>
                    </div>

                    <div className="bg-[#efe7cf] border border-stone-500/60 rounded p-3 space-y-2.5 font-mono-tabular text-xs sm:text-[13px] text-stone-900 leading-relaxed">
                      <div className="flex items-center justify-between gap-2 border-b border-stone-400/60 pb-1.5">
                        <span>{unitary.knownParts} bahagian tepung</span>
                        <span className="font-extrabold whitespace-nowrap">
                          = {unitary.knownAmountGrams}&nbsp;g
                        </span>
                      </div>

                      <div className="space-y-1 border-b border-stone-400/60 pb-2">
                        <div className="text-stone-700 text-[11px]">Cari nilai 1 bahagian dahulu:</div>
                        <div className="font-bold">
                          1 bahagian tepung = {unitary.knownAmountGrams} ÷ {unitary.knownParts} ={' '}
                          <span className="text-red-900 font-extrabold">
                            {unitary.onePartGrams}&nbsp;g
                          </span>
                        </div>
                      </div>

                      <div className="pt-0.5 font-bold">
                        {unitary.targetParts} bahagian air = {unitary.targetParts}&nbsp;×&nbsp;
                        {unitary.onePartGrams}
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-stone-700 pt-3">
                    <div className="bg-[#143622] text-amber-200 border-2 border-stone-900 rounded px-3 py-2 text-center font-mono-tabular font-extrabold text-sm sm:text-base">
                      Jawapan = {unitary.answerGrams} g
                    </div>
                  </div>
                </div>

                {/* ---------------- KAEDAH 2: KAEDAH KADARAN ---------------- */}
                <div className="vintage-method-page rounded-md p-4 sm:p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="border-b-2 border-stone-800 pb-2">
                      <div className="font-mono-tabular text-[11px] font-bold text-red-900">
                        KAEDAH 2
                      </div>
                      <h4 className="font-display font-extrabold text-base sm:text-lg text-stone-900">
                        Kaedah Kadaran
                      </h4>
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-[13px] text-stone-900 leading-snug">
                      <p>5 bahagian tepung sepadan dengan 3 bahagian air.</p>
                      <p>
                        480&nbsp;g tepung sepadan dengan{' '}
                        <strong className="font-mono-tabular text-red-900">x</strong>&nbsp;g air.
                      </p>
                    </div>

                    {/* Fraction Equality + Curved ×96 Multiplier Diagram */}
                    <div className="bg-[#efe7cf] border border-stone-500/60 rounded p-2.5 text-center space-y-1">
                      <svg
                        viewBox="0 0 210 108"
                        className="w-full max-w-[205px] mx-auto h-auto"
                        role="img"
                        aria-label="5 per 3 sama dengan 480 per x, mendarab pengangka dan penyebut dengan 96 menghasilkan x sama dengan 288"
                      >
                        {/* Top curved ×96 arrow */}
                        <text
                          x="105"
                          y="13"
                          textAnchor="middle"
                          fontSize="11"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                          fill="#991b1b"
                        >
                          × {propMethod.scaleFactor}
                        </text>
                        <path
                          d="M 66 24 Q 105 12 140 24"
                          fill="none"
                          stroke="#991b1b"
                          strokeWidth="1.8"
                        />
                        <polygon points="143,25 135,26 138,19" fill="#991b1b" />

                        {/* Left Fraction 5/3 */}
                        <text
                          x="52"
                          y="45"
                          textAnchor="middle"
                          fontSize="16"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                          fill="#1c1917"
                        >
                          5
                        </text>
                        <line x1="36" y1="53" x2="68" y2="53" stroke="#1c1917" strokeWidth="2.2" />
                        <text
                          x="52"
                          y="72"
                          textAnchor="middle"
                          fontSize="16"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                          fill="#1c1917"
                        >
                          3
                        </text>

                        {/* Equals */}
                        <text
                          x="105"
                          y="58"
                          textAnchor="middle"
                          fontSize="16"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                          fill="#1c1917"
                        >
                          =
                        </text>

                        {/* Right Fraction 480/x */}
                        <text
                          x="158"
                          y="45"
                          textAnchor="middle"
                          fontSize="16"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                          fill="#1c1917"
                        >
                          480
                        </text>
                        <line x1="136" y1="53" x2="180" y2="53" stroke="#1c1917" strokeWidth="2.2" />
                        <text
                          x="158"
                          y="72"
                          textAnchor="middle"
                          fontSize="16"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                          fill="#991b1b"
                        >
                          x
                        </text>

                        {/* Bottom curved ×96 arrow */}
                        <path
                          d="M 66 80 Q 105 92 140 80"
                          fill="none"
                          stroke="#1e3a8a"
                          strokeWidth="1.8"
                        />
                        <polygon points="143,79 138,85 135,78" fill="#1e3a8a" />
                        <text
                          x="105"
                          y="103"
                          textAnchor="middle"
                          fontSize="11"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                          fill="#1e3a8a"
                        >
                          × {propMethod.scaleFactor}
                        </text>
                      </svg>

                      <div className="font-mono-tabular font-extrabold text-sm text-stone-900 pt-0.5">
                        x = {propMethod.answerGrams}
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-stone-700 pt-3">
                    <div className="bg-[#143622] text-amber-200 border-2 border-stone-900 rounded px-3 py-2 text-center font-mono-tabular font-extrabold text-sm sm:text-base">
                      Jawapan = {propMethod.answerGrams} g
                    </div>
                  </div>
                </div>

                {/* ---------------- KAEDAH 3: KAEDAH PENDARABAN SILANG ---------------- */}
                <div className="vintage-method-page rounded-md p-4 sm:p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="border-b-2 border-stone-800 pb-2">
                      <div className="font-mono-tabular text-[11px] font-bold text-red-900">
                        KAEDAH 3
                      </div>
                      <h4 className="font-display font-extrabold text-base sm:text-lg text-stone-900">
                        Kaedah Pendaraban Silang
                      </h4>
                    </div>

                    {/* Clean Stacked Proportion Equation + Diagonal Cross Arrows */}
                    <div className="bg-[#efe7cf] border border-stone-500/60 rounded p-2.5 flex flex-col items-center gap-1.5">
                      <div className="flex items-center justify-center font-mono-tabular font-bold">
                        <MathFraction num="5" den="480" size="lg" />
                        <span className="mx-1.5 font-extrabold text-base">=</span>
                        <MathFraction
                          num="3"
                          den={<span className="text-red-900">x</span>}
                          size="lg"
                        />
                      </div>

                      <div className="flex items-center justify-center gap-1 text-[11px] font-mono-tabular font-bold text-stone-700">
                        <span>Darab secara menyilang:</span>
                        <svg
                          viewBox="0 0 24 24"
                          className="w-4 h-4 shrink-0"
                          aria-hidden="true"
                        >
                          <line x1="3" y1="4" x2="21" y2="20" stroke="#991b1b" strokeWidth="2.4" />
                          <polygon points="21,20 15,19 19,14" fill="#991b1b" />
                          <line x1="3" y1="20" x2="21" y2="4" stroke="#1e3a8a" strokeWidth="2.4" />
                          <polygon points="21,4 19,10 15,5" fill="#1e3a8a" />
                        </svg>
                      </div>
                    </div>

                    <div className="space-y-2 font-mono-tabular text-xs sm:text-sm text-stone-900 text-center">
                      <div className="font-bold">5x = 3 × 480</div>
                      <div className="flex items-center justify-center gap-1.5 font-bold">
                        <span>x =</span>
                        <MathFraction
                          num={crossMethod.crossProduct}
                          den={crossMethod.leftNum}
                          size="md"
                        />
                      </div>
                      <div className="pt-0.5">
                        <span className="inline-block border-2 border-stone-900 bg-amber-100 px-3.5 py-1 font-extrabold text-sm sm:text-base text-stone-950 shadow-[2px_2px_0px_#292524]">
                          x = {crossMethod.answerGrams} g
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-stone-700 pt-3">
                    <div className="bg-[#143622] text-amber-200 border-2 border-stone-900 rounded px-3 py-2 text-center font-mono-tabular font-extrabold text-sm sm:text-base">
                      Jawapan = {crossMethod.answerGrams} g
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Teacher Remark + Secondary Accessible KEMBALI Button */}
            <div className="border-t-2 border-stone-800 pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="font-mono-tabular text-xs sm:text-sm font-bold text-red-950">
                CATATAN CIKGU BALDI: Ketiga-tiga kaedah memberikan jawapan yang tepat dan sama (288 g). Pilih kaedah yang paling mudah untuk kamu selesaikan soalan dengan pantas sebelum Baldi tiba!
              </p>

              <button
                type="button"
                onClick={onBack}
                className="min-h-[44px] px-7 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:translate-y-0.5 text-white font-display font-extrabold text-sm sm:text-base tracking-wider rounded-lg border-2 border-stone-900 shadow-[3px_3px_0px_#1c1917] transition-transform cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-yellow-500 touch-manipulation"
              >
                KEMBALI KE SKRIN UTAMA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
