// ============================================================================
// VERIFICATION SCRIPT 1: QUESTION GRADING & EXACT EMILY QUESTION
// ============================================================================

import assert from 'node:assert/strict';

function normalizeQuestionOptions(rawOptions) {
  if (!rawOptions) return [];

  let optionsArray = [];
  if (Array.isArray(rawOptions)) {
    optionsArray = rawOptions;
  } else if (typeof rawOptions === 'object' && rawOptions !== null) {
    if (Array.isArray(rawOptions.options)) {
      optionsArray = rawOptions.options;
    } else {
      optionsArray = Object.entries(rawOptions).map(([key, val]) => {
        if (typeof val === 'string') return { id: key, text: val };
        if (typeof val === 'object' && val !== null) return { id: key, ...val };
        return { id: key, text: String(val) };
      });
    }
  }

  return optionsArray.map((opt, index) => {
    const defaultLetter = String.fromCharCode(65 + index);

    if (typeof opt === 'string') {
      const trimmed = opt.trim();
      const prefixMatch = trimmed.match(/^([A-Z0-9])[\.\)\:\-]\s*(.*)$/i);
      if (prefixMatch) {
        return {
          id: prefixMatch[1].toUpperCase(),
          text: prefixMatch[2].trim() || trimmed
        };
      }
      return {
        id: defaultLetter,
        text: trimmed
      };
    }

    if (typeof opt === 'object' && opt !== null) {
      const id = String(opt.id || opt.key || defaultLetter).trim().toUpperCase();
      const text = String(opt.text || opt.label || opt.value || '').trim();
      return { id, text };
    }

    return {
      id: defaultLetter,
      text: String(opt).trim()
    };
  });
}

function resolveCorrectOption(question) {
  const normalized = normalizeQuestionOptions(question.options);
  if (normalized.length === 0) return null;

  const rawCorrect = String(question.correct_answer ?? '').trim();
  if (!rawCorrect) return null;

  const rawLower = rawCorrect.toLowerCase();

  // 1. Match by option ID
  for (let idx = 0; idx < normalized.length; idx++) {
    const opt = normalized[idx];
    if (opt.id.toLowerCase() === rawLower) {
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: idx };
    }
  }

  // 2. Match by option text
  for (let idx = 0; idx < normalized.length; idx++) {
    const opt = normalized[idx];
    if (opt.text.toLowerCase() === rawLower) {
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: idx };
    }
  }

  // 3. Match 'Option A', 'Option B'
  const optionWordMatch = rawLower.match(/^option\s+([a-z0-9])$/i);
  if (optionWordMatch) {
    const letter = optionWordMatch[1].toUpperCase();
    const foundIdx = normalized.findIndex(o => o.id === letter);
    if (foundIdx !== -1) {
      const opt = normalized[foundIdx];
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: foundIdx };
    }
  }

  // 4. Match 'B) Sophie'
  const prefixMatch = rawCorrect.match(/^([a-z0-9])[\.\)\:\-]\s*(.*)$/i);
  if (prefixMatch) {
    const letter = prefixMatch[1].toUpperCase();
    const textPart = prefixMatch[2].trim().toLowerCase();
    const foundIdx = normalized.findIndex(o => o.id === letter || (textPart && o.text.toLowerCase() === textPart));
    if (foundIdx !== -1) {
      const opt = normalized[foundIdx];
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: foundIdx };
    }
  }

  // 5. Numeric index
  const num = parseInt(rawCorrect, 10);
  if (!isNaN(num)) {
    if (num >= 0 && num < normalized.length) {
      const opt = normalized[num];
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: num };
    }
    if (num >= 1 && num <= normalized.length) {
      const opt = normalized[num - 1];
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: num - 1 };
    }
  }

  return { id: normalized[0].id, text: normalized[0].text, display: `${normalized[0].id}) ${normalized[0].text}`, index: 0 };
}

function isOptionMatchingStudentAnswer(option, studentAnswer) {
  if (studentAnswer == null) return false;

  if (typeof studentAnswer === 'object') {
    if (studentAnswer.id && String(studentAnswer.id).trim().toUpperCase() === option.id) return true;
    if (studentAnswer.text && String(studentAnswer.text).trim().toLowerCase() === option.text.toLowerCase()) return true;
  }

  const ansStr = String(studentAnswer).trim();
  if (!ansStr) return false;

  if (ansStr.toUpperCase() === option.id) return true;
  if (ansStr.toLowerCase() === option.text.toLowerCase()) return true;

  const prefixMatch = ansStr.match(/^([a-z0-9])[\.\)\:\-]\s*(.*)$/i);
  if (prefixMatch) {
    if (prefixMatch[1].toUpperCase() === option.id) return true;
    if (prefixMatch[2].trim().toLowerCase() === option.text.toLowerCase()) return true;
  }

  return false;
}

function cleanTextForComparison(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function evaluateQuestionAnswer(question, studentAnswer) {
  const maxScore = typeof question.points === 'number' ? question.points : 10;
  const qType = (question.question_type || 'multiple_choice').toLowerCase();
  const explanation = question.explanation || '';

  if (qType === 'multiple_choice') {
    const resolved = resolveCorrectOption(question);
    if (!resolved) {
      return { isCorrect: false, score: 0, maxScore, feedback: 'No correct answer specified.' };
    }

    const matched = isOptionMatchingStudentAnswer(resolved, studentAnswer);
    const feedback = matched
      ? (explanation ? `Correct! ${explanation}` : 'Correct answer!')
      : `The correct answer is: ${resolved.display}. ${explanation}`.trim();

    return {
      isCorrect: matched,
      score: matched ? maxScore : 0,
      maxScore,
      feedback,
      correctOption: resolved
    };
  }

  if (qType === 'true_false' || qType === 'yes_no') {
    const rawCorrect = String(question.correct_answer ?? '').trim().toLowerCase();
    const rawStudent = String(studentAnswer ?? '').trim().toLowerCase();
    const isTrueFormat = rawCorrect === 'true' || rawCorrect === 'yes' || rawCorrect === 't' || rawCorrect === 'y';
    const isStudentTrue = rawStudent === 'true' || rawStudent === 'yes' || rawStudent === 't' || rawStudent === 'y';
    const isCorrect = isTrueFormat === isStudentTrue;

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      feedback: isCorrect ? 'Correct!' : `The correct answer is: ${question.correct_answer}. ${explanation}`.trim()
    };
  }

  if (qType === 'wh_question' || qType === 'comprehension') {
    const studentStr = String(studentAnswer || '').trim();
    const cleanStudent = cleanTextForComparison(studentStr);
    const cleanExpected = cleanTextForComparison(String(question.correct_answer || question.expected_answer || ''));
    const acceptableList = [
      cleanExpected,
      ...(Array.isArray(question.acceptable_answers) ? question.acceptable_answers.map(cleanTextForComparison) : [])
    ].filter(Boolean);

    const exactMatch = acceptableList.some(acc => cleanStudent === acc);
    const containsExpected = cleanExpected.length > 2 && cleanStudent.includes(cleanExpected);

    if (exactMatch || containsExpected) {
      return { isCorrect: true, score: maxScore, maxScore, feedback: 'Correct!' };
    }
    return { isCorrect: false, score: 0, maxScore, feedback: `Expected: "${question.correct_answer || question.expected_answer}".` };
  }

  const isDefaultMatch = cleanTextForComparison(String(studentAnswer || '')) === cleanTextForComparison(String(question.correct_answer || ''));
  return {
    isCorrect: isDefaultMatch,
    score: isDefaultMatch ? maxScore : 0,
    maxScore,
    feedback: isDefaultMatch ? 'Correct!' : `Expected: "${question.correct_answer}".`
  };
}

// ----------------------------------------------------------------------------
// TEST SUITE EXECUTION
// ----------------------------------------------------------------------------
console.log('🧪 Starting Question Grading & Emily Question Test Suite...\n');

// 1. EXACT EMILY QUESTION TEST
console.log('--- TEST 1: The Exact Emily Question ---');
const emilyQuestion = {
  question_text: "Who is Emily's best friend?",
  question_type: 'multiple_choice',
  options: ['Tom', 'Sophie', 'Sarah', 'Anna'],
  correct_answer: 'B',
  explanation: 'Emily mentions that her best friend is Sophie.',
  points: 10
};

// Option B (Sophie) -> MUST BE CORRECT
const evalB = evaluateQuestionAnswer(emilyQuestion, 'B');
console.log('Selecting "B":', evalB);
assert.equal(evalB.isCorrect, true, 'Selecting B must be correct');
assert.equal(evalB.score, 10, 'Selecting B must award 10 points');
assert.match(evalB.feedback, /Correct/, 'Feedback must confirm correct');

// Selecting "Sophie" directly -> MUST BE CORRECT
const evalSophie = evaluateQuestionAnswer(emilyQuestion, 'Sophie');
assert.equal(evalSophie.isCorrect, true, 'Selecting text "Sophie" must be correct');
assert.equal(evalSophie.score, 10, 'Selecting text "Sophie" must award 10 points');

// Selecting "B) Sophie" -> MUST BE CORRECT
const evalPrefix = evaluateQuestionAnswer(emilyQuestion, 'B) Sophie');
assert.equal(evalPrefix.isCorrect, true, 'Selecting "B) Sophie" must be correct');

// Option A (Tom) -> MUST BE INCORRECT
const evalA = evaluateQuestionAnswer(emilyQuestion, 'A');
console.log('Selecting "A":', evalA);
assert.equal(evalA.isCorrect, false, 'Selecting A must be incorrect');
assert.equal(evalA.score, 0, 'Selecting A must award 0 points');
assert.match(evalA.feedback, /The correct answer is: B\) Sophie/, 'Feedback must state correct answer is B) Sophie');

// Option C (Sarah) -> MUST BE INCORRECT
const evalC = evaluateQuestionAnswer(emilyQuestion, 'C');
assert.equal(evalC.isCorrect, false, 'Selecting C must be incorrect');
assert.equal(evalC.score, 0);

// Option D (Anna) -> MUST BE INCORRECT
const evalD = evaluateQuestionAnswer(emilyQuestion, 'D');
assert.equal(evalD.isCorrect, false, 'Selecting D must be incorrect');
assert.equal(evalD.score, 0);

console.log('✅ TEST 1 PASSED: Exact Emily question grades with 100% accuracy!\n');

// 2. BACKWARD COMPATIBILITY TEST
console.log('--- TEST 2: Backward Compatibility Variations ---');

// Case 2a: correct_answer stored as full text "Sophie"
const emilyTextCorrect = {
  ...emilyQuestion,
  correct_answer: 'Sophie'
};
assert.equal(evaluateQuestionAnswer(emilyTextCorrect, 'B').isCorrect, true);
assert.equal(evaluateQuestionAnswer(emilyTextCorrect, 'Sophie').isCorrect, true);
assert.equal(evaluateQuestionAnswer(emilyTextCorrect, 'A').isCorrect, false);
console.log('✅ Case 2a: correct_answer as text "Sophie" passes');

// Case 2b: correct_answer stored as "Option B"
const emilyOptionWord = {
  ...emilyQuestion,
  correct_answer: 'Option B'
};
assert.equal(evaluateQuestionAnswer(emilyOptionWord, 'B').isCorrect, true);
assert.equal(evaluateQuestionAnswer(emilyOptionWord, 'A').isCorrect, false);
console.log('✅ Case 2b: correct_answer as "Option B" passes');

// Case 2c: options stored as structured objects [{ id: 'A', text: 'Tom' }, ...]
const emilyStructured = {
  question_text: "Who is Emily's best friend?",
  question_type: 'multiple_choice',
  options: [
    { id: 'A', text: 'Tom' },
    { id: 'B', text: 'Sophie' },
    { id: 'C', text: 'Sarah' },
    { id: 'D', text: 'Anna' }
  ],
  correct_answer: 'B',
  points: 10
};
assert.equal(evaluateQuestionAnswer(emilyStructured, 'B').isCorrect, true);
assert.equal(evaluateQuestionAnswer(emilyStructured, 'Sophie').isCorrect, true);
assert.equal(evaluateQuestionAnswer(emilyStructured, 'A').isCorrect, false);
console.log('✅ Case 2c: structured options [{ id, text }] passes');

// Case 2d: Old 0-based index "1"
const emilyNumericIndex = {
  ...emilyQuestion,
  correct_answer: '1'
};
assert.equal(evaluateQuestionAnswer(emilyNumericIndex, 'B').isCorrect, true);
console.log('✅ Case 2d: 0-based numeric index "1" passes');

// 3. OTHER QUESTION TYPES
console.log('\n--- TEST 3: Other Question Types ---');
const tfQuestion = {
  question_text: 'Emily has a dog named Buddy.',
  question_type: 'true_false',
  correct_answer: 'True',
  points: 10
};
assert.equal(evaluateQuestionAnswer(tfQuestion, 'True').isCorrect, true);
assert.equal(evaluateQuestionAnswer(tfQuestion, 'False').isCorrect, false);
console.log('✅ True/False evaluation passes');

const fillQuestion = {
  question_text: 'Emily lives in _____.',
  question_type: 'fill_blank',
  correct_answer: 'London',
  points: 10
};
assert.equal(evaluateQuestionAnswer(fillQuestion, 'london').isCorrect, true);
assert.equal(evaluateQuestionAnswer(fillQuestion, 'Paris').isCorrect, false);
console.log('✅ Fill in the Blank evaluation passes');

console.log('\n🎉 ALL QUESTION GRADING TESTS PASSED SUCCESSFULLY!');
