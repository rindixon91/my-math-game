export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export function getDifficultyLabel(difficulty: DifficultyLevel): string {
  switch (difficulty) {
    case DifficultyLevel.EASY:
      return 'MUDAH';
    case DifficultyLevel.MEDIUM:
      return 'SEDERHANA';
    case DifficultyLevel.HARD:
      return 'SUKAR';
  }
}

export type AnswerChoiceKey = 'A' | 'B' | 'C' | 'D';

export interface AnswerOption {
  key: AnswerChoiceKey;
  label: string;
}

export interface NotebookQuestion {
  notebookId: number;
  roomName: string;
  difficulty: DifficultyLevel;
  topic: string;
  question: string;
  options: readonly AnswerOption[];
  correctKey: AnswerChoiceKey;
  correctLabel: string;
  hintFormula: string;
}

/**
 * Matematik Tingkatan 1 KSSM — Bab 4.3: Kadaran
 * Tepat 7 buah buku nota: 2 Mudah, 2 Sederhana, 3 Sukar.
 * Soalan, pilihan jawapan dan jawapan betul adalah tetap.
 */
export const QUESTION_DATABASE: readonly NotebookQuestion[] = Object.freeze([
  {
    notebookId: 1,
    roomName: 'Bilik Darjah A',
    difficulty: DifficultyLevel.EASY,
    topic: 'Matematik Tingkatan 1 KSSM · Bab 4.3: Kadaran',
    question: 'Harga bagi dua buah buku nota ialah RM6. Berapakah harga bagi lima buah buku nota?',
    options: [
      { key: 'A', label: 'RM12' },
      { key: 'B', label: 'RM15' },
      { key: 'C', label: 'RM18' },
      { key: 'D', label: 'RM20' },
    ],
    correctKey: 'B',
    correctLabel: 'RM15',
    hintFormula: 'RM6 ÷ 2 = RM3 sebuah buku nota · 5 × RM3',
  },
  {
    notebookId: 2,
    roomName: 'Bilik Darjah B',
    difficulty: DifficultyLevel.EASY,
    topic: 'Matematik Tingkatan 1 KSSM · Bab 4.3: Kadaran',
    question:
      'Tiga cawan jus memerlukan enam biji oren. Berapa biji oren yang diperlukan untuk menyediakan lima cawan jus?',
    options: [
      { key: 'A', label: '8' },
      { key: 'B', label: '9' },
      { key: 'C', label: '10' },
      { key: 'D', label: '12' },
    ],
    correctKey: 'C',
    correctLabel: '10',
    hintFormula: '6 biji oren ÷ 3 cawan = 2 biji oren/cawan · 5 × 2',
  },
  {
    notebookId: 3,
    roomName: 'Bilik Darjah C',
    difficulty: DifficultyLevel.MEDIUM,
    topic: 'Matematik Tingkatan 1 KSSM · Bab 4.3: Kadaran',
    question: 'Empat meter kain berharga RM28. Berapakah harga bagi tujuh meter kain yang sama?',
    options: [
      { key: 'A', label: 'RM42' },
      { key: 'B', label: 'RM45' },
      { key: 'C', label: 'RM49' },
      { key: 'D', label: 'RM56' },
    ],
    correctKey: 'C',
    correctLabel: 'RM49',
    hintFormula: 'RM28 ÷ 4 m = RM7/m · 7 × RM7',
  },
  {
    notebookId: 4,
    roomName: 'Bilik Darjah D',
    difficulty: DifficultyLevel.MEDIUM,
    topic: 'Matematik Tingkatan 1 KSSM · Bab 4.3: Kadaran',
    question:
      'Sebuah kereta bergerak sejauh 90 km dalam masa dua jam pada kelajuan malar. Berapakah jarak yang dilalui oleh kereta itu dalam masa lima jam?',
    options: [
      { key: 'A', label: '180 km' },
      { key: 'B', label: '200 km' },
      { key: 'C', label: '225 km' },
      { key: 'D', label: '250 km' },
    ],
    correctKey: 'C',
    correctLabel: '225 km',
    hintFormula: '90 km ÷ 2 jam = 45 km/j · 5 × 45 km',
  },
  {
    notebookId: 5,
    roomName: 'Perpustakaan',
    difficulty: DifficultyLevel.HARD,
    topic: 'Matematik Tingkatan 1 KSSM · Bab 4.3: Kadaran',
    question:
      'Sebuah pencetak mencetak 180 helai halaman dalam masa enam minit. Berapa helai halaman yang dapat dicetak dalam masa 14 minit pada kadar yang sama?',
    options: [
      { key: 'A', label: '360' },
      { key: 'B', label: '400' },
      { key: 'C', label: '420' },
      { key: 'D', label: '480' },
    ],
    correctKey: 'C',
    correctLabel: '420',
    hintFormula: '180 ÷ 6 = 30 halaman/minit · 14 × 30',
  },
  {
    notebookId: 6,
    roomName: 'Makmal Sains',
    difficulty: DifficultyLevel.HARD,
    topic: 'Matematik Tingkatan 1 KSSM · Bab 4.3: Kadaran',
    question:
      'Sebuah kedai roti menggunakan 3.5 kg tepung untuk membuat 50 biji ban. Berapakah jisim tepung yang diperlukan untuk membuat 120 biji ban pada kadar yang sama?',
    options: [
      { key: 'A', label: '7.2 kg' },
      { key: 'B', label: '8.0 kg' },
      { key: 'C', label: '8.4 kg' },
      { key: 'D', label: '9.2 kg' },
    ],
    correctKey: 'C',
    correctLabel: '8.4 kg',
    hintFormula: '(3.5 ÷ 50) × 120 = 0.07 × 120',
  },
  {
    notebookId: 7,
    roomName: 'Makmal Komputer',
    difficulty: DifficultyLevel.HARD,
    topic: 'Matematik Tingkatan 1 KSSM · Bab 4.3: Kadaran',
    question:
      'Sebuah kereta menggunakan 12 liter petrol untuk bergerak sejauh 150 km. Berapa liter petrol yang diperlukan untuk bergerak sejauh 275 km pada kadar yang sama?',
    options: [
      { key: 'A', label: '18 liter' },
      { key: 'B', label: '20 liter' },
      { key: 'C', label: '22 liter' },
      { key: 'D', label: '24 liter' },
    ],
    correctKey: 'C',
    correctLabel: '22 liter',
    hintFormula: '(12 ÷ 150) × 275 = 0.08 × 275',
  },
]);

export function getQuestionByNotebookId(notebookId: number): NotebookQuestion {
  const found = QUESTION_DATABASE.find((q) => q.notebookId === notebookId);
  if (!found) {
    throw new Error(`ID buku nota tidak sah: ${notebookId}`);
  }
  return found;
}

export function validateNotebookAnswer(notebookId: number, selectedKey: AnswerChoiceKey): boolean {
  const question = getQuestionByNotebookId(notebookId);
  return question.correctKey === selectedKey;
}
