export interface UnitarySolution {
  knownParts: number;
  knownAmountGrams: number;
  onePartGrams: number;
  targetParts: number;
  answerGrams: number;
}

export interface ProportionFactorSolution {
  numeratorLeft: number;
  denominatorLeft: number;
  numeratorRight: number;
  scaleFactor: number;
  answerGrams: number;
}

export interface CrossMultiplySolution {
  leftNum: number;
  leftDen: number;
  rightNum: number;
  crossProduct: number;
  answerGrams: number;
}

export interface ProportionMethodGuide {
  number: 1 | 2 | 3;
  title: string;
  steps: readonly string[];
}

export const PROPORTION_NOTES_HEADER = {
  syllabusTag: 'Matematik Tingkatan 1 KSSM',
  chapterTitle: 'Bab 4.3: Kadaran',
  fullHeading: 'Matematik Tingkatan 1 KSSM – Bab 4.3: Kadaran',
  schoolStamp: 'PANITIA MATEMATIK HERE SCHOOL · LEMBARAN ULANG KAJI #4.3',
  baldiNote:
    'Baca setiap baris dengan teliti sebelum mengumpulkan kesemua 7 buku nota saya. Setiap kadaran hanya mempunyai satu jawapan tepat — dan saya dengar setiap kesilapan kamu!',
} as const;

export const UNDERSTANDING_PROPORTION_POINTS: readonly string[] = [
  'Kadaran menyatakan kesamaan antara dua nisbah atau dua kadar.',
  'Kadaran boleh diungkapkan dalam bentuk pecahan (pengangka per penyebut).',
  'Dua nisbah adalah berkadaran apabila membentuk nisbah setara yang mempunyai nilai yang sama.',
];

export const THREE_PROPORTION_METHODS: readonly ProportionMethodGuide[] = [
  {
    number: 1,
    title: 'Kaedah Unitari',
    steps: [
      'Cari nilai bagi satu unit atau satu bahagian terlebih dahulu.',
      'Darabkan nilai satu bahagian itu dengan bilangan bahagian yang dikehendaki.',
    ],
  },
  {
    number: 2,
    title: 'Kaedah Kadaran',
    steps: [
      'Kenal pasti hubungan antara kuantiti yang sepadan dalam nisbah setara.',
      'Darab atau bahagi pengangka dan penyebut dengan faktor yang sama.',
    ],
  },
  {
    number: 3,
    title: 'Kaedah Pendaraban Silang',
    steps: [
      'Tulis kadaran sebagai dua pecahan yang setara.',
      'Darab secara menyilang antara pengangka dan penyebut kedua-dua pecahan.',
      'Bentuk satu persamaan dan selesaikan untuk mencari nilai yang tidak diketahui.',
    ],
  },
];

export const WORKED_EXAMPLE_PROBLEM = {
  ratioStatement: 'Nisbah jisim tepung kepada jisim air ialah 5 : 3.',
  questionStatement: 'Jika 480 g tepung diperlukan, hitung jisim air yang diperlukan.',
  flourParts: 5,
  waterParts: 3,
  flourMassGrams: 480,
} as const;

/**
 * Method 1: Unitary Method
 * 5 parts = 480 g -> 1 part = 480 / 5 = 96 g -> 3 parts = 3 * 96 = 288 g
 */
export function solveUnitaryMethod(
  knownParts: number,
  targetParts: number,
  knownAmountGrams: number
): UnitarySolution {
  if (knownParts <= 0) {
    throw new Error('knownParts must be positive');
  }
  const onePartGrams = knownAmountGrams / knownParts;
  const answerGrams = targetParts * onePartGrams;
  return {
    knownParts,
    knownAmountGrams,
    onePartGrams,
    targetParts,
    answerGrams,
  };
}

/**
 * Method 2: Proportion Method
 * 5 / 3 = 480 / x -> scaleFactor = 480 / 5 = 96 -> x = 3 * 96 = 288 g
 */
export function solveProportionMethod(
  knownParts: number,
  targetParts: number,
  knownAmountGrams: number
): ProportionFactorSolution {
  if (knownParts <= 0) {
    throw new Error('knownParts must be positive');
  }
  const scaleFactor = knownAmountGrams / knownParts;
  const answerGrams = targetParts * scaleFactor;
  return {
    numeratorLeft: knownParts,
    denominatorLeft: targetParts,
    numeratorRight: knownAmountGrams,
    scaleFactor,
    answerGrams,
  };
}

/**
 * Method 3: Cross-Multiplication Method
 * 5 / 480 = 3 / x -> 5x = 3 * 480 = 1440 -> x = 1440 / 5 = 288 g
 */
export function solveCrossMultiplicationMethod(
  knownParts: number,
  targetParts: number,
  knownAmountGrams: number
): CrossMultiplySolution {
  if (knownParts <= 0) {
    throw new Error('knownParts must be positive');
  }
  const crossProduct = targetParts * knownAmountGrams;
  const answerGrams = crossProduct / knownParts;
  return {
    leftNum: knownParts,
    leftDen: knownAmountGrams,
    rightNum: targetParts,
    crossProduct,
    answerGrams,
  };
}
