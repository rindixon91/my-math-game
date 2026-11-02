import React, { useState, useEffect } from 'react';
import { ControlMode } from '../game/inputPlatform';
import {
  AnswerChoiceKey,
  DifficultyLevel,
  getDifficultyLabel,
  getQuestionByNotebookId,
} from '../game/QuestionDatabase';

interface NotebookInterfaceProps {
  notebookId: number;
  controlMode: ControlMode;
  onSubmitAnswer: (notebookId: number, selectedKey: AnswerChoiceKey) => boolean;
}

export const NotebookInterface: React.FC<NotebookInterfaceProps> = ({
  notebookId,
  controlMode,
  onSubmitAnswer,
}) => {
  const questionData = getQuestionByNotebookId(notebookId);
  const [selectedChoice, setSelectedChoice] = useState<AnswerChoiceKey | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const isTouch = controlMode === 'touch';

  useEffect(() => {
    setSelectedChoice(null);
    setFeedback(null);
  }, [notebookId]);

  const handleChoose = (key: AnswerChoiceKey) => {
    if (feedback !== null) return;
    setSelectedChoice(key);
    const isCorrect = key === questionData.correctKey;
    setFeedback(isCorrect ? 'correct' : 'wrong');

    // Display immediate feedback briefly, then commit answer to GameScene/GameState
    window.setTimeout(() => {
      onSubmitAnswer(notebookId, key);
    }, 620);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (feedback !== null) return;
      const map: Record<string, AnswerChoiceKey> = {
        KeyA: 'A',
        Digit1: 'A',
        KeyB: 'B',
        Digit2: 'B',
        KeyC: 'C',
        Digit3: 'C',
        KeyD: 'D',
        Digit4: 'D',
      };
      const picked = map[e.code];
      if (picked) {
        e.preventDefault();
        handleChoose(picked);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const diffColor =
    questionData.difficulty === DifficultyLevel.EASY
      ? 'text-emerald-800'
      : questionData.difficulty === DifficultyLevel.MEDIUM
      ? 'text-amber-800'
      : 'text-red-800';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-label={`Soalan Buku Nota ${questionData.notebookId}`}
    >
      <div className="notebook-paper w-full max-w-xl max-h-[94vh] overflow-y-auto rounded-xl p-4 sm:p-6 md:p-8 [@media(max-height:500px)]:p-3.5 text-slate-900">
        {/* Header Metadata (Unboxed clean typography per anti-slop rules) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-800 pb-2.5 mb-3.5 [@media(max-height:500px)]:pb-2 [@media(max-height:500px)]:mb-2.5">
          <div>
            <div className="text-xs font-semibold text-slate-600">
              <span>{questionData.topic}</span>
              <span aria-hidden="true"> · </span>
              <span>{questionData.roomName}</span>
            </div>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl md:text-3xl [@media(max-height:500px)]:text-lg text-slate-900 mt-0.5">
              BUKU NOTA {questionData.notebookId}
            </h2>
          </div>

          <div className={`font-mono-tabular font-bold text-xs sm:text-sm tracking-wider ${diffColor}`}>
            TAHAP: {getDifficultyLabel(questionData.difficulty)}
          </div>
        </div>

        {/* Question Prompt */}
        <p className="text-base sm:text-lg md:text-xl [@media(max-height:500px)]:text-sm font-bold text-slate-900 leading-snug mb-4 sm:mb-6 [@media(max-height:500px)]:mb-3">
          {questionData.question}
        </p>

        {/* Four Answer Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 [@media(max-height:500px)]:gap-2">
          {questionData.options.map((opt) => {
            const isPicked = selectedChoice === opt.key;
            let btnStyle =
              'bg-white hover:bg-amber-50 border-slate-800 text-slate-900';
            if (isPicked && feedback === 'correct') {
              btnStyle = 'bg-emerald-600 border-emerald-900 text-white';
            } else if (isPicked && feedback === 'wrong') {
              btnStyle = 'bg-red-600 border-red-900 text-white';
            }

            return (
              <button
                key={opt.key}
                type="button"
                disabled={feedback !== null}
                onClick={() => handleChoose(opt.key)}
                className={`min-h-[44px] flex items-center gap-3 px-4 py-3 [@media(max-height:500px)]:py-2 rounded-lg border-2 font-bold text-left text-sm sm:text-base shadow-sm transition-transform active:translate-y-0.5 cursor-pointer touch-manipulation ${btnStyle}`}
              >
                <span className="font-mono-tabular font-extrabold text-base sm:text-lg">
                  {opt.key}.
                </span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Immediate Feedback Area */}
        <div className="mt-4 [@media(max-height:500px)]:mt-2.5 min-h-[28px] flex items-center justify-between text-xs sm:text-sm font-bold">
          {feedback === 'correct' && (
            <span className="text-emerald-700 font-display text-sm sm:text-base">
              Jawapan Betul! Syabas — Buku Nota {questionData.notebookId} berjaya diselesaikan!
            </span>
          )}
          {feedback === 'wrong' && (
            <span className="text-red-700 font-display text-sm sm:text-base">
              Jawapan Salah! Buku Nota dikunci selama 10 saat — Baldi semakin pantas!
            </span>
          )}
          {feedback === null && (
            <span className="text-slate-600 font-normal text-xs">
              {isTouch
                ? 'Ketik A, B, C atau D untuk menghantar jawapan kamu.'
                : 'Pilih A, B, C atau D (atau tekan kekunci A–D).'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
