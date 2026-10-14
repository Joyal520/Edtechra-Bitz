// ============================================================================
// EDTECHRA STANDARD EXAM 2.0: DETERMINISTIC OBJECTIVE GRADING ENGINE
// Every question in Standard Exam is objectively gradable.
// Total Marks: 100 across 40 questions (Section A-G).
// ============================================================================

export interface StandardQuestionGradingResult {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  submittedAnswerDisplay: string;
  correctAnswerDisplay: string;
  feedback?: string;
}

/**
 * Normalizes text for deterministic comparison: lowercase, trim, remove external punctuation.
 */
export function normalizeText(text: any): string {
  if (text == null) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’“”]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Grades an individual Standard Exam question deterministically.
 */
export function gradeStandardQuestion(
  question: any,
  studentAnswer: any
): StandardQuestionGradingResult {
  const maxScore = Number(question.marks) || 2;
  const qType = (question.type || question.standardType || '').toLowerCase();

  // 1. SECTION A — MCQ (2 marks)
  if (qType === 'mcq' || qType === 'multiple_choice') {
    const rawCorrect = question.correctAnswer || question.correct_answer || (question.options?.[0]?.text);
    const correctStr = String(Array.isArray(rawCorrect) ? rawCorrect[0] : rawCorrect || '').trim().toLowerCase();
    const studentStr = String(studentAnswer || '').trim().toLowerCase();

    let isCorrect = studentStr === correctStr && studentStr !== '';

    // Check if options array matches option id or option text
    if (!isCorrect && Array.isArray(question.options)) {
      const studentOpt = question.options.find(
        (o: any) =>
          (typeof o === 'string' && o.toLowerCase() === studentStr) ||
          (o.id && o.id.toLowerCase() === studentStr) ||
          (o.text && o.text.toLowerCase() === studentStr)
      );
      const correctOpt = question.options.find(
        (o: any) =>
          (typeof o === 'string' && o.toLowerCase() === correctStr) ||
          (o.id && o.id.toLowerCase() === correctStr) ||
          (o.text && o.text.toLowerCase() === correctStr)
      );

      if (studentOpt && correctOpt) {
        const studentText = (studentOpt.text || studentOpt).toLowerCase();
        const correctText = (correctOpt.text || correctOpt).toLowerCase();
        if (studentText === correctText) isCorrect = true;
      }
    }

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      submittedAnswerDisplay: studentAnswer ? String(studentAnswer) : '(Unanswered)',
      correctAnswerDisplay: String(Array.isArray(rawCorrect) ? rawCorrect.join(', ') : rawCorrect || ''),
      feedback: isCorrect ? 'Correct!' : question.explanation || 'Incorrect choice.'
    };
  }

  // 2. SECTION B — MATCHING (2 marks)
  if (qType === 'matching') {
    let isCorrect = false;
    const leftTerm = question.left || question.pair?.left;
    const rightTerm = question.right || question.pair?.right;

    if (rightTerm && studentAnswer) {
      if (typeof studentAnswer === 'string') {
        isCorrect = normalizeText(studentAnswer) === normalizeText(rightTerm);
      } else if (typeof studentAnswer === 'object' && leftTerm) {
        isCorrect = normalizeText(studentAnswer[leftTerm]) === normalizeText(rightTerm);
      }
    } else if (Array.isArray(question.pairs) && typeof studentAnswer === 'object') {
      const totalPairs = question.pairs.length;
      if (totalPairs > 0) {
        const correctPairs = question.pairs.filter(
          (p: any) => normalizeText(studentAnswer[p.left]) === normalizeText(p.right)
        ).length;
        isCorrect = correctPairs === totalPairs;
      }
    }

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      submittedAnswerDisplay: studentAnswer
        ? typeof studentAnswer === 'object'
          ? JSON.stringify(studentAnswer)
          : String(studentAnswer)
        : '(Unpaired)',
      correctAnswerDisplay: rightTerm || 'Matched pairs',
      feedback: isCorrect ? 'Correct pairing!' : question.explanation || 'Pairs did not match.'
    };
  }

  // 3. SECTION C — CORRECT OR WRONG (2 marks)
  if (qType === 'correct_wrong' || qType === 'true_false' || qType === 'binary_choice') {
    const rawCorrect = question.correctAnswer ?? question.correct_answer;
    let normCorrect = 'CORRECT';
    if (rawCorrect === false || String(rawCorrect).toUpperCase() === 'WRONG' || String(rawCorrect).toUpperCase() === 'FALSE') {
      normCorrect = 'WRONG';
    }

    let normStudent = '';
    if (studentAnswer === true || String(studentAnswer).toUpperCase() === 'CORRECT' || String(studentAnswer).toUpperCase() === 'TRUE') {
      normStudent = 'CORRECT';
    } else if (studentAnswer === false || String(studentAnswer).toUpperCase() === 'WRONG' || String(studentAnswer).toUpperCase() === 'FALSE') {
      normStudent = 'WRONG';
    }

    const isCorrect = normStudent !== '' && normStudent === normCorrect;

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      submittedAnswerDisplay: normStudent || '(Unanswered)',
      correctAnswerDisplay: normCorrect,
      feedback: isCorrect ? 'Correct judgment!' : question.explanation || `Statement is ${normCorrect}.`
    };
  }

  // 4. SECTION D — CLOZE PASSAGE (2 marks)
  if (qType === 'cloze' || qType === 'cloze_passage' || qType === 'dropdown') {
    const rawCorrect = question.correctAnswer || question.answer || (question.options?.[0]);
    const correctStr = normalizeText(rawCorrect);
    const studentStr = normalizeText(
      typeof studentAnswer === 'object' && studentAnswer !== null
        ? studentAnswer[question.blankId || question.id] || Object.values(studentAnswer)[0]
        : studentAnswer
    );

    const isCorrect = studentStr !== '' && studentStr === correctStr;

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      submittedAnswerDisplay: studentAnswer ? String(studentAnswer) : '(No selection)',
      correctAnswerDisplay: String(rawCorrect || ''),
      feedback: isCorrect ? 'Correct word!' : question.explanation || `Expected: ${rawCorrect}`
    };
  }

  // 5. SECTION E — FIND THE MISTAKE (3 marks)
  if (qType === 'find_mistake' || qType === 'find_the_mistake' || qType === 'error_token') {
    const targetToken = question.incorrectToken || question.incorrect_token || question.target;
    const targetIndex = question.tokenIndex ?? question.token_index;

    let studentToken = '';
    let studentIdx: number | null = null;

    if (typeof studentAnswer === 'object' && studentAnswer !== null) {
      studentToken = studentAnswer.incorrectToken || studentAnswer.token || '';
      studentIdx = studentAnswer.tokenIndex ?? null;
    } else if (typeof studentAnswer === 'number') {
      studentIdx = studentAnswer;
    } else if (typeof studentAnswer === 'string') {
      studentToken = studentAnswer;
    }

    let isCorrect = false;
    if (targetIndex != null && studentIdx != null) {
      isCorrect = targetIndex === studentIdx;
    }
    if (!isCorrect && targetToken && studentToken) {
      isCorrect = normalizeText(studentToken) === normalizeText(targetToken);
    }

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      submittedAnswerDisplay: studentToken || (studentIdx != null ? `Token #${studentIdx}` : '(None tapped)'),
      correctAnswerDisplay: targetToken ? `"${targetToken}" (Correction: ${question.correction || 'fixed'})` : 'Target token',
      feedback: isCorrect ? 'Mistake successfully identified!' : question.explanation || `The mistake was "${targetToken}".`
    };
  }

  // 6. SECTION F — CONTROLLED TYPE THE ANSWER (3 marks)
  if (qType === 'controlled_answer' || qType === 'controlled_type_answer' || qType === 'fill_in_blank') {
    const normStudent = normalizeText(studentAnswer);
    const accepted: string[] = [];

    if (Array.isArray(question.acceptedAnswers)) {
      question.acceptedAnswers.forEach((a: any) => accepted.push(normalizeText(a)));
    }
    if (Array.isArray(question.accepted_answers)) {
      question.accepted_answers.forEach((a: any) => accepted.push(normalizeText(a)));
    }
    if (question.answer) {
      accepted.push(normalizeText(question.answer));
    }
    if (question.correctAnswer) {
      accepted.push(normalizeText(question.correctAnswer));
    }

    const isCorrect = normStudent !== '' && accepted.includes(normStudent);

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      submittedAnswerDisplay: studentAnswer ? String(studentAnswer) : '(Empty)',
      correctAnswerDisplay: question.answer || question.correctAnswer || accepted[0] || '',
      feedback: isCorrect ? 'Correct!' : question.explanation || `Accepted: ${accepted.join(' / ')}`
    };
  }

  // 7. SECTION G — REORDER THE SENTENCE (4 marks)
  if (qType === 'reorder' || qType === 'sentence_builder' || qType === 'reorder_sentence') {
    const targetOrder: string[] = Array.isArray(question.correctOrder)
      ? question.correctOrder
      : Array.isArray(question.correct_order)
      ? question.correct_order
      : typeof question.targetSentence === 'string'
      ? question.targetSentence.trim().split(/\s+/)
      : [];

    const studentOrder: string[] = Array.isArray(studentAnswer)
      ? studentAnswer
      : typeof studentAnswer === 'string'
      ? studentAnswer.trim().split(/\s+/)
      : [];

    const targetJoined = targetOrder.map(normalizeText).join(' ').trim();
    const studentJoined = studentOrder.map(normalizeText).join(' ').trim();

    const isCorrect = studentJoined !== '' && targetJoined !== '' && studentJoined === targetJoined;

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      submittedAnswerDisplay: studentOrder.length > 0 ? studentOrder.join(' ') : '(Not reordered)',
      correctAnswerDisplay: targetOrder.join(' '),
      feedback: isCorrect ? 'Correct sentence built!' : question.explanation || 'Sentence order was incorrect.'
    };
  }

  // Fallback
  const isFilled = studentAnswer !== undefined && studentAnswer !== null && String(studentAnswer).trim().length > 0;
  return {
    isCorrect: isFilled,
    score: isFilled ? maxScore : 0,
    maxScore,
    submittedAnswerDisplay: studentAnswer ? String(studentAnswer) : '(Unanswered)',
    correctAnswerDisplay: String(question.correctAnswer || ''),
    feedback: ''
  };
}

/**
 * Evaluates the entire standard examination submission against questions and returns total score / percentage.
 */
export function calculateStandardExamScore(
  questions: any[],
  studentAnswers: Record<string, any>
): {
  totalScore: number;
  maxScore: number;
  percentage: number;
  questionResults: Record<string, StandardQuestionGradingResult>;
} {
  let totalScore = 0;
  let maxScore = 0;
  const questionResults: Record<string, StandardQuestionGradingResult> = {};

  questions.forEach((qItem) => {
    const q = qItem.question || qItem;
    const qId = q.id;
    const ans = studentAnswers[qId];
    const res = gradeStandardQuestion(q, ans);
    totalScore += res.score;
    maxScore += res.maxScore;
    questionResults[qId] = res;
  });

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    totalScore,
    maxScore,
    percentage,
    questionResults
  };
}

