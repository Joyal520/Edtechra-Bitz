const questionTypes = [
  "Multiple Choice Questions (MCQ)",
  "Fill In The Blanks",
  "Cloze Passage Questions",
  "Matching Questions",
  "True or False Questions",
  "Reorder the Sentence Questions",
  "Short Answer Questions",
  "Reading Comprehension Questions",
  "Essay Type Questions"
];

const questionTypeTemplates = [
  {
    type: "Multiple Choice Questions (MCQ)",
    desc: "Single correct answer from 4 options",
    path: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4"
  },
  {
    type: "Fill In The Blanks",
    desc: "Complete sentence with missing terms",
    path: "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
  },
  {
    type: "Cloze Passage Questions",
    desc: "Fill blanks in a contextual paragraph",
    path: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
  },
  {
    type: "Matching Questions",
    desc: "Match related pairs from two columns",
    path: "M7 16V4m0 0L3 8m4-4l4 4m6 8V4m0 12l-4-4m4 4l4-4"
  },
  {
    type: "True or False Questions",
    desc: "Evaluate statements as true or false",
    path: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
  },
  {
    type: "Reorder the Sentence Questions",
    desc: "Rearrange scrambled words into order",
    path: "M8 9l4-4 4 4m0 6l-4 4-4-4"
  },
  {
    type: "Short Answer Questions",
    desc: "Concise, conceptual direct answers",
    path: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
  },
  {
    type: "Reading Comprehension Questions",
    desc: "Answer questions based on a passage",
    path: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  },
  {
    type: "Essay Type Questions",
    desc: "In-depth explanations and arguments",
    path: "M4 6h16M4 12h16M4 18h7"
  }
];

const examTypes = ["Admission Test", "Unit Test", "Mid-Term Exam", "Final Exam", "Competitive Exam", "Practice Test"];
const difficulties = ["Easy", "Medium", "Hard", "Mixed"];
const gradingModes = ["Auto Grading", "Teacher Review", "Hybrid Grading"];

const state = {
  activeStage: "setup",
  content: "",
  uploadedFileName: "",
  examType: "Unit Test",
  difficulty: "Mixed",
  duration: { value: 60, unit: "Minutes" },
  gradingMode: "Hybrid Grading",
  requiredTotal: 100,
  sections: [],
  generatedExam: null,
  approved: false,
  loading: false,
  previewMode: "teacher",
  selectedQuestion: null,
  publish: {
    classroom: "Grade 8 English",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    duration: "60 Minutes",
    durationSelect: "60 Minutes",
    durationValue: 60,
    durationUnit: "Minutes",
    late: false,
    marksImmediately: true,
    answersAfterExam: true,
    leaderboard: true,
    randomizeQuestions: true,
    randomizeOptions: true,
    maxAttempts: 1,
    password: ""
  },
  toast: "",
  reorderSelections: {},
  results: {
    loading: false,
    data: null,
    reportPdfUrl: ""
  }
};

const app = document.querySelector("#app");
let studentTimerInterval = null;
render();

function render() {
  // Save focus
  let activeSelector = null;
  let cursorStart = null;
  let cursorEnd = null;
  
  if (document.activeElement && document.activeElement.tagName !== "BODY") {
    const el = document.activeElement;
    if (el.id) {
      activeSelector = `#${el.id}`;
    } else if (el.dataset.bind) {
      activeSelector = `[data-bind="${el.dataset.bind}"]`;
    } else if (el.dataset.section && el.dataset.field) {
      activeSelector = `[data-section="${el.dataset.section}"][data-field="${el.dataset.field}"]`;
    } else if (el.dataset.question && el.dataset.qfield) {
      activeSelector = `[data-question="${el.dataset.question}"][data-qfield="${el.dataset.qfield}"]`;
    }
    
    try {
      cursorStart = el.selectionStart;
      cursorEnd = el.selectionEnd;
    } catch (e) {}
  }

  const totalMarks = getTotalMarks();
  const canGenerate = isGenerateReady();
  app.innerHTML = `
    <div class="shell">
      <aside class="nav">
        <div class="brand"><img src="/assets/logo%20dark.png" alt="Edtechra Logo" class="brand-logo" /></div>
        ${navButton("setup", "Setup", "M4 7h16M4 12h16M4 17h16")}
        ${navButton("structure", "Structure", "M6 4h12v16H6zM10 8h4M10 12h4M10 16h4")}
        ${navButton("review", "Review", "M5 13l4 4L19 7")}
        ${navButton("publish", "Publish", "M4 12l16-8-4 16-4-7-8-1z")}
        ${navButton("results", "Results", "M6 20V10M12 20V4M18 20v-7")}
      </aside>

      <main class="workspace">
        <header class="topbar">
          <div>
            <h1>AI Exam Engine</h1>
            <p>Generate, review, approve, publish, and grade examinations from teacher content.</p>
          </div>
          <div class="top-actions">
            <span class="status-dot"></span><span>Autosaved draft</span>
            <button class="icon-button" title="Save exam" data-action="save">${icon("M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l3 3v13a2 2 0 0 1-2 2zM7 3v6h10M7 21v-8h10v8")}</button>
            <div class="avatar">TR</div>
          </div>
        </header>

        <section class="stage-strip" aria-label="Exam creation stages">
          ${stageButton("setup", "1", "Exam Setup")}
          ${stageButton("structure", "2", "Question Structure")}
          ${stageButton("review", "3", "AI Review")}
          ${stageButton("publish", "4", "Publishing")}
          ${stageButton("results", "5", "Results")}
        </section>

        <div class="content-grid">
          <div class="main-panel">
            ${state.activeStage === "setup" ? renderSetup() : ""}
            ${state.activeStage === "structure" ? renderStructure(totalMarks, canGenerate) : ""}
            ${state.activeStage === "review" ? renderReview() : ""}
            ${state.activeStage === "publish" ? renderPublish() : ""}
            ${state.activeStage === "results" ? renderResults() : ""}
          </div>
        </div>
      </main>
    </div>
    ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
    ${state.loading ? `
      <div class="loading-overlay">
        <div class="loading-spinner-wrap">
          <div class="loading-spinner"></div>
          <p class="loading-text">AI generating your exam...</p>
          <p class="loading-subtext">Structuring questions, generating options, and preparing answer keys.</p>
        </div>
      </div>
    ` : ""}
  `;
  bindEvents();
  setTimeout(drawMatchingLines, 50);

  if (state.activeStage === "review" && state.previewMode === "student" && state.generatedExam) {
    setTimeout(startStudentTimer, 50);
  } else {
    if (studentTimerInterval) {
      clearInterval(studentTimerInterval);
      studentTimerInterval = null;
    }
    state.studentTimeRemaining = null;
  }

  // Restore focus
  if (activeSelector) {
    const el = document.querySelector(activeSelector);
    if (el) {
      el.focus();
      try {
        if (cursorStart !== null && cursorEnd !== null) {
          el.setSelectionRange(cursorStart, cursorEnd);
        }
      } catch (e) {}
    }
  }
}

function renderSetup() {
  const isReady = isSetupReady();
  return `
    <section class="section-head text-center">
      <h2>Exam Setup</h2>
    </section>
    <div class="form-grid">
      <div class="field">
        <span>Paste topic, paragraph, passage, or lesson notes</span>
        <textarea data-bind="content" rows="10" placeholder="Start with lesson content, exam intent, timing, and grading policy.">${escapeHtml(state.content)}</textarea>
      </div>
      <div class="field">
        <span>Upload source file</span>
        <label class="upload">
          <input type="file" accept=".txt,.pdf,.docx" data-action="file" />
          ${icon("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 5v12")}
          <strong>Upload source file</strong>
          <span>PDF, DOCX, or TXT. TXT is extracted locally; PDF/DOCX are queued for server extraction in production.</span>
          ${state.uploadedFileName ? `<em>${escapeHtml(state.uploadedFileName)}</em>` : ""}
        </label>
      </div>
      <label class="field">
        <span>Exam type</span>
        <select data-bind="examType">${options(examTypes, state.examType)}</select>
      </label>
      <label class="field">
        <span>Duration</span>
        <div class="inline">
          <input type="number" min="1" data-bind="duration.value" value="${state.duration.value}" />
          <select data-bind="duration.unit">${options(["Minutes", "Hours"], state.duration.unit)}</select>
        </div>
      </label>
      <fieldset class="segmented wide">
        <legend>Difficulty level</legend>
        ${difficulties.map((item) => segment("difficulty", item, state.difficulty)).join("")}
      </fieldset>
      <fieldset class="segmented wide">
        <legend>Grading mode</legend>
        ${gradingModes.map((item) => segment("gradingMode", item, state.gradingMode)).join("")}
      </fieldset>
    </div>
    <div class="setup-actions" style="display: flex; justify-content: flex-end; margin-top: 24px; border-top: 1px solid rgba(79, 70, 229, 0.08); padding-top: 20px;">
      <button class="primary" data-action="next-stage" ${isReady ? "" : "disabled"}>Next</button>
    </div>
  `;
}

function getDefaultInstruction(type, count) {
  const countStr = count === 1 ? "1 question" : `${count} questions`;
  switch (type) {
    case "Multiple Choice Questions (MCQ)":
      return `Choose the correct answer for the ${countStr}.`;
    case "Fill In The Blanks":
      return `Fill in the blanks with the most appropriate words for the ${countStr}.`;
    case "Cloze Passage Questions":
      return `Complete the passage by filling in the blanks for the ${countStr}.`;
    case "Matching Questions":
      return `Match the items in Column A with Column B for the ${countStr}.`;
    case "True or False Questions":
      return `Identify whether the statements are True or False for the ${countStr}.`;
    case "Reorder the Sentence Questions":
      return `Rearrange the words to form correct sentences for the ${countStr}.`;
    case "Short Answer Questions":
      return `Provide brief and precise answers for the ${countStr}.`;
    case "Reading Comprehension Questions":
      return `Read the passage carefully and answer the ${countStr} that follow.`;
    case "Essay Type Questions":
      return `Write detailed essays for the ${countStr} below.`;
    default:
      return `Answer the ${countStr}.`;
  }
}

function renderSectionCard(section, index, totalSections) {
  const isFirst = index === 0;
  const isLast = index === totalSections - 1;
  const isReadingComprehension = section.type === "Reading Comprehension Questions";
  return `
    <div class="section-item-card" data-id="${section.id}">
      <div class="section-drag-controls">
        <button class="section-drag-btn" data-action="move-section-up" data-id="${section.id}" title="Move up" ${isFirst ? "disabled" : ""}>
          ${icon("M18 15l-6-6-6 6")}
        </button>
        <button class="section-drag-btn" data-action="move-section-down" data-id="${section.id}" title="Move down" ${isLast ? "disabled" : ""}>
          ${icon("M6 9l6 6 6-6")}
        </button>
      </div>
      <div class="section-main-fields">
        <div class="section-header-info">
          <span class="section-type-badge">${escapeHtml(section.type)}</span>
          <button class="icon-button danger" title="Delete section" data-action="delete-section" data-id="${section.id}">
            ${icon("M3 6h18M8 6V4h8v2m-9 0 1 16h8l1-16")}
          </button>
        </div>
        <div class="section-fields-row">
          <label>
            <span>Questions</span>
            <input type="number" min="1" max="100" data-section="${section.id}" data-field="count" value="${section.count}" />
          </label>
          <label>
            <span>Marks Each</span>
            <input type="number" min="1" max="100" data-section="${section.id}" data-field="marks" value="${section.marks}" />
          </label>
          ${isReadingComprehension ? `
          <label>
            <span>Paragraph Length</span>
            <select data-section="${section.id}" data-field="paragraphLength">
              ${options(["Short", "Medium", "Long"], section.paragraphLength || "Medium")}
            </select>
          </label>
          ` : ""}
          <label>
            <span>Difficulty</span>
            <select data-section="${section.id}" data-field="difficulty">
              <option value="">Use global</option>
              ${options(difficulties, section.difficulty)}
            </select>
          </label>
        </div>
        <div class="section-instruction-field">
          <span>Section Instruction</span>
          <input type="text" data-section="${section.id}" data-field="instruction" value="${escapeHtml(section.instruction || "")}" placeholder="e.g. Choose the correct answer." />
        </div>
      </div>
    </div>
  `;
}

function renderStructure(totalMarks, canGenerate) {
  const selectedList = state.sections.length > 0
    ? state.sections.map((section, idx) => renderSectionCard(section, idx, state.sections.length)).join("")
    : `
      <div class="structure-empty">
        ${icon("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2")}
        <p>Your chosen question types will appear here.</p>
        <span>Click question types from the templates panel on the left to add them to your exam.</span>
      </div>
    `;

  const templatesHtml = questionTypeTemplates.map((template) => `
    <button class="question-type-card" data-action="add-section-type" data-type="${escapeHtml(template.type)}">
      ${icon(template.path)}
      <div>
        <strong>${escapeHtml(template.type)}</strong>
        <span>${escapeHtml(template.desc)}</span>
      </div>
    </button>
  `).join("");

  return `
    <section class="section-head">
      <h2>Question Structure Builder</h2>
      <p>Choose question types from the templates panel, then arrange and configure them.</p>
    </section>
    
    <div class="total-bar">
      <div><strong>Current Total Marks</strong><span><span class="current-total">${totalMarks}</span> / <input type="number" min="1" max="1000" data-bind="requiredTotal" value="${state.requiredTotal}" class="total-target-input" /></span></div>
      <meter min="0" max="${state.requiredTotal}" value="${Math.min(totalMarks, state.requiredTotal)}"></meter>
    </div>

    <div class="builder-layout">
      <!-- Left Panel: Choose Question Types -->
      <aside class="picker-panel">
        <h3>Choose your questions</h3>
        <p class="panel-subtitle">Select question types to add them as sections to the exam.</p>
        <div class="picker-grid">
          ${templatesHtml}
        </div>
      </aside>

      <!-- Right Panel: Configure Structure & Order -->
      <section class="structure-panel">
        <div class="structure-list">
          ${selectedList}
        </div>
        
        <div class="command-row">
          <button class="secondary" data-action="balance">Balance to ${state.requiredTotal}</button>
          <button class="primary generate" data-action="generate" ${canGenerate ? "" : "disabled"}>${state.loading ? "Generating..." : "Generate Questions"}</button>
        </div>
        <p class="hint">${canGenerate ? "Ready for AI generation. Teacher approval will still be required." : "Generation unlocks when setup is complete, at least one section exists, and marks equal the required total."}</p>
      </section>
    </div>
  `;
}

function renderReview() {
  if (!state.generatedExam) {
    return emptyState("No generated exam yet", "Build the question structure and generate questions first.", "structure", "Go to Structure");
  }
  const exam = state.generatedExam;
  const isStudent = state.previewMode === "student";
  
  return `
    <section class="section-head row">
      <div><h2>AI Review Panel</h2><p>Edit, duplicate, and approve before publishing.</p></div>
    </section>
    <div class="review-summary">
      <div><strong>${escapeHtml(exam.metadata.title)}</strong><span>${escapeHtml(exam.metadata.duration)} · ${exam.metadata.totalMarks} marks · ${escapeHtml(exam.metadata.difficulty)}</span></div>
      <button class="secondary" data-action="student-preview">${state.previewMode === "student" ? "Teacher View" : "Preview Student View"}</button>
    </div>
    
    ${isStudent ? renderStudentPreview() : renderQuestionList()}
    
    ${!isStudent ? `
      <div class="review-approval-card">
        <h3>Verify and Approve Exam</h3>
        <p>Ensure all questions, marks, and answers match your pedagogical standards before releasing the exam.</p>
        <div style="display: flex; gap: 12px; margin-top: 16px;">
          <button class="primary approve-large-btn" data-action="approve" style="flex: 1;" ${state.approved ? "disabled" : ""}>
            ${state.approved ? `${icon("M5 13l4 4L19 7")} Approved` : "Approve Exam"}
          </button>
          ${state.approved ? `
            <button class="primary" data-action="next-stage" style="flex: 1;">Next</button>
          ` : ""}
        </div>
      </div>
    ` : ""}
  `;
}

function renderClozeSection(section, isStudent) {
  const questions = section.questions || [];
  
  // Build the passage HTML
  const passageHtml = questions.map((question, idx) => {
    let text = question.questionText;
    
    // Clean up any leading Q1., Question 1:, 1. etc.
    text = text.replace(/^(Q\d+\.?|Question\s*\d+:?|\d+\.?)\s*/i, "");
    
    if (!text.includes("__")) {
      text = text + " __";
    }
    
    const options = question.options || [];
    const isTeacher = !isStudent;
    const initialText = isTeacher ? (question.correctAnswer || "________") : "________";
    const isFilledClass = isTeacher && question.correctAnswer ? "filled" : "";
    
    const dropdownHtml = `
      <span class="cloze-dropdown ${isTeacher ? "teacher-mode" : ""}" data-question="${question.questionId}">
        <span class="cloze-trigger">
          <span class="cloze-num">${idx + 1}</span>
          <span class="cloze-selected-text ${isFilledClass}">${escapeHtml(initialText)}</span>
          <svg class="cloze-arrow" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </span>
        <span class="cloze-menu">
          ${options.map(opt => `<span class="cloze-option" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</span>`).join("")}
        </span>
        <input type="hidden" data-student-answer="${question.questionId}" value="${escapeHtml(isTeacher ? (question.correctAnswer || "") : "")}" />
      </span>
    `;
    
    return escapeHtml(text).replace(/__+/, dropdownHtml);
  }).join(" ");

  return `
    <div class="cloze-passage-card">
      <div class="cloze-passage-body">
        ${passageHtml}
      </div>
    </div>
  `;
}

function getMatchLabel(qId, questions) {
  const idx = questions.findIndex(q => q.questionId === qId);
  return `Match ${idx + 1}`;
}

function renderMatchingSection(section, isStudent) {
  const questions = section.questions || [];
  
  if (!state.matchingAnswers) {
    state.matchingAnswers = {};
  }
  
  if (!state.matchingShuffled) {
    state.matchingShuffled = {};
  }
  
  if (!state.matchingShuffled[section.sectionId]) {
    const definitions = questions.map((q) => ({
      id: q.questionId,
      text: q.correctAnswer
    }));
    state.matchingShuffled[section.sectionId] = shuffleArray(definitions);
  }
  
  const shuffledDefs = state.matchingShuffled[section.sectionId];

  let termsHtml = "";
  let definitionsHtml = "";

  if (isStudent) {
    termsHtml = questions.map((q, idx) => {
      const matchedDefText = state.matchingAnswers[q.questionId];
      const isSelected = state.selectedTerm?.questionId === q.questionId;
      return `
        <div class="matching-card matching-term ${isSelected ? 'selected' : ''} ${matchedDefText ? 'matched' : ''}" 
             data-term-id="${q.questionId}" 
             data-matched-to="${matchedDefText ? escapeHtml(matchedDefText) : ''}">
          <span class="matching-card-text">${escapeHtml(q.questionText)}</span>
          ${matchedDefText ? `<span class="matching-badge">${escapeHtml(getMatchLabel(q.questionId, questions))}</span>` : ''}
          <input type="hidden" data-student-answer="${q.questionId}" value="${escapeHtml(matchedDefText || '')}" />
        </div>
      `;
    }).join("");

    definitionsHtml = shuffledDefs.map((def) => {
      const matchedTermId = Object.keys(state.matchingAnswers).find(key => state.matchingAnswers[key] === def.text);
      return `
        <div class="matching-card matching-definition ${matchedTermId ? 'matched' : ''}" 
             data-def-id="${def.id}" 
             data-def-text="${escapeHtml(def.text)}"
             data-matched-from="${matchedTermId || ''}">
          <span class="matching-card-text">${escapeHtml(def.text)}</span>
          ${matchedTermId ? `<span class="matching-badge">${escapeHtml(getMatchLabel(matchedTermId, questions))}</span>` : ''}
        </div>
      `;
    }).join("");
  } else {
    // Teacher View: aligned 1-to-1, editable
    termsHtml = questions.map((q, idx) => `
      <div class="matching-card matching-term teacher matched" data-term-id="${q.questionId}" data-matched-to="${escapeHtml(q.correctAnswer)}">
        <span class="matching-card-text" contenteditable="true" data-question="${q.questionId}" data-qfield="questionText">${escapeHtml(q.questionText)}</span>
        <span class="matching-badge">Match ${idx + 1}</span>
      </div>
    `).join("");

    definitionsHtml = questions.map((q, idx) => `
      <div class="matching-card matching-definition teacher matched" data-def-id="${q.questionId}" data-def-text="${escapeHtml(q.correctAnswer)}" data-matched-from="${q.questionId}">
        <span class="matching-card-text" contenteditable="true" data-question="${q.questionId}" data-qfield="correctAnswer">${escapeHtml(q.correctAnswer)}</span>
        <span class="matching-badge">Match ${idx + 1}</span>
      </div>
    `).join("");
  }

  return `
    <div class="matching-container ${!isStudent ? 'teacher-mode' : ''}" data-section-id="${section.sectionId}">
      <svg class="matching-connections-svg"></svg>
      <div class="matching-columns">
        <div class="matching-column terms-column">
          ${termsHtml}
        </div>
        <div class="matching-column definitions-column">
          ${definitionsHtml}
        </div>
      </div>
    </div>
  `;
}

function drawMatchingLines() {
  document.querySelectorAll(".matching-container").forEach((container) => {
    const svg = container.querySelector(".matching-connections-svg");
    if (!svg) return;
    svg.innerHTML = "";
    
    const containerRect = container.getBoundingClientRect();
    const isTeacher = container.classList.contains("teacher-mode");
    
    if (isTeacher) {
      // Draw 1-to-1 solid lines in teacher view
      const terms = container.querySelectorAll(".matching-term");
      terms.forEach((termEl) => {
        const qId = termEl.dataset.termId;
        const defEl = container.querySelector(`.matching-definition[data-def-id="${qId}"]`);
        if (!defEl) return;
        
        const termRect = termEl.getBoundingClientRect();
        const defRect = defEl.getBoundingClientRect();
        
        const x1 = termRect.right - containerRect.left;
        const y1 = termRect.top + termRect.height / 2 - containerRect.top;
        const x2 = defRect.left - containerRect.left;
        const y2 = defRect.top + defRect.height / 2 - containerRect.top;
        
        const dx = Math.abs(x2 - x1) * 0.4;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
        path.setAttribute("stroke", "rgba(79, 70, 229, 0.4)");
        path.setAttribute("stroke-width", "3");
        path.setAttribute("fill", "none");
        svg.appendChild(path);
      });
    } else {
      // Draw dynamic animated lines in student mode
      const terms = container.querySelectorAll(".matching-term[data-matched-to]");
      terms.forEach((termEl) => {
        const defText = termEl.dataset.matchedTo;
        if (!defText) return;
        
        // Find definition by text value
        const defEl = Array.from(container.querySelectorAll(".matching-definition")).find(
          el => el.dataset.defText === defText
        );
        if (!defEl) return;
        
        const termRect = termEl.getBoundingClientRect();
        const defRect = defEl.getBoundingClientRect();
        
        const x1 = termRect.right - containerRect.left;
        const y1 = termRect.top + termRect.height / 2 - containerRect.top;
        const x2 = defRect.left - containerRect.left;
        const y2 = defRect.top + defRect.height / 2 - containerRect.top;
        
        const dx = Math.abs(x2 - x1) * 0.4;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
        path.setAttribute("stroke", "#10b981"); // Green for match
        path.setAttribute("stroke-width", "3");
        path.setAttribute("fill", "none");
        path.setAttribute("class", "connection-line");
        svg.appendChild(path);
      });
    }
  });
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderQuestionList() {
  return state.generatedExam.sections.map((section) => {
    const isCloze = section.questionType === "Cloze Passage Questions";
    const isMatching = section.questionType === "Matching Questions";
    const isReadingComprehension = section.questionType === "Reading Comprehension Questions";
    
    let sectionBody = "";
    if (isCloze) {
      sectionBody = renderClozeSection(section, false);
    } else if (isReadingComprehension) {
      const passageHtml = `
        <div class="reading-passage-card">
          <div class="reading-passage-header">Reading Passage (Click text to edit)</div>
          <div class="reading-passage-body" contenteditable="true" data-section-passage="${section.sectionId}" placeholder="Enter the reading passage here...">
            ${escapeHtml(section.passage || "No passage generated. Please enter a passage.")}
          </div>
        </div>
      `;
      const questionsHtml = (section.questions || []).map((question, index) => renderUnifiedQuestion(question, index, false)).join("");
      sectionBody = passageHtml + questionsHtml;
    } else if (isMatching) {
      sectionBody = renderMatchingSection(section, false);
    } else {
      sectionBody = (section.questions || []).map((question, index) => renderUnifiedQuestion(question, index, false)).join("");
    }

    return `
      <section class="question-section">
        <div class="section-row" style="margin-bottom: 16px;">
          <div>
            <h3>${escapeHtml(section.title)}</h3>
            ${section.instruction ? `<p class="section-instruction-text"><em>${escapeHtml(section.instruction)}</em></p>` : ""}
          </div>
        </div>
        ${sectionBody}
      </section>
    `;
  }).join("");
}

function renderStudentQuestionText(question, isTeacher = false) {
  const isFillBlank = question.questionType === "Fill In The Blanks" || question.questionType === "Cloze Passage Questions";
  let text = question.questionText;
  
  if (isFillBlank) {
    if (!text.includes("__")) {
      text = text + " __";
    }
    
    const options = question.options || [];
    const initialText = isTeacher ? (question.correctAnswer || "________") : "________";
    const isFilledClass = isTeacher && question.correctAnswer ? "filled" : "";
    
    const dropdownHtml = `
      <span class="fitb-dropdown ${isTeacher ? "teacher-mode" : ""}" data-question="${question.questionId}">
        <span class="fitb-trigger">
          <span class="fitb-selected-text ${isFilledClass}">${escapeHtml(initialText)}</span>
          <svg class="fitb-arrow" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </span>
        <span class="fitb-menu">
          ${options.map(opt => `<span class="fitb-option" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</span>`).join("")}
        </span>
        <input type="hidden" data-student-answer="${question.questionId}" value="${escapeHtml(isTeacher ? (question.correctAnswer || "") : "")}" />
      </span>
    `;
    
    return escapeHtml(text).replace(/__+/, dropdownHtml);
  }
  
  return escapeHtml(text);
}

function formatReorderWord(word, pos, originalWord) {
  if (!word) return "";
  if (pos === 0) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  if (word.replace(/[^a-zA-Z]/g, "").toLowerCase() === "i") return "I";
  
  const properNouns = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
    "london", "paris", "tokyo", "america", "china", "india", "england", "france", "germany",
    "john", "mary", "peter", "sarah", "david", "james", "emma", "olivia", "william", "sofia", "ayaan", "nethmi"
  ];
  
  const cleanWord = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (properNouns.includes(cleanWord)) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  
  // Acronyms (e.g. USA, AI)
  if (word === word.toUpperCase() && word.length > 1) {
    return word;
  }
  
  // Otherwise, default to lowercased when pos > 0
  return word.toLowerCase();
}

function getReorderTiles(questionText) {
  const cleanText = questionText.replace(/^(Q\d+\.?|Question\s*\d+:?|\d+\.?)\s*/i, "");
  const splitter = cleanText.includes("/") ? "/" : /\s+/;
  return cleanText.split(splitter).map(w => w.trim()).filter(Boolean);
}

function renderReorderQuestion(question, isStudent) {
  const tiles = getReorderTiles(question.questionText);
  
  if (isStudent) {
    const selectedIndices = state.reorderSelections[question.questionId] || [];
    const answerString = selectedIndices.map((idx, pos) => {
      return formatReorderWord(tiles[idx], pos, tiles[idx]);
    }).join(" ");
    
    return `
      <div class="reorder-container" data-question="${question.questionId}">
        <!-- Scrambled Tiles Pool -->
        <div class="reorder-pool">
          ${tiles.map((tile, idx) => {
            const isSelected = selectedIndices.includes(idx);
            return `
              <button class="reorder-tile ${isSelected ? "selected" : ""}" data-index="${idx}" ${isSelected ? "disabled" : ""}>
                ${escapeHtml(tile)}
              </button>
            `;
          }).join("")}
        </div>
        
        <!-- Answer Space -->
        <div class="reorder-answer-space">
          ${selectedIndices.length === 0 
            ? `<span class="reorder-placeholder">Click tiles above to construct the sentence...</span>`
            : selectedIndices.map((idx, orderIdx) => {
                const word = formatReorderWord(tiles[idx], orderIdx, tiles[idx]);
                return `
                  <span class="reorder-placed-tile" data-index-in-selection="${orderIdx}">
                    ${escapeHtml(word)}
                  </span>
                `;
              }).join("")
          }
        </div>
        
        <!-- Action Buttons (Undo / Reset) -->
        <div class="reorder-actions">
          <button class="reorder-btn secondary small" data-reorder-action="undo" ${selectedIndices.length === 0 ? "disabled" : ""}>
            ${icon("M9 14L4 9l5-5M4 9h10a5 5 0 015 5v3")} Undo
          </button>
          <button class="reorder-btn secondary small danger" data-reorder-action="reset" ${selectedIndices.length === 0 ? "disabled" : ""}>
            ${icon("M19 6V4a2 2 0 00-2-2H7a2 2 0 00-2 2v2m14 0H5m14 0v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6")} Clear
          </button>
        </div>
        
        <input type="hidden" data-student-answer="${question.questionId}" value="${escapeHtml(answerString)}" />
      </div>
    `;
  } else {
    // Teacher view: show the answer key and the scrambled sentence
    return `
      <div class="reorder-container teacher-mode">
        <div class="reorder-pool">
          ${tiles.map(tile => `<span class="reorder-tile teacher">${escapeHtml(tile)}</span>`).join("")}
        </div>
        <div class="teacher-answer-box" style="margin-top: 12px;">
          <p>Scrambled Words: <strong contenteditable="true" data-question="${question.questionId}" data-qfield="questionText">${escapeHtml(question.questionText)}</strong></p>
          <p style="margin-top: 6px;">Answer Key: <strong contenteditable="true" data-question="${question.questionId}" data-qfield="correctAnswer">${escapeHtml(question.correctAnswer)}</strong></p>
        </div>
      </div>
    `;
  }
}

function renderUnifiedQuestion(question, index, isStudent) {
  const isMcq = question.questionType === "Multiple Choice Questions (MCQ)";
  const isFillBlank = question.questionType === "Fill In The Blanks" || question.questionType === "Cloze Passage Questions";
  const isTf = question.questionType === "True or False Questions" || question.questionType === "True Or False";
  const isEssay = question.questionType === "Essay Type Questions" || question.questionType === "Essay Questions";
  const isReorder = question.questionType === "Reorder the Sentence Questions" || question.questionType === "Reorder Sentence Questions" || question.questionType === "Sentence Reordering";
  
  let inputHtml = "";
  
  if ((isMcq || isFillBlank) && question.options?.length) {
    const badges = [
      { char: "A", class: "badge-a" },
      { char: "B", class: "badge-b" },
      { char: "C", class: "badge-c" },
      { char: "D", class: "badge-d" }
    ];
    
    if (isStudent) {
      if (isFillBlank) {
        // For Fill In The Blanks in student mode, input is inline in the sentence
        inputHtml = "";
      } else {
        // MCQ Radio buttons
        inputHtml = `
          <div class="student-choices-grid">
            ${question.options.map((option, idx) => {
              const badge = badges[idx % badges.length];
              return `
                <label class="choice-card">
                  <input type="radio" name="ans_${question.questionId}" value="${escapeHtml(option)}" data-student-answer="${question.questionId}" />
                  <div class="choice-content">
                    <span class="choice-badge ${badge.class}">${badge.char}</span>
                    <span class="choice-text">${escapeHtml(option)}</span>
                  </div>
                </label>
              `;
            }).join("")}
          </div>
        `;
      }
    } else {
      if (isFillBlank) {
        // For Fill In The Blanks in teacher review view, render exactly like student view, so no choices list below
        inputHtml = "";
      } else {
        // Teacher mode for MCQ: show editable options list
        inputHtml = `
          <div class="student-choices-grid">
            ${question.options.map((option, idx) => {
              const badge = badges[idx % badges.length];
              const isCorrect = String(option || "").trim().toLowerCase() === String(question.correctAnswer || "").trim().toLowerCase();
              
              return `
                <div class="choice-card teacher-mode ${isCorrect ? "correct-answer-highlight" : ""}">
                  <div class="choice-content">
                    <span class="choice-badge ${badge.class}">${badge.char}</span>
                    <span contenteditable="true" data-option-index="${idx}" data-question="${question.questionId}" class="review-choice-text">${escapeHtml(option)}</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
          <div class="teacher-answer-box" style="margin-top: 12px;">
            <p>Answer Key: <strong contenteditable="true" data-question="${question.questionId}" data-qfield="correctAnswer">${escapeHtml(question.correctAnswer)}</strong></p>
          </div>
        `;
      }
    }
  } else if (isTf) {
    // Deterministic shuffle: use questionId to decide order per question
    const tfHash = question.questionId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const tfChoices = tfHash % 2 === 0 ? ["True", "False"] : ["False", "True"];
    
    if (isStudent) {
      inputHtml = `
        <div class="student-choices binary">
          ${tfChoices.map(choice => `
            <label class="choice-bubble">
              <input type="radio" name="ans_${question.questionId}" value="${choice}" data-student-answer="${question.questionId}" />
              <span>${choice}</span>
            </label>
          `).join("")}
        </div>
      `;
    } else {
      inputHtml = `
        <div class="student-choices binary teacher-mode">
          ${tfChoices.map(choice => {
            const isCorrect = String(question.correctAnswer || "").trim().toLowerCase() === choice.toLowerCase();
            return `
              <div class="choice-bubble ${isCorrect ? "correct-answer-highlight" : ""}">
                <span>${choice}</span>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }
  } else if (isEssay) {
    if (isStudent) {
      inputHtml = `
        <textarea placeholder="Write your essay response here..." data-student-answer="${question.questionId}" rows="5" class="student-textarea"></textarea>
      `;
    } else {
      inputHtml = `
        <div class="teacher-answer-box">
          <p>Sample / Expected Rubric: <strong contenteditable="true" data-question="${question.questionId}" data-qfield="correctAnswer">${escapeHtml(question.correctAnswer)}</strong></p>
        </div>
      `;
    }
  } else if (isReorder) {
    inputHtml = renderReorderQuestion(question, isStudent);
  } else {
    // Fill In The Blanks (fallback if no options), Matching, Short Answer
    if (isStudent) {
      inputHtml = `
        <input type="text" placeholder="Type your answer here..." data-student-answer="${question.questionId}" class="student-text-input" />
      `;
    } else {
      inputHtml = `
        <div class="teacher-answer-box">
          <p>Answer Key: <strong contenteditable="true" data-question="${question.questionId}" data-qfield="correctAnswer">${escapeHtml(question.correctAnswer)}</strong></p>
        </div>
      `;
    }
  }
  
  return `
    <article class="student-question-card ${!isStudent ? "teacher-card-layout" : ""}">
      <div class="student-q-header">
        <span class="student-q-num">Question ${index + 1}</span>
        <div style="flex-grow: 1; min-width: 0;">
          ${isReorder ? `
            <span class="student-q-text">Rearrange the words to form a correct sentence.</span>
          ` : (isStudent || isFillBlank) ? `
            <span class="student-q-text">${renderStudentQuestionText(question, !isStudent)}</span>
          ` : `
            <h4 contenteditable="true" data-question="${question.questionId}" data-qfield="questionText" class="teacher-q-text">${escapeHtml(question.questionText)}</h4>
          `}
        </div>
        <span class="student-q-marks">${question.marks} marks</span>
      </div>
      
      ${inputHtml}
      
      ${!isStudent ? `
        <div class="teacher-meta-row" style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(79, 70, 229, 0.06); padding-top: 12px;">
          <small class="q-meta-info">${escapeHtml(question.difficulty)} · Explanation: <span contenteditable="true" data-question="${question.questionId}" data-qfield="explanation" class="teacher-q-explanation">${escapeHtml(question.explanation)}</span></small>
          <div class="q-actions">
            <button class="icon-button" title="Duplicate" data-action="duplicate-question" data-id="${question.questionId}">${icon("M8 8h12v12H8zM4 4h12v12")}</button>
            <button class="icon-button" title="Edit text" data-action="edit-question" data-id="${question.questionId}">${icon("M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z")}</button>
            <button class="icon-button danger" title="Delete" data-action="delete-question" data-id="${question.questionId}">${icon("M3 6h18M8 6V4h8v2m-9 0 1 16h8l1-16")}</button>
          </div>
        </div>
      ` : ""}
    </article>
  `;
}

function renderStudentPreview() {
  let indexOffset = 0;
  return `
    <div class="student-ui">
      <div class="student-top">
        <strong>${escapeHtml(state.generatedExam.metadata.title)}</strong>
        <div class="student-top-right">
          <span class="timer-badge">${escapeHtml(state.generatedExam.metadata.duration)} remaining</span>
          <button class="primary submit-exam-btn" data-action="grade-demo">Submit Exam</button>
        </div>
      </div>
      <div class="student-body">
        <div class="student-questions-list">
          ${state.generatedExam.sections.map((section) => {
            const isCloze = section.questionType === "Cloze Passage Questions";
            let html = "";
            
            if (isCloze) {
              html = `
                <section class="student-section">
                  <h3 class="student-section-title">${escapeHtml(section.title)}</h3>
                  ${section.instruction ? `<p class="student-section-instruction"><em>${escapeHtml(section.instruction)}</em></p>` : ""}
                  ${renderClozeSection(section, true)}
                </section>
              `;
              indexOffset += (section.questions || []).length;
            } else if (section.questionType === "Reading Comprehension Questions") {
              const passageHtml = `
                <div class="reading-passage-card student-mode">
                  <div class="reading-passage-header">Reading Passage</div>
                  <div class="reading-passage-body">${escapeHtml(section.passage || "").replace(/\n/g, "<br>")}</div>
                </div>
              `;
              html = `
                <section class="student-section">
                  <h3 class="student-section-title">${escapeHtml(section.title)}</h3>
                  ${section.instruction ? `<p class="student-section-instruction"><em>${escapeHtml(section.instruction)}</em></p>` : ""}
                  ${passageHtml}
                  <div class="student-questions-grid-list">
                    ${(section.questions || []).map((question, idx) => {
                      const qHtml = renderUnifiedQuestion(question, indexOffset, true);
                      indexOffset++;
                      return qHtml;
                    }).join("")}
                  </div>
                </section>
              `;
            } else if (section.questionType === "Matching Questions") {
              html = `
                <section class="student-section">
                  <h3 class="student-section-title">${escapeHtml(section.title)}</h3>
                  ${section.instruction ? `<p class="student-section-instruction"><em>${escapeHtml(section.instruction)}</em></p>` : ""}
                  ${renderMatchingSection(section, true)}
                </section>
              `;
              indexOffset += (section.questions || []).length;
            } else {
              html = `
                <section class="student-section">
                  <h3 class="student-section-title">${escapeHtml(section.title)}</h3>
                  ${section.instruction ? `<p class="student-section-instruction"><em>${escapeHtml(section.instruction)}</em></p>` : ""}
                  <div class="student-questions-grid-list">
                    ${(section.questions || []).map((question, idx) => {
                      const qHtml = renderUnifiedQuestion(question, indexOffset, true);
                      indexOffset++;
                      return qHtml;
                    }).join("")}
                  </div>
                </section>
              `;
            }
            return html;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderPublish() {
  if (!state.generatedExam) return emptyState("Publish needs an exam", "Generate and approve an exam before publishing.", "structure", "Build Exam");
  const locked = !state.approved;
  return `
    <section class="section-head row">
      <div><h2>Publishing System</h2><p>Approval gates protect answer keys and prevent accidental release.</p></div>
      <button class="primary" data-action="publish" ${locked ? "disabled" : ""}>Publish Exam</button>
    </section>
    ${locked ? `<div class="lockbox">${icon("M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z")} Teacher approval is mandatory before publishing.</div>` : ""}
    <div class="settings-grid">
      ${field("Assign to classroom", "publish.classroom", state.publish.classroom)}
      ${field("Start date", "publish.startDate", state.publish.startDate, "date")}
      ${field("Start time", "publish.startTime", state.publish.startTime, "time")}
      ${field("End date", "publish.endDate", state.publish.endDate, "date")}
      ${field("End time", "publish.endTime", state.publish.endTime, "time")}
      ${field("Maximum attempts", "publish.maxAttempts", state.publish.maxAttempts, "number")}
      ${field("Password protection", "publish.password", state.publish.password, "password")}
      <div class="field">
        <span>Exam duration</span>
        <div style="display: flex; gap: 10px;">
          <select data-bind="publish.durationSelect" style="flex: 1;">
            <option value="30 Minutes" ${state.publish.durationSelect === "30 Minutes" ? "selected" : ""}>30 Minutes</option>
            <option value="60 Minutes" ${state.publish.durationSelect === "60 Minutes" ? "selected" : ""}>1 Hour</option>
            <option value="90 Minutes" ${state.publish.durationSelect === "90 Minutes" ? "selected" : ""}>1.5 Hours</option>
            <option value="120 Minutes" ${state.publish.durationSelect === "120 Minutes" ? "selected" : ""}>2 Hours</option>
            <option value="custom" ${state.publish.durationSelect === "custom" ? "selected" : ""}>Custom...</option>
          </select>
          ${state.publish.durationSelect === "custom" ? `
            <div style="display: flex; gap: 6px; width: 180px; flex-shrink: 0;">
              <input type="number" min="1" data-bind="publish.durationValue" value="${state.publish.durationValue || 60}" style="flex: 1;" />
              <select data-bind="publish.durationUnit" style="width: 100px;">
                ${options(["Minutes", "Hours"], state.publish.durationUnit || "Minutes")}
              </select>
            </div>
          ` : ""}
        </div>
      </div>
      ${toggle("Allow late submission", "late")}
      ${toggle("Show marks immediately", "marksImmediately")}
      ${toggle("Show correct answers after exam", "answersAfterExam")}
      ${toggle("Enable leaderboard", "leaderboard")}
      ${toggle("Randomize question order", "randomizeQuestions")}
      ${toggle("Randomize MCQ options", "randomizeOptions")}
    </div>
  `;
}

function renderResults() {
  if (state.results.loading) {
    return `
      <section class="section-head">
        <h2>Results System</h2>
        <p>Deterministic Score Analysis & Report PDF Generator</p>
      </section>
      <div style="text-align: center; padding: 60px 20px;">
        <div class="loading-spinner" style="margin: 0 auto 20px auto; width: 45px; height: 45px; border-top-color: var(--purple); border-left-color: var(--purple); border-right-color: var(--purple);"></div>
        <h3 style="font-weight: 800; color: var(--ink); margin-bottom: 8px;">Analyzing Exam Results...</h3>
        <p style="color: var(--muted); max-width: 480px; margin: 0 auto; font-size: 14px;">
          Computing ranks, accuracy by topic, time-to-score Pearson correlation, and generating Cover, Visual Charts, and rule-based insights for the PDF export.
        </p>
      </div>
    `;
  }
  
  const analytics = state.results.data;
  if (!analytics) {
    return `
      <section class="section-head">
        <h2>Results System</h2>
        <p>Deterministic Score Analysis & Report PDF Generator</p>
      </section>
      <div class="empty">
        <h2>No analysis generated</h2>
        <p>Run the analysis on the classroom student attempts dataset to view charts and download the PDF report.</p>
        <button class="primary" data-action="run-analysis">Analyze Class Results</button>
      </div>
    `;
  }
  
  const pieData = Object.keys(analytics.grade_distribution).map(key => ({
    label: key,
    value: analytics.grade_distribution[key]
  }));
  
  const barData = [
    { label: "0-49", value: analytics.grade_distribution["F"] },
    { label: "50-59", value: analytics.grade_distribution["D"] },
    { label: "60-69", value: analytics.grade_distribution["C"] },
    { label: "70-79", value: analytics.grade_distribution["B"] },
    { label: "80-89", value: analytics.grade_distribution["A"] },
    { label: "90-100", value: analytics.grade_distribution["A+"] }
  ];
  
  const colors = ["#4f46e5", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
  
  return `
    <section class="section-head row" style="margin-bottom: 24px;">
      <div>
        <h2>Results System</h2>
        <p>Deterministic analysis for exam <strong>${escapeHtml(analytics.exam_name)}</strong></p>
      </div>
      <a href="${analytics.report_pdf_url || state.results.reportPdfUrl}" target="_blank" class="primary" style="text-decoration: none;">
        ${icon("M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z")}
        Download PDF Report
      </a>
    </section>

    <!-- Stat Metrics -->
    <div class="result-grid" style="margin-bottom: 30px;">
      <div class="metric">
        <strong>${analytics.pass_rate}%</strong>
        <span>Class Pass Rate</span>
      </div>
      <div class="metric">
        <strong>${analytics.average_score}</strong>
        <span>Average Score</span>
      </div>
      <div class="metric">
        <strong>${analytics.median_score}</strong>
        <span>Median Score</span>
      </div>
    </div>

    <!-- Layout of charts -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; align-items: start;">
      <div style="background: #ffffff; border: 1px solid rgba(79, 70, 229, 0.08); padding: 20px; border-radius: 16px; box-shadow: var(--shadow);">
        <h4 style="font-weight: bold; margin-bottom: 12px; color: var(--ink);">Grade Distribution</h4>
        ${renderSvgPieChart(pieData, colors)}
      </div>
      
      <div style="background: #ffffff; border: 1px solid rgba(79, 70, 229, 0.08); padding: 20px; border-radius: 16px; box-shadow: var(--shadow);">
        <h4 style="font-weight: bold; margin-bottom: 16px; color: var(--ink);">Score Distribution (Count)</h4>
        ${renderSvgBarChart(barData, "#4f46e5")}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 30px;">
      <div style="background: #ffffff; border: 1px solid rgba(79, 70, 229, 0.08); padding: 20px; border-radius: 16px; box-shadow: var(--shadow);">
        <h4 style="font-weight: bold; margin-bottom: 16px; color: var(--ink);">Accuracy by Topic</h4>
        ${renderSvgHorizontalBarChart(analytics.topic_performance, "#8b5cf6")}
      </div>
    </div>

    <!-- Student Rankings Table -->
    <h3 style="font-weight: 800; color: var(--ink); margin-bottom: 14px;">Student Leaderboard and Ranks</h3>
    <div class="table-wrap" style="margin-bottom: 30px;">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Score</th>
            <th>Grade</th>
            <th>Time Spent</th>
            <th>Percentile</th>
          </tr>
        </thead>
        <tbody>
          ${analytics.students.map(s => `
            <tr class="${s.grade === 'F' ? 'correct-answer-highlight' : ''}" style="${s.grade === 'F' ? 'background: #fef2f2;' : ''}">
              <td><strong>#${s.rank}</strong></td>
              <td>${escapeHtml(s.name)}</td>
              <td><strong>${s.score}</strong> / ${analytics.total_marks}</td>
              <td><span style="font-weight:bold; color: ${s.grade === 'F' ? '#ef4444' : 'var(--purple)'}">${s.grade}</span></td>
              <td>${s.time_taken_minutes} mins</td>
              <td>${s.percentile}%</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <!-- Outliers Section -->
    <h3 style="font-weight: 800; color: var(--ink); margin-bottom: 14px;">Class Outliers and At-Risk Analysis</h3>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
      <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 16px;">
        <h4 style="font-weight: bold; color: #065f46; margin-bottom: 8px;">Top Performers</h4>
        <ul style="padding-left: 16px; margin: 0; font-size: 13px; color: #1e293b;">
          ${analytics.outliers.top_performers.map(s => `<li>${escapeHtml(s.name)} (Score: ${s.score}, Grade: ${s.grade})</li>`).join("") || "<li>None identified</li>"}
        </ul>
      </div>
      
      <div style="background: #fffbeb; border: 1px solid #f59e0b; padding: 20px; border-radius: 16px;">
        <h4 style="font-weight: bold; color: #78350f; margin-bottom: 8px;">Low Performers</h4>
        <ul style="padding-left: 16px; margin: 0; font-size: 13px; color: #1e293b;">
          ${analytics.outliers.low_performers.map(s => `<li>${escapeHtml(s.name)} (Score: ${s.score}, Grade: ${s.grade})</li>`).join("") || "<li>None identified</li>"}
        </ul>
      </div>

      <div style="background: #fef2f2; border: 1px solid #ef4444; padding: 20px; border-radius: 16px;">
        <h4 style="font-weight: bold; color: #7f1d1d; margin-bottom: 8px;">At-Risk Students</h4>
        <p style="font-size: 11px; color: #991b1b; margin-top: 0; margin-bottom: 6px;">Spent above average time but failed</p>
        <ul style="padding-left: 16px; margin: 0; font-size: 13px; color: #1e293b;">
          ${analytics.outliers.at_risk.map(s => `<li>${escapeHtml(s.name)} (Time: ${s.time}m, Score: ${s.score})</li>`).join("") || "<li>None identified</li>"}
        </ul>
      </div>
    </div>
  `;
}



function emptyState(title, text, stage, button) {
  return `<div class="empty"><h2>${title}</h2><p>${text}</p><button class="primary" data-stage="${stage}">${button}</button></div>`;
}

function bindEvents() {
  document.querySelectorAll("[data-stage]").forEach((el) => el.addEventListener("click", () => {
    state.activeStage = el.dataset.stage;
    if (state.activeStage === "results" && (!state.results || !state.results.data)) {
      loadResults();
    }
    render();
  }));

  document.querySelectorAll("[data-bind]").forEach((el) => {
    el.addEventListener("input", () => {
      setPath(state, el.dataset.bind, inputValue(el));
      if (el.dataset.bind && el.dataset.bind.startsWith("publish.duration")) {
        syncPublishDuration();
      }
      
      const isTextInput = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && ["text", "number", "password", "date", "time"].includes(el.type));
      if (!isTextInput) {
        render();
      } else {
        // Direct DOM updates for setup screen next button
        const nextBtn = document.querySelector('[data-action="next-stage"]');
        if (nextBtn && state.activeStage === "setup") {
          nextBtn.disabled = !isSetupReady();
        }
        
        // Direct DOM updates for structure screen (generate button/hint)
        const genBtn = document.querySelector('[data-action="generate"]');
        const canGenerate = isGenerateReady();
        if (genBtn && state.activeStage === "structure") {
          genBtn.disabled = !canGenerate;
        }
        const hintEl = document.querySelector(".hint");
        if (hintEl && state.activeStage === "structure") {
          hintEl.textContent = canGenerate 
            ? "Ready for AI generation. Teacher approval will still be required." 
            : "Generation unlocks when setup is complete, at least one section exists, and marks equal the required total.";
        }
        
        if (el.dataset.bind === "requiredTotal") {
          const meter = document.querySelector(".total-bar meter");
          if (meter) {
            meter.max = Number(el.value) || 0;
            const newTotal = getTotalMarks();
            meter.value = Math.min(newTotal, Number(el.value) || 0);
          }
        }
      }
    });
    
    const isTextInput = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && ["text", "number", "password", "date", "time"].includes(el.type));
    if (isTextInput) {
      el.addEventListener("blur", () => {
        render();
      });
    }
  });

  document.querySelectorAll("[data-choice]").forEach((el) => el.addEventListener("click", () => {
    state[el.dataset.choice] = el.dataset.value;
    render();
  }));

  document.querySelectorAll("[data-section]").forEach((el) => {
    el.addEventListener("input", () => {
      const section = state.sections.find((item) => item.id === el.dataset.section);
      if (section) {
        const field = el.dataset.field;
        const oldType = section.type;
        const oldCount = section.count;
        
        let val = el.value;
        if (["count", "marks"].includes(field)) val = Number(val);
        
        const wasDefault = !section.instruction || section.instruction === getDefaultInstruction(oldType, oldCount);
        
        section[field] = val;
        
        if (wasDefault && (field === "count" || field === "type")) {
          section.instruction = getDefaultInstruction(section.type, section.count);
          const instInput = document.querySelector(`input[data-section="${section.id}"][data-field="instruction"]`);
          if (instInput) {
            instInput.value = section.instruction;
          }
        }
      }
      
      const isTextInput = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && ["text", "number", "password", "date", "time"].includes(el.type));
      if (!isTextInput) {
        render();
      } else {
        // Update total marks display and meter directly
        const newTotal = getTotalMarks();
        const currentTotalEl = document.querySelector(".current-total");
        if (currentTotalEl) {
          currentTotalEl.textContent = newTotal;
        }
        const meterEl = document.querySelector(".total-bar meter");
        if (meterEl) {
          meterEl.value = Math.min(newTotal, state.requiredTotal);
        }
        
        // Update generate button state
        const genBtn = document.querySelector('[data-action="generate"]');
        const canGenerate = isGenerateReady();
        if (genBtn) {
          genBtn.disabled = !canGenerate;
        }
        const hintEl = document.querySelector(".hint");
        if (hintEl) {
          hintEl.textContent = canGenerate 
            ? "Ready for AI generation. Teacher approval will still be required." 
            : "Generation unlocks when setup is complete, at least one section exists, and marks equal the required total.";
        }
      }
    });
    
    const isTextInput = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && ["text", "number", "password", "date", "time"].includes(el.type));
    if (isTextInput) {
      el.addEventListener("blur", () => {
        render();
      });
    }
  });

  document.querySelectorAll("[data-qfield]").forEach((el) => el.addEventListener("blur", () => {
    const question = findQuestion(el.dataset.question);
    if (question) question[el.dataset.qfield] = el.textContent.trim();
  }));
  document.querySelectorAll("[data-action]").forEach((el) => el.addEventListener("click", handleAction));
}

async function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  if (action === "file") return;
  if (action === "next-stage") {
    if (state.activeStage === "setup") {
      state.activeStage = "structure";
    } else if (state.activeStage === "review") {
      state.activeStage = "publish";
    }
    render();
    return;
  }
  if (action === "add-section") {
    const defaultCount = 5;
    const defaultMarks = 2;
    state.sections.push({
      id: uid(),
      type: questionTypes[0],
      count: defaultCount,
      marks: defaultMarks,
      difficulty: "",
      instruction: getDefaultInstruction(questionTypes[0], defaultCount)
    });
  }
  if (action === "add-section-type") {
    const type = event.currentTarget.dataset.type;
    const defaultCount = 5;
    const defaultMarks = 2;
    state.sections.push({
      id: uid(),
      type: type,
      count: defaultCount,
      marks: defaultMarks,
      difficulty: "",
      instruction: getDefaultInstruction(type, defaultCount),
      paragraphLength: type === "Reading Comprehension Questions" ? "Medium" : undefined
    });
  }
  if (action === "delete-section") state.sections = state.sections.filter((section) => section.id !== event.currentTarget.dataset.id);
  if (action === "move-section-up") {
    const id = event.currentTarget.dataset.id;
    const index = state.sections.findIndex((section) => section.id === id);
    if (index > 0) {
      const temp = state.sections[index];
      state.sections[index] = state.sections[index - 1];
      state.sections[index - 1] = temp;
    }
  }
  if (action === "move-section-down") {
    const id = event.currentTarget.dataset.id;
    const index = state.sections.findIndex((section) => section.id === id);
    if (index !== -1 && index < state.sections.length - 1) {
      const temp = state.sections[index];
      state.sections[index] = state.sections[index + 1];
      state.sections[index + 1] = temp;
    }
  }
  if (action === "edit-question") {
    const qId = event.currentTarget.dataset.id;
    const header = document.querySelector(`h4[data-question="${qId}"][data-qfield="questionText"]`);
    if (header) {
      header.focus();
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(header);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {}
    }
    return;
  }
  if (action === "balance") balanceSections();
  if (action === "generate") await generateExam();
  if (action === "approve") { state.approved = true; toast("Exam approved. Publishing is unlocked."); }
  if (action === "student-preview") state.previewMode = state.previewMode === "student" ? "teacher" : "student";
  if (action === "delete-question") removeQuestion(event.currentTarget.dataset.id);
  if (action === "duplicate-question") duplicateQuestion(event.currentTarget.dataset.id);
  if (action === "regen-question") regenerateQuestion(event.currentTarget.dataset.id);
  if (action === "regen-section") toast("Section regeneration is routed through the AI endpoint in production.");
  if (action === "save") await saveExam();
  if (action === "publish") await publishExam();
  if (action === "grade-demo") await gradeDemo();
  if (action === "run-analysis") await loadResults();
  const fileInput = event.target.closest("[data-action='file']");
  if (fileInput) readSourceFile(fileInput);
  render();
}

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-action='file']")) readSourceFile(event.target);
});

function readSourceFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  state.uploadedFileName = file.name;
  if (file.name.toLowerCase().endsWith(".txt")) {
    file.text().then((text) => {
      state.content = text;
      toast("TXT content extracted.");
      render();
    });
  } else {
    toast("File attached. PDF/DOCX extraction is isolated for server-side parser integration.");
  }
}

async function generateExam() {
  if (!isGenerateReady()) return;
  state.loading = true;
  state.activeStage = "structure";
  render();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
  
  try {
    const response = await fetch("/api/generate-exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        content: state.content,
        examType: state.examType,
        difficulty: state.difficulty,
        duration: state.duration,
        gradingMode: state.gradingMode,
        requiredTotal: state.requiredTotal,
        sections: state.sections.map(({ type, count, marks, difficulty, instruction, paragraphLength }) => ({
          type,
          count,
          marks,
          difficulty,
          instruction: instruction || getDefaultInstruction(type, count),
          paragraphLength: type === "Reading Comprehension Questions" ? (paragraphLength || "Medium") : undefined
        }))
      })
    });
    clearTimeout(timeoutId);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Generation failed");
    state.generatedExam = data;
    state.approved = false;
    state.activeStage = "review";

    // Initialize publishing duration settings from the generated exam duration
    const durStr = data.metadata.duration || "60 Minutes";
    state.publish.duration = durStr;
    if (["30 Minutes", "60 Minutes", "90 Minutes", "120 Minutes"].includes(durStr)) {
      state.publish.durationSelect = durStr;
    } else {
      state.publish.durationSelect = "custom";
      const parts = durStr.split(" ");
      state.publish.durationValue = Number(parts[0]) || 60;
      state.publish.durationUnit = parts[1] || "Minutes";
    }

    toast("AI draft generated. Please review before approval.");
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("generateExam error:", error);
    if (error.name === "AbortError") {
      toast("Generation timed out. Please try again.");
    } else {
      toast(error.message || "Generation failed. Please try again.");
    }
  } finally {
    state.loading = false;
    render();
  }
}

async function saveExam() {
  const response = await fetch("/api/save-exam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exam: state.generatedExam, approved: state.approved, settings: { sections: state.sections }, publishing: state.publish })
  });
  const data = await response.json();
  toast(response.ok ? `Saved draft ${data.examId}.` : data.error);
}

async function publishExam() {
  const response = await fetch("/api/publish-exam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exam: state.generatedExam, approved: state.approved, publishing: state.publish })
  });
  const data = await response.json();
  toast(response.ok ? `Published ${data.examId}.` : data.error);
}

async function gradeDemo() {
  const answers = {};
  // Read text inputs, hidden inputs, and textareas
  document.querySelectorAll("input[data-student-answer][type='text'], input[data-student-answer][type='hidden'], textarea[data-student-answer]").forEach((el) => {
    answers[el.dataset.studentAnswer] = el.value;
  });
  // Read checked radios
  document.querySelectorAll("input[data-student-answer][type='radio']:checked").forEach((el) => {
    answers[el.dataset.studentAnswer] = el.value;
  });
  
  const response = await fetch("/api/grade-attempt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exam: state.generatedExam, answers })
  });
  const data = await response.json();
  toast(`Demo result: ${data.totalScore}/${data.maxScore} (${data.percentage}%).`);
}

function removeQuestion(id) {
  state.generatedExam.sections.forEach((section) => {
    section.questions = section.questions.filter((question) => question.questionId !== id);
    section.totalMarks = section.questions.reduce((sum, q) => sum + q.marks, 0);
  });
}

function duplicateQuestion(id) {
  const question = findQuestion(id);
  const section = state.generatedExam.sections.find((item) => item.questions.some((q) => q.questionId === id));
  if (question && section) section.questions.push({ ...question, questionId: uid("Q") });
}

function regenerateQuestion(id) {
  const question = findQuestion(id);
  if (!question) return;
  question.questionText = `${question.questionText.replace(/\s*\(Regenerated.*?\)$/, "")} (Regenerated focus)`;
  question.explanation = "Queued through single-question regeneration workflow.";
}

function findQuestion(id) {
  return state.generatedExam?.sections.flatMap((section) => section.questions || []).find((question) => question.questionId === id);
}

function balanceSections() {
  if (!state.sections.length) return;

  const currentSections = state.sections;
  const targetTotal = state.requiredTotal;
  const counts = currentSections.map(s => Math.max(1, Number(s.count) || 1));
  const numSections = currentSections.length;

  const getTypeWeight = (type = '') => {
    const t = String(type).toLowerCase();
    if (t.includes('essay')) return 4;
    if (t.includes('comprehension')) return 2.5;
    if (t.includes('short answer') || t.includes('matching') || t.includes('reorder')) return 2;
    if (t.includes('blanks') || t.includes('cloze')) return 1.5;
    return 1;
  };

  const weights = currentSections.map(s => getTypeWeight(s.type));

  if (numSections === 1) {
    const c = counts[0];
    if (targetTotal % c === 0 && targetTotal / c >= 1) {
      currentSections[0].marks = targetTotal / c;
      toast(`Balanced Section 1 marks to ${targetTotal / c} per question.`);
      render();
      return;
    } else {
      toast(`Cannot evenly distribute ${targetTotal} marks across ${c} questions. Please adjust question count or target.`);
      return;
    }
  }

  const validSolutions = [];

  function search(idx, remainingTotal, currentMarks) {
    if (idx === numSections - 1) {
      const lastCount = counts[idx];
      if (remainingTotal > 0 && remainingTotal % lastCount === 0) {
        const lastMark = remainingTotal / lastCount;
        if (lastMark >= 1) {
          const solution = [...currentMarks, lastMark];
          let penalty = 0;

          solution.forEach((m) => {
            if (m === 25 || m === 50 || m === 10 || m === 20) penalty -= 60;
            else if (m % 10 === 0) penalty -= 40;
            else if (m % 5 === 0) penalty -= 30;
            else if (m % 2 === 0) penalty -= 5;
            else penalty += 50;

            if (m > 10 && m % 5 !== 0) penalty += 80;
          });

          for (let i = 0; i < numSections; i++) {
            for (let j = i + 1; j < numSections; j++) {
              if (weights[i] < weights[j] && solution[i] > solution[j]) {
                penalty += 150;
              }
              if (weights[i] > weights[j] && solution[i] < solution[j]) {
                penalty += 150;
              }
            }
          }

          const baseUnit = targetTotal / (counts.reduce((sum, c, i) => sum + c * weights[i], 0) || 1);
          solution.forEach((m, i) => {
            const ideal = Math.max(1, Math.round(weights[i] * baseUnit));
            penalty += Math.abs(m - ideal) * 10;
          });

          validSolutions.push({ marks: solution, penalty });
        }
      }
      return;
    }

    const c = counts[idx];
    const maxMarkForSection = Math.floor((remainingTotal - (numSections - 1 - idx)) / c);

    for (let m = 1; m <= maxMarkForSection; m++) {
      search(idx + 1, remainingTotal - (c * m), [...currentMarks, m]);
    }
  }

  search(0, targetTotal, []);

  if (validSolutions.length === 0) {
    toast(`Cannot balance to exactly ${targetTotal} marks with current question counts. Please adjust counts or target.`);
    return;
  }

  validSolutions.sort((a, b) => a.penalty - b.penalty);
  const best = validSolutions[0];

  currentSections.forEach((s, i) => {
    s.marks = best.marks[i];
  });

  toast(`Balanced ${numSections} sections to total exactly ${targetTotal} marks.`);
  render();
}

function getTotalMarks() {
  return state.sections.reduce((sum, section) => sum + Number(section.count || 0) * Number(section.marks || 0), 0);
}

function isGenerateReady() {
  return state.content.trim() && state.examType && state.difficulty && state.duration.value && state.sections.length && getTotalMarks() === state.requiredTotal && !state.loading;
}

function isSetupReady() {
  return !!(state.content.trim() && state.examType && state.duration.value && state.difficulty && state.gradingMode);
}

function navButton(stage, label, path) {
  return `<button class="nav-item ${state.activeStage === stage ? "active" : ""}" data-stage="${stage}">${icon(path)}<span>${label}</span></button>`;
}

function stageButton(stage, number, label) {
  return `<button class="${state.activeStage === stage ? "active" : ""}" data-stage="${stage}"><span>${number}</span>${label}</button>`;
}

function segment(name, value, selected) {
  return `<button type="button" class="${value === selected ? "selected" : ""}" data-choice="${name}" data-value="${value}">${value}</button>`;
}

function field(label, path, value, type = "text") {
  return `<label class="field"><span>${label}</span><input type="${type}" data-bind="${path}" value="${escapeHtml(String(value || ""))}" /></label>`;
}

function toggle(label, key) {
  return `<label class="toggle"><input type="checkbox" data-bind="publish.${key}" ${state.publish[key] ? "checked" : ""} /> <span>${label}</span></label>`;
}

function options(items, selected) {
  return items.map((item) => `<option ${item === selected ? "selected" : ""}>${escapeHtml(item)}</option>`).join("");
}

function icon(path) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" /></svg>`;
}

function inputValue(el) {
  if (el.type === "number") return Number(el.value);
  if (el.type === "checkbox") return el.checked;
  return el.value;
}

function setPath(target, path, value) {
  const parts = path.split(".");
  let node = target;
  parts.slice(0, -1).forEach((part) => { node = node[part]; });
  node[parts.at(-1)] = value;
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function toast(message) {
  state.toast = message;
  setTimeout(() => {
    state.toast = "";
    render();
  }, 2600);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

document.addEventListener("blur", (event) => {
  const el = event.target;
  if (el.matches("[data-option-index]")) {
    const question = findQuestion(el.dataset.question);
    if (question && question.options) {
      const idx = Number(el.dataset.optionIndex);
      question.options[idx] = el.textContent.trim();
    }
  }
  if (el.matches("[data-section-passage]")) {
    const section = state.generatedExam?.sections.find((s) => s.sectionId === el.dataset.sectionPassage);
    if (section) {
      section.passage = el.textContent.trim();
    }
  }
}, true);

// Handle Fill In The Blanks and Cloze Passage interactive dropdown events
document.addEventListener("click", (event) => {
  // --- FITB Dropdowns ---
  const fitbTrigger = event.target.closest(".fitb-trigger");
  if (fitbTrigger) {
    event.stopPropagation();
    const dropdown = fitbTrigger.closest(".fitb-dropdown");
    
    // Close other dropdowns
    document.querySelectorAll(".fitb-dropdown, .cloze-dropdown").forEach((d) => {
      if (d !== dropdown) d.classList.remove("open");
    });
    
    dropdown.classList.toggle("open");
    return;
  }
  
  const fitbOption = event.target.closest(".fitb-option");
  if (fitbOption) {
    event.stopPropagation();
    const dropdown = fitbOption.closest(".fitb-dropdown");
    const selectedText = dropdown.querySelector(".fitb-selected-text");
    const hiddenInput = dropdown.querySelector("input[data-student-answer]");
    
    const value = fitbOption.dataset.value;
    hiddenInput.value = value;
    selectedText.textContent = value;
    selectedText.classList.add("filled");
    
    if (dropdown.classList.contains("teacher-mode")) {
      const qId = dropdown.dataset.question;
      const question = findQuestion(qId);
      if (question) {
        question.correctAnswer = value;
      }
    }
    
    dropdown.classList.remove("open");
    return;
  }

  // --- Cloze Dropdowns ---
  const clozeTrigger = event.target.closest(".cloze-trigger");
  if (clozeTrigger) {
    event.stopPropagation();
    const dropdown = clozeTrigger.closest(".cloze-dropdown");
    
    // Close other dropdowns
    document.querySelectorAll(".fitb-dropdown, .cloze-dropdown").forEach((d) => {
      if (d !== dropdown) d.classList.remove("open");
    });
    
    dropdown.classList.toggle("open");
    return;
  }
  
  const clozeOption = event.target.closest(".cloze-option");
  if (clozeOption) {
    event.stopPropagation();
    const dropdown = clozeOption.closest(".cloze-dropdown");
    const selectedText = dropdown.querySelector(".cloze-selected-text");
    const hiddenInput = dropdown.querySelector("input[data-student-answer]");
    
    const value = clozeOption.dataset.value;
    hiddenInput.value = value;
    selectedText.textContent = value;
    selectedText.classList.add("filled");
    
    if (dropdown.classList.contains("teacher-mode")) {
      const qId = dropdown.dataset.question;
      const question = findQuestion(qId);
      if (question) {
        question.correctAnswer = value;
      }
    }
    
    dropdown.classList.remove("open");
    return;
  }
  
  // --- Sentence Reordering Click Handlers ---
  const tile = event.target.closest(".reorder-tile:not(.teacher)");
  if (tile) {
    event.stopPropagation();
    const container = tile.closest(".reorder-container");
    const qId = container.dataset.question;
    const index = Number(tile.dataset.index);
    
    if (!state.reorderSelections[qId]) {
      state.reorderSelections[qId] = [];
    }
    
    if (!state.reorderSelections[qId].includes(index)) {
      state.reorderSelections[qId].push(index);
      render();
    }
    return;
  }
  
  const placedTile = event.target.closest(".reorder-placed-tile");
  if (placedTile) {
    event.stopPropagation();
    const container = placedTile.closest(".reorder-container");
    const qId = container.dataset.question;
    const orderIdx = Number(placedTile.dataset.indexInSelection);
    
    if (state.reorderSelections[qId]) {
      state.reorderSelections[qId].splice(orderIdx, 1);
      render();
    }
    return;
  }
  
  const reorderActionBtn = event.target.closest("[data-reorder-action]");
  if (reorderActionBtn) {
    event.stopPropagation();
    const container = reorderActionBtn.closest(".reorder-container");
    const qId = container.dataset.question;
    const action = reorderActionBtn.dataset.reorderAction;
    
    if (action === "undo") {
      if (state.reorderSelections[qId] && state.reorderSelections[qId].length > 0) {
        state.reorderSelections[qId].pop();
        render();
      }
    } else if (action === "reset") {
      state.reorderSelections[qId] = [];
      render();
    }
    return;
  }
  // --- Interactive Matching Click Handlers ---
  const termCard = event.target.closest(".matching-card.matching-term:not(.teacher)");
  if (termCard) {
    event.stopPropagation();
    const container = termCard.closest(".matching-container");
    const sectionId = container.dataset.sectionId;
    const termId = termCard.dataset.termId;
    
    if (!state.matchingAnswers) {
      state.matchingAnswers = {};
    }
    
    if (state.matchingAnswers[termId]) {
      delete state.matchingAnswers[termId];
      if (state.selectedTerm?.questionId === termId) {
        state.selectedTerm = null;
      }
      render();
      return;
    }
    
    state.selectedTerm = { sectionId, questionId: termId };
    render();
    return;
  }
  
  const defCard = event.target.closest(".matching-card.matching-definition:not(.teacher)");
  if (defCard) {
    event.stopPropagation();
    const container = defCard.closest(".matching-container");
    const sectionId = container.dataset.sectionId;
    const defText = defCard.dataset.defText;
    
    if (state.selectedTerm && state.selectedTerm.sectionId === sectionId) {
      if (!state.matchingAnswers) {
        state.matchingAnswers = {};
      }
      
      for (const qId in state.matchingAnswers) {
        if (state.matchingAnswers[qId] === defText) {
          delete state.matchingAnswers[qId];
        }
      }
      
      state.matchingAnswers[state.selectedTerm.questionId] = defText;
      state.selectedTerm = null;
      render();
    } else {
      toast("Click a term on the left first.");
    }
    return;
  }
  
  // Close all open dropdowns when clicking outside
  document.querySelectorAll(".fitb-dropdown.open, .cloze-dropdown.open").forEach((d) => {
    d.classList.remove("open");
  });
});

window.addEventListener("resize", drawMatchingLines);

function syncPublishDuration() {
  if (!state.publish) return;
  if (state.publish.durationSelect !== "custom") {
    state.publish.duration = state.publish.durationSelect || "60 Minutes";
  } else {
    const val = state.publish.durationValue || 60;
    const unit = state.publish.durationUnit || "Minutes";
    state.publish.duration = `${val} ${unit}`;
  }
  
  if (state.generatedExam) {
    state.generatedExam.metadata.duration = state.publish.duration;
  }
}


function startStudentTimer() {
  if (state.studentTimeRemaining === undefined || state.studentTimeRemaining === null) {
    const durStr = state.generatedExam?.metadata?.duration || "60 Minutes";
    const parts = durStr.split(" ");
    const value = parseFloat(parts[0]) || 60;
    const unit = parts[1] || "Minutes";
    
    let totalSeconds = value * 60;
    if (unit.toLowerCase().startsWith("hour")) {
      totalSeconds = value * 3600;
    }
    state.studentTimeRemaining = totalSeconds;
  }
  
  const updateBadge = () => {
    const timerBadge = document.querySelector(".timer-badge");
    if (!timerBadge) return;
    
    if (state.studentTimeRemaining <= 0) {
      clearInterval(studentTimerInterval);
      studentTimerInterval = null;
      timerBadge.textContent = "Time's up!";
      timerBadge.style.background = "rgba(239, 68, 68, 0.15)";
      timerBadge.style.color = "#ef4444";
      toast("Time is up! Exam auto-submitted.");
      const submitBtn = document.querySelector(".submit-exam-btn");
      if (submitBtn) submitBtn.click();
      return;
    }
    
    const hrs = Math.floor(state.studentTimeRemaining / 3600);
    const mins = Math.floor((state.studentTimeRemaining % 3600) / 60);
    const secs = state.studentTimeRemaining % 60;
    
    let display = "";
    if (hrs > 0) {
      display = `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    } else {
      display = `${mins}:${String(secs).padStart(2, "0")}`;
    }
    timerBadge.textContent = `${display} remaining`;
  };
  
  updateBadge();
  
  if (studentTimerInterval) return;
  
  studentTimerInterval = setInterval(() => {
    if (state.previewMode !== "student" || !document.querySelector(".timer-badge")) {
      clearInterval(studentTimerInterval);
      studentTimerInterval = null;
      return;
    }
    
    state.studentTimeRemaining--;
    updateBadge();
  }, 1000);
}

const mockClassResults = {
  exam_id: "EXAM_001",
  class_id: "CLASS_A",
  exam_name: "Mid Term English Exam",
  total_marks: 100,
  students: [
    { student_id: "S01", name: "Nethmi Silva", score: 94, time_taken_minutes: 36, answers: { Q1: "A", Q2: "B", Q3: "C", Q4: "A", Q5: "True", Q6: "A", Q7: "B", Q8: "C", Q9: "A", Q10: "B" } },
    { student_id: "S02", name: "Ayaan Perera", score: 89, time_taken_minutes: 42, answers: { Q1: "A", Q2: "B", Q3: "C", Q4: "A", Q5: "True", Q6: "A", Q7: "B", Q8: "D", Q9: "A", Q10: "B" } },
    { student_id: "S03", name: "Sofia Khan", score: 84, time_taken_minutes: 45, answers: { Q1: "A", Q2: "B", Q3: "C", Q4: "B", Q5: "True", Q6: "A", Q7: "B", Q8: "D", Q9: "A", Q10: "B" } },
    { student_id: "S04", name: "John Doe", score: 76, time_taken_minutes: 50, answers: { Q1: "A", Q2: "B", Q3: "D", Q4: "B", Q5: "True", Q6: "A", Q7: "C", Q8: "D", Q9: "B", Q10: "B" } },
    { student_id: "S05", name: "Jane Smith", score: 92, time_taken_minutes: 38, answers: { Q1: "A", Q2: "B", Q3: "C", Q4: "A", Q5: "True", Q6: "A", Q7: "B", Q8: "C", Q9: "A", Q10: "B" } },
    { student_id: "S06", name: "Emily Davis", score: 65, time_taken_minutes: 55, answers: { Q1: "A", Q2: "C", Q3: "D", Q4: "B", Q5: "False", Q6: "A", Q7: "C", Q8: "D", Q9: "B", Q10: "C" } },
    { student_id: "S07", name: "Michael Brown", score: 58, time_taken_minutes: 62, answers: { Q1: "B", Q2: "C", Q3: "D", Q4: "B", Q5: "False", Q6: "B", Q7: "C", Q8: "D", Q9: "B", Q10: "C" } },
    { student_id: "S08", name: "William Wilson", score: 48, time_taken_minutes: 68, answers: { Q1: "B", Q2: "C", Q3: "D", Q4: "C", Q5: "False", Q6: "B", Q7: "C", Q8: "A", Q9: "B", Q10: "C" } },
    { student_id: "S09", name: "Olivia Johnson", score: 72, time_taken_minutes: 48, answers: { Q1: "A", Q2: "B", Q3: "D", Q4: "B", Q5: "True", Q6: "A", Q7: "B", Q8: "D", Q9: "A", Q10: "B" } },
    { student_id: "S10", name: "James Jones", score: 81, time_taken_minutes: 41, answers: { Q1: "A", Q2: "B", Q3: "C", Q4: "A", Q5: "True", Q6: "A", Q7: "B", Q8: "D", Q9: "A", Q10: "B" } },
    { student_id: "S11", name: "Lucas Miller", score: 42, time_taken_minutes: 72, answers: { Q1: "C", Q2: "C", Q3: "D", Q4: "C", Q5: "False", Q6: "B", Q7: "C", Q8: "A", Q9: "B", Q10: "C" } },
    { student_id: "S12", name: "Mia Taylor", score: 98, time_taken_minutes: 32, answers: { Q1: "A", Q2: "B", Q3: "C", Q4: "A", Q5: "True", Q6: "A", Q7: "B", Q8: "C", Q9: "A", Q10: "B" } },
    { student_id: "S13", name: "Alexander Anderson", score: 60, time_taken_minutes: 58, answers: { Q1: "A", Q2: "C", Q3: "D", Q4: "B", Q5: "False", Q6: "A", Q7: "C", Q8: "D", Q9: "B", Q10: "C" } },
    { student_id: "S14", name: "Isabella Thomas", score: 78, time_taken_minutes: 47, answers: { Q1: "A", Q2: "B", Q3: "D", Q4: "B", Q5: "True", Q6: "A", Q7: "B", Q8: "D", Q9: "A", Q10: "B" } },
    { student_id: "S15", name: "Ethan Jackson", score: 52, time_taken_minutes: 59, answers: { Q1: "B", Q2: "C", Q3: "D", Q4: "B", Q5: "True", Q6: "B", Q7: "C", Q8: "D", Q9: "B", Q10: "C" } }
  ],
  questions: [
    { question_id: "Q1", type: "MCQ", topic: "Grammar", difficulty: "Easy", correct_answer: "A", marks: 10 },
    { question_id: "Q2", type: "MCQ", topic: "Grammar", difficulty: "Medium", correct_answer: "B", marks: 10 },
    { question_id: "Q3", type: "MCQ", topic: "Vocabulary", difficulty: "Hard", correct_answer: "C", marks: 10 },
    { question_id: "Q4", type: "MCQ", topic: "Vocabulary", difficulty: "Easy", correct_answer: "A", marks: 10 },
    { question_id: "Q5", type: "True or False Questions", topic: "Comprehension", difficulty: "Easy", correct_answer: "True", marks: 10 },
    { question_id: "Q6", type: "MCQ", topic: "Comprehension", difficulty: "Medium", correct_answer: "A", marks: 10 },
    { question_id: "Q7", type: "MCQ", topic: "Literature", difficulty: "Medium", correct_answer: "B", marks: 10 },
    { question_id: "Q8", type: "MCQ", topic: "Literature", difficulty: "Hard", correct_answer: "C", marks: 10 },
    { question_id: "Q9", type: "MCQ", topic: "Writing", difficulty: "Easy", correct_answer: "A", marks: 10 },
    { question_id: "Q10", type: "MCQ", topic: "Writing", difficulty: "Medium", correct_answer: "B", marks: 10 }
  ]
};

async function loadResults() {
  state.results.loading = true;
  render();
  try {
    const response = await fetch("/api/score-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mockClassResults)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analysis failed");
    state.results.data = data.analytics;
    state.results.reportPdfUrl = data.report_pdf_url;
  } catch (error) {
    toast(error.message);
  } finally {
    state.results.loading = false;
    render();
  }
}

function renderSvgPieChart(data, colors) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return "";
  
  let cumulativePercent = 0;
  const radius = 60;
  const cx = 80;
  const cy = 80;
  
  const paths = data.map((item, idx) => {
    const percent = item.value / total;
    const startAngle = cumulativePercent * 360;
    const endAngle = (cumulativePercent + percent) * 360;
    cumulativePercent += percent;
    
    if (percent === 1) {
      return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${colors[idx % colors.length]}" />`;
    }
    
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    
    const largeArcFlag = percent > 0.5 ? 1 : 0;
    
    const pathData = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      "Z"
    ].join(" ");
    
    return `<path d="${pathData}" fill="${colors[idx % colors.length]}" />`;
  }).join("");
  
  let legendHtml = `<div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: var(--ink);">`;
  data.forEach((item, idx) => {
    const color = colors[idx % colors.length];
    legendHtml += `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 3px; background-color: ${color};"></span>
        <strong>${item.label}:</strong> <span>${item.value} (${Math.round((item.value / total) * 100)}%)</span>
      </div>
    `;
  });
  legendHtml += `</div>`;
  
  return `
    <div style="display: flex; align-items: center; justify-content: center; gap: 40px; padding: 10px; flex-wrap: wrap;">
      <svg width="160" height="160" style="overflow: visible;">${paths}</svg>
      ${legendHtml}
    </div>
  `;
}

function renderSvgBarChart(data, color) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const height = 155;
  const width = 450;
  const barW = (width / data.length) * 0.65;
  const barSpacing = (width / data.length) * 0.35;
  
  let bars = "";
  data.forEach((item, idx) => {
    const barH = (item.value / maxVal) * (height * 0.75);
    const barX = idx * (barW + barSpacing) + barSpacing / 2;
    const barY = height - barH - 25;
    
    bars += `
      <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="${color}" rx="4" />
      <text x="${barX + barW/2}" y="${barY - 6}" font-size="10" font-weight="bold" fill="#1e293b" text-anchor="middle">${item.value}</text>
      <text x="${barX + barW/2}" y="${height - 8}" font-size="10" fill="#64748b" text-anchor="middle">${item.label}</text>
    `;
  });
  
  return `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="display: block; overflow: visible;">
      ${bars}
      <line x1="0" y1="${height - 25}" x2="${width}" y2="${height - 25}" stroke="#cbd5e1" stroke-width="1" />
    </svg>
  `;
}

function renderSvgHorizontalBarChart(data, color) {
  const height = data.length * 36 + 20;
  const width = 500;
  const barH = 16;
  
  let bars = "";
  data.forEach((item, idx) => {
    const barY = idx * 36 + 10;
    const barW = (item.value / 100) * (width - 150);
    
    bars += `
      <text x="0" y="${barY + 12}" font-size="11" font-weight="bold" fill="#1e293b">${escapeHtml(item.label)}</text>
      <rect x="140" y="${barY}" width="${width - 140}" height="${barH}" fill="#f1f5f9" rx="3" />
      <rect x="140" y="${barY}" width="${barW}" height="${barH}" fill="${color}" rx="3" />
      <text x="${148 + barW}" y="${barY + 12}" font-size="10" font-weight="bold" fill="#1e293b">${item.value}%</text>
    `;
  });
  
  return `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="display: block; overflow: visible;">
      ${bars}
    </svg>
  `;
}
