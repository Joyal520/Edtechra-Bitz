// Learn English with Creepy Legends - Interactive Application Logic

(function() {
  const course = window.CREEPY_LEGENDS_COURSE;
  if (!course) {
    console.error("Course data not found!");
    return;
  }

  // App State
  const state = {
    currentView: 'overview', // 'overview', 'day-1' ... 'day-12', 'final-assessment', 'certificate'
    completedDays: JSON.parse(localStorage.getItem('creepy_completed_days') || '[]'),
    dayScores: JSON.parse(localStorage.getItem('creepy_day_scores') || '{}'),
    finalScore: parseInt(localStorage.getItem('creepy_final_score') || '0', 10),
    studentName: localStorage.getItem('creepy_student_name') || 'Language Explorer',
    isSpeaking: false
  };

  // DOM Elements
  const sidebarNav = document.getElementById('sidebar-nav');
  const mainContent = document.getElementById('main-content');
  const progressFill = document.getElementById('header-progress-fill');
  const progressText = document.getElementById('header-progress-text');
  const drawerToggle = document.getElementById('btn-drawer-toggle');
  const sidebar = document.getElementById('sidebar');

  // Initialize App
  function init() {
    buildSidebar();
    updateProgressUI();
    setupEventListeners();

    // Check URL hash or load overview
    const hash = window.location.hash.replace('#', '');
    if (hash && (hash.startsWith('day-') || hash === 'final-assessment' || hash === 'certificate')) {
      renderView(hash);
    } else {
      renderView('overview');
    }
  }

  // Build Sidebar Nav Links
  function buildSidebar() {
    sidebarNav.innerHTML = `
      <div class="sidebar-title">Course Overview</div>
      <button class="lesson-nav-item ${state.currentView === 'overview' ? 'active' : ''}" data-view="overview">
        <span class="nav-day-badge">🏠</span>
        <span>Course Welcome</span>
      </button>
      <div class="sidebar-title" style="margin-top: 1rem;">12-Day Lessons</div>
    `;

    course.lessons.forEach(lesson => {
      const isCompleted = state.completedDays.includes(lesson.day);
      const isActive = state.currentView === `day-${lesson.day}`;
      const item = document.createElement('button');
      item.className = `lesson-nav-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
      item.dataset.view = `day-${lesson.day}`;
      item.innerHTML = `
        <span class="nav-day-badge">${lesson.day}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${lesson.title}</span>
        <span class="nav-check">✓</span>
      `;
      sidebarNav.appendChild(item);
    });

    // Final Assessment & Certificate Nav
    const finalSection = document.createElement('div');
    finalSection.style.marginTop = '1rem';
    finalSection.innerHTML = `
      <div class="sidebar-title">Graduation</div>
      <button class="lesson-nav-item ${state.currentView === 'final-assessment' ? 'active' : ''}" data-view="final-assessment">
        <span class="nav-day-badge">📝</span>
        <span>Final Assessment (30 Qs)</span>
      </button>
      <button class="lesson-nav-item ${state.currentView === 'certificate' ? 'active' : ''}" data-view="certificate">
        <span class="nav-day-badge">🎓</span>
        <span>Certificate of Completion</span>
      </button>
    `;
    sidebarNav.appendChild(finalSection);
  }

  // Update Header Progress Bar
  function updateProgressUI() {
    const total = 12;
    const completed = state.completedDays.length;
    const percent = Math.min(100, Math.round((completed / total) * 100));
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${completed}/12 Days (${percent}%)`;
  }

  // Set Event Listeners
  function setupEventListeners() {
    // Drawer Toggle on mobile
    if (drawerToggle) {
      drawerToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Sidebar navigation clicks
    sidebarNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.lesson-nav-item');
      if (btn && btn.dataset.view) {
        renderView(btn.dataset.view);
        if (window.innerWidth <= 900) {
          sidebar.classList.remove('open');
        }
      }
    });

    // Hash change handling
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) renderView(hash);
    });
  }

  // Render View Router
  function renderView(viewName) {
    state.currentView = viewName;
    window.location.hash = viewName;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Stop ongoing speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Update active state in sidebar
    document.querySelectorAll('.lesson-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    if (viewName === 'overview') {
      renderOverview();
    } else if (viewName.startsWith('day-')) {
      const dayNum = parseInt(viewName.replace('day-', ''), 10);
      renderDayLesson(dayNum);
    } else if (viewName === 'final-assessment') {
      renderFinalAssessment();
    } else if (viewName === 'certificate') {
      renderCertificate();
    }
  }

  // 1. Render Overview View
  function renderOverview() {
    mainContent.innerHTML = `
      <div class="hero-card">
        <div class="hero-cover-wrapper">
          <img src="${course.coverImage}" alt="${course.title}" class="hero-cover-img" onerror="this.src='/images/creepy-legends-cover.jpg'">
          <div class="hero-gradient-overlay"></div>
        </div>
        <div class="hero-content">
          <div class="hero-badge-row">
            <span class="tag-badge">📚 Level: ${course.level}</span>
            <span class="tag-badge">⏳ ${course.duration}</span>
            <span class="tag-badge">❓ ${course.totalQuestions} Questions</span>
            <span class="tag-badge">🎓 Certificate Included</span>
          </div>
          <h1>${course.title}</h1>
          <div class="hero-subtitle">${course.subtitle}</div>
          <p class="hero-desc">${course.description}</p>
          <button class="btn-nav btn-nav-primary" id="btn-start-course" style="font-size: 1.05rem; padding: 0.85rem 1.85rem;">
            🚀 Start Day 1: The Dog Suicide Bridge
          </button>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">✨</span>
          <h2 class="section-title">Course Learning Pillars</h2>
        </div>
        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1rem;">
          Every day is structured around six core skill areas designed specifically for beginner and elementary learners.
        </p>
        <div class="benefits-grid">
          ${course.benefits.map(b => `
            <div class="benefit-card">
              <div class="benefit-icon">${b.icon}</div>
              <div class="benefit-title">${b.title}</div>
              <div class="benefit-desc">${b.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">🗺️</span>
          <h2 class="section-title">12-Day Legend Roadmap</h2>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-top: 1rem;">
          ${course.lessons.map(l => {
            const isDone = state.completedDays.includes(l.day);
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card-alt); padding: 0.85rem 1.25rem; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer;" onclick="window.location.hash='day-${l.day}'">
                <div style="display: flex; align-items: center; gap: 1rem;">
                  <span class="nav-day-badge" style="background: ${isDone ? 'var(--success)' : 'var(--bg-primary)'}; color: ${isDone ? '#fff' : 'inherit'};">
                    ${isDone ? '✓' : l.day}
                  </span>
                  <div>
                    <div style="font-weight: 700; color: #fff;">${l.title}</div>
                    <div style="font-size: 0.82rem; color: var(--text-muted);">${l.subtitle} • Grammar: ${l.grammar.title}</div>
                  </div>
                </div>
                <span style="font-size: 0.85rem; color: var(--accent-gold); font-weight: 600;">Go to Lesson →</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-start-course').addEventListener('click', () => {
      renderView('day-1');
    });
  }

  // 2. Render Daily Lesson View
  function renderDayLesson(dayNum) {
    const lesson = course.lessons.find(l => l.day === dayNum);
    if (!lesson) {
      renderOverview();
      return;
    }

    const isCompleted = state.completedDays.includes(dayNum);
    const prevDay = dayNum > 1 ? dayNum - 1 : null;
    const nextDay = dayNum < 12 ? dayNum + 1 : null;

    mainContent.innerHTML = `
      <!-- Day Banner -->
      <div class="day-banner">
        <span class="day-badge-large">DAY ${lesson.day} OF 12 ${isCompleted ? '• ✓ COMPLETED' : ''}</span>
        <h1 class="day-lesson-title">${lesson.title}</h1>
        <div class="day-lesson-subtitle">${lesson.subtitle}</div>
      </div>

      <!-- Section 1: Introduction & Goals -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">📖</span>
          <h2 class="section-title">Section 1 — Lesson Introduction</h2>
        </div>
        <p style="font-size: 1.05rem; line-height: 1.7; color: #f1f5f9; margin-bottom: 1.25rem;">
          ${lesson.intro}
        </p>
        <h3 style="font-size: 1.05rem; color: var(--accent-gold); margin-bottom: 0.5rem;">🎯 Today's Learning Goals</h3>
        <ul class="goals-list">
          ${lesson.learningGoals.map(goal => `
            <li class="goal-item">
              <span class="goal-icon">✓</span>
              <span>${goal}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- Section 2: Watch the Story -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">🎬</span>
          <h2 class="section-title">Section 2 — Watch the Story</h2>
        </div>
        <p style="color: var(--text-muted); font-size: 0.95rem;">
          <strong>Instruction:</strong> Watch the video carefully. Try to understand the main story and remember important details.
        </p>

        <div class="pre-question-box">
          <span class="pre-question-icon">💡</span>
          <div class="pre-question-text">
            <strong>Pre-Watching Question:</strong> ${lesson.preWatchingQuestion}
          </div>
        </div>

        <div class="video-container">
          <iframe 
            src="https://www.youtube.com/embed/${lesson.videoId}" 
            title="${lesson.title}" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        </div>
      </div>

      <!-- Section 3: Simple English Story -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">📜</span>
          <h2 class="section-title">Section 3 — Simple English Story</h2>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-muted);">
          Read the simplified A1–A2 English story below. Click <strong>Listen to Story</strong> to hear native pronunciation!
        </p>

        <div class="story-wrapper">
          <div class="story-toolbar">
            <span style="font-size: 0.85rem; color: var(--accent-gold); font-weight: 700; text-transform: uppercase;">
              Story Reader (A1–A2)
            </span>
            <button class="btn-audio" id="btn-read-story">
              <span>🎧</span> <span id="btn-read-text">Listen to Story</span>
            </button>
          </div>
          <div class="story-text" id="story-paragraphs">
            ${lesson.story.split('\n\n').map(p => `<p>${p}</p>`).join('')}
          </div>
        </div>
      </div>

      <!-- Section 4: Vocabulary -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">🔤</span>
          <h2 class="section-title">Section 4 — Vocabulary</h2>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-muted);">
          Master these 8 key words from today's lesson. Click the speaker icon to practice your pronunciation!
        </p>
        <div class="vocab-table-wrapper">
          <table class="vocab-table">
            <thead>
              <tr>
                <th>Word</th>
                <th>Simple Meaning</th>
                <th>Example Sentence</th>
              </tr>
            </thead>
            <tbody>
              ${lesson.vocabulary.map(v => `
                <tr>
                  <td>
                    <div class="vocab-word-cell">
                      <button class="btn-word-audio" data-word="${v.word}" title="Listen to pronunciation">🔊</button>
                      <span>${v.word}</span>
                    </div>
                  </td>
                  <td>${v.meaning}</td>
                  <td style="font-style: italic;">"${v.example}"</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 5: Grammar -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">⚡</span>
          <h2 class="section-title">Section 5 — Grammar Spotlight</h2>
        </div>
        <div class="grammar-box">
          <div class="grammar-title">${lesson.grammar.title}</div>
          <p class="grammar-explanation">${lesson.grammar.explanation}</p>
          <div class="grammar-examples-title">Story Examples:</div>
          <ul class="grammar-examples">
            ${lesson.grammar.examples.map(ex => `<li>${ex}</li>`).join('')}
          </ul>
        </div>
      </div>

      <!-- Section 6: Speaking Activity -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">🗣️</span>
          <h2 class="section-title">Section 6 — Speaking Activity</h2>
        </div>
        <p style="font-size: 1rem; color: #fff; margin-bottom: 0.75rem;">
          <strong>Prompt:</strong> ${lesson.speaking.prompt}
        </p>
        <p style="font-size: 0.88rem; color: var(--text-muted);">
          Click any sentence starter below to practice speaking aloud:
        </p>
        <div class="speaking-starters">
          ${lesson.speaking.starters.map(s => `
            <button class="starter-pill" onclick="window.speechSynthesis && window.speechSynthesis.speak(new SpeechSynthesisUtterance('${s.replace(/'/g, "\\'")}'))">
              💬 "${s}"
            </button>
          `).join('')}
        </div>
        <div style="background: var(--bg-card-alt); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="font-size: 0.9rem; color: #cbd5e1;">
            ⏱️ <strong>Speaking Practice:</strong> Set a 30–60 second timer and summarize the story out loud!
          </div>
          <button class="btn-audio" id="btn-timer-toggle" style="background: var(--bg-card);">
            ⏱️ <span id="timer-label">Start 60s Timer</span>
          </button>
        </div>
      </div>

      <!-- Section 7: Writing Activity -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">✍️</span>
          <h2 class="section-title">Section 7 — Writing Activity</h2>
        </div>
        <p style="font-size: 1rem; color: #fff;">
          <strong>Task:</strong> ${lesson.writing.prompt}
        </p>
        <textarea 
          class="interactive-textarea" 
          id="writing-input-${lesson.day}" 
          placeholder="Type your sentences here in simple English..."></textarea>
        <div class="word-counter-row">
          <span id="word-count-${lesson.day}">Words: 0</span>
          <span id="writing-status-${lesson.day}" style="color: var(--accent-gold);">Aim for at least 25 words!</span>
        </div>
      </div>

      <!-- Section 8: Daily 10-Question Assessment -->
      <div class="section-card" id="quiz-section-${lesson.day}">
        <div class="section-header">
          <span class="section-icon">📝</span>
          <h2 class="section-title">Section 8 — Daily 10-Question Assessment</h2>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
          Every question gives instant feedback. Answer all 10 questions to complete Day ${lesson.day}!
        </p>

        <div class="quiz-wrapper" id="quiz-container-${lesson.day}">
          <!-- Injected via buildDailyQuiz() -->
        </div>
      </div>

      <!-- Section 9: Daily Challenge -->
      <div class="challenge-card">
        <div class="challenge-header">
          <span>🔥</span> Daily Real-World English Challenge
        </div>
        <p style="font-size: 0.95rem; color: #f1f5f9; line-height: 1.6;">
          ${lesson.challenge}
        </p>
      </div>

      <!-- Section 10: Daily Completion -->
      <div class="completion-card" id="day-completion-box" style="display: ${isCompleted ? 'block' : 'none'};">
        <div class="completion-icon">🎉</div>
        <h2 style="color: var(--accent-gold-light); margin-bottom: 0.5rem;">Day ${lesson.day} Complete!</h2>
        <p style="color: var(--text-muted); font-size: 0.95rem;">
          Outstanding effort! You solved the mystery and practiced reading, vocabulary, grammar, and questions.
        </p>
        <div class="completion-stats-grid">
          <div class="stat-box">
            <div class="stat-val">8</div>
            <div class="stat-label">Words Learned</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">1</div>
            <div class="stat-label">Grammar Point</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">10/10</div>
            <div class="stat-label">Questions Completed</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${lesson.day}/12</div>
            <div class="stat-label">Course Progress</div>
          </div>
        </div>
        <div style="font-size: 1.05rem; font-weight: 600; color: #34d399; margin-bottom: 1.5rem;">
          ✓ Lesson Marked as Complete
        </div>
        ${nextDay ? `
          <button class="btn-nav btn-nav-primary" onclick="window.location.hash='day-${nextDay}'" style="padding: 0.85rem 2rem;">
            Proceed to Day ${nextDay} →
          </button>
        ` : `
          <button class="btn-nav btn-nav-primary" onclick="window.location.hash='final-assessment'" style="padding: 0.85rem 2rem;">
            Proceed to Final Course Assessment 🎓
          </button>
        `}
      </div>

      <!-- Lesson Footer Navigation -->
      <div class="lesson-nav-footer">
        <button class="btn-nav" ${prevDay ? `onclick="window.location.hash='day-${prevDay}'"` : 'disabled'}>
          ← Previous Day
        </button>
        <button class="btn-nav btn-nav-primary" ${nextDay ? `onclick="window.location.hash='day-${nextDay}'"` : `onclick="window.location.hash='final-assessment'"`}>
          ${nextDay ? `Next Day (${nextDay}) →` : 'Final Assessment →'}
        </button>
      </div>
    `;

    // Initialize Interactive Features for this lesson
    setupStoryReader(lesson.story);
    setupVocabularyAudio();
    setupSpeakingTimer();
    setupWritingTextarea(lesson.day);
    buildDailyQuiz(lesson);
  }

  // Story Reader (Web Speech API)
  function setupStoryReader(text) {
    const btn = document.getElementById('btn-read-story');
    const label = document.getElementById('btn-read-text');
    if (!btn || !('speechSynthesis' in window)) {
      if (btn) btn.style.display = 'none';
      return;
    }

    btn.addEventListener('click', () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        btn.classList.remove('playing');
        label.textContent = 'Listen to Story';
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.85; // Learner-friendly speed
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';

        utterance.onend = () => {
          btn.classList.remove('playing');
          label.textContent = 'Listen to Story';
        };

        utterance.onerror = () => {
          btn.classList.remove('playing');
          label.textContent = 'Listen to Story';
        };

        window.speechSynthesis.speak(utterance);
        btn.classList.add('playing');
        label.textContent = 'Stop Audio';
      }
    });
  }

  // Word Pronunciation Audio
  function setupVocabularyAudio() {
    document.querySelectorAll('.btn-word-audio').forEach(btn => {
      btn.addEventListener('click', () => {
        const word = btn.dataset.word;
        if ('speechSynthesis' in window && word) {
          const u = new SpeechSynthesisUtterance(word);
          u.rate = 0.8;
          u.lang = 'en-US';
          window.speechSynthesis.speak(u);
        }
      });
    });
  }

  // Speaking Timer
  function setupSpeakingTimer() {
    const btn = document.getElementById('btn-timer-toggle');
    const label = document.getElementById('timer-label');
    if (!btn) return;

    let timer = null;
    let secondsLeft = 60;

    btn.addEventListener('click', () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
        secondsLeft = 60;
        label.textContent = 'Start 60s Timer';
      } else {
        secondsLeft = 60;
        label.textContent = `${secondsLeft}s Remaining...`;
        timer = setInterval(() => {
          secondsLeft--;
          if (secondsLeft <= 0) {
            clearInterval(timer);
            timer = null;
            label.textContent = 'Time Up! Great Job! 🎉';
          } else {
            label.textContent = `${secondsLeft}s Remaining...`;
          }
        }, 1000);
      }
    });
  }

  // Writing Textarea Word Counter
  function setupWritingTextarea(dayNum) {
    const textarea = document.getElementById(`writing-input-${dayNum}`);
    const counter = document.getElementById(`word-count-${dayNum}`);
    const status = document.getElementById(`writing-status-${dayNum}`);
    if (!textarea) return;

    // Load saved writing
    const saved = localStorage.getItem(`creepy_writing_day_${dayNum}`);
    if (saved) {
      textarea.value = saved;
      updateCount();
    }

    textarea.addEventListener('input', () => {
      localStorage.setItem(`creepy_writing_day_${dayNum}`, textarea.value);
      updateCount();
    });

    function updateCount() {
      const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
      counter.textContent = `Words: ${words}`;
      if (words >= 25) {
        status.textContent = '✨ Excellent writing length!';
        status.style.color = '#34d399';
      } else {
        status.textContent = 'Aim for at least 25 words!';
        status.style.color = 'var(--accent-gold)';
      }
    }
  }

  // Build Daily 10-Question Assessment
  function buildDailyQuiz(lesson) {
    const container = document.getElementById(`quiz-container-${lesson.day}`);
    if (!container) return;
    container.innerHTML = '';

    let answeredCount = 0;

    lesson.quiz.forEach((q, idx) => {
      const qNum = idx + 1;
      const card = document.createElement('div');
      card.className = 'quiz-question-card';
      card.id = `q-card-${lesson.day}-${qNum}`;

      let partLabel = '';
      if (idx < 3) partLabel = 'Part A — Multiple Choice';
      else if (idx < 6) partLabel = 'Part B — True or False';
      else if (idx < 9) partLabel = 'Part C — Short Answer';
      else partLabel = 'Part D — Sentence Reorder';

      let inner = `
        <div class="question-header">
          <span class="question-num-tag">${partLabel} • Q${qNum}</span>
        </div>
        <div class="question-text">${q.question}</div>
      `;

      if (q.type === 'mcq') {
        const letters = ['A', 'B', 'C', 'D'];
        inner += `
          <div class="options-grid">
            ${q.options.map((opt, optIdx) => `
              <button class="option-btn" data-opt="${optIdx}">
                <span class="option-letter">${letters[optIdx]}</span>
                <span>${opt}</span>
              </button>
            `).join('')}
          </div>
        `;
      } else if (q.type === 'tf') {
        inner += `
          <div class="tf-grid">
            <button class="tf-btn" data-val="true">True</button>
            <button class="tf-btn" data-val="false">False</button>
          </div>
        `;
      } else if (q.type === 'short') {
        inner += `
          <div class="short-answer-row">
            <input type="text" class="short-answer-input" placeholder="Type your answer here..." />
            <button class="btn-check-short">Submit</button>
          </div>
        `;
      } else if (q.type === 'reorder') {
        inner += `
          <div class="reorder-container">
            <div style="font-size: 0.85rem; color: var(--text-muted);">Click words to place them in order:</div>
            <div class="chip-target" id="chip-target-${lesson.day}"></div>
            <div class="chip-pool" id="chip-pool-${lesson.day}">
              ${q.scrambled.map(w => `<span class="word-chip">${w}</span>`).join('')}
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              <button class="btn-check-reorder" id="btn-check-reorder-${lesson.day}">Check Order</button>
              <button class="btn-nav" id="btn-reset-reorder-${lesson.day}" style="padding: 0.5rem 1rem;">Reset</button>
            </div>
          </div>
        `;
      }

      inner += `<div class="feedback-banner" id="fb-${lesson.day}-${qNum}"></div>`;
      card.innerHTML = inner;
      container.appendChild(card);

      // Attach interaction handlers per question
      attachQuestionHandlers(card, q, lesson.day, qNum, () => {
        answeredCount++;
        checkLessonCompletion(lesson.day, answeredCount);
      });
    });
  }

  // Handle Question Responses
  function attachQuestionHandlers(card, q, dayNum, qNum, onAnswered) {
    const fb = card.querySelector(`#fb-${dayNum}-${qNum}`);
    let isDone = false;

    if (q.type === 'mcq') {
      const btns = card.querySelectorAll('.option-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (isDone) return;
          isDone = true;
          const chosen = parseInt(btn.dataset.opt, 10);
          if (chosen === q.answer) {
            btn.classList.add('correct');
            showFeedback(fb, true, q.feedbackCorrect);
          } else {
            btn.classList.add('incorrect');
            btns[q.answer].classList.add('correct');
            showFeedback(fb, false, q.feedbackIncorrect);
          }
          btns.forEach(b => b.disabled = true);
          onAnswered();
        });
      });
    } else if (q.type === 'tf') {
      const btns = card.querySelectorAll('.tf-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (isDone) return;
          isDone = true;
          const chosenVal = btn.dataset.val === 'true';
          if (chosenVal === q.answer) {
            btn.classList.add('correct');
            showFeedback(fb, true, q.feedbackCorrect);
          } else {
            btn.classList.add('incorrect');
            const other = Array.from(btns).find(b => b !== btn);
            if (other) other.classList.add('correct');
            showFeedback(fb, false, q.feedbackIncorrect);
          }
          btns.forEach(b => b.disabled = true);
          onAnswered();
        });
      });
    } else if (q.type === 'short') {
      const input = card.querySelector('.short-answer-input');
      const submitBtn = card.querySelector('.btn-check-short');
      function checkShort() {
        if (isDone) return;
        const val = input.value.trim().toLowerCase();
        if (!val) return;
        isDone = true;
        const isMatch = q.acceptedAnswers.some(ans => val.includes(ans) || ans.includes(val));
        if (isMatch) {
          input.style.borderColor = 'var(--success)';
          showFeedback(fb, true, q.feedbackCorrect);
        } else {
          input.style.borderColor = 'var(--error)';
          showFeedback(fb, false, `${q.feedbackIncorrect} (Accepted: "${q.acceptedAnswers[0]}")`);
        }
        input.disabled = true;
        submitBtn.disabled = true;
        onAnswered();
      }
      submitBtn.addEventListener('click', checkShort);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') checkShort();
      });
    } else if (q.type === 'reorder') {
      const target = card.querySelector(`#chip-target-${dayNum}`);
      const pool = card.querySelector(`#chip-pool-${dayNum}`);
      const checkBtn = card.querySelector(`#btn-check-reorder-${dayNum}`);
      const resetBtn = card.querySelector(`#btn-reset-reorder-${dayNum}`);

      // Word movement
      pool.addEventListener('click', (e) => {
        if (e.target.classList.contains('word-chip')) {
          target.appendChild(e.target);
        }
      });
      target.addEventListener('click', (e) => {
        if (e.target.classList.contains('word-chip')) {
          pool.appendChild(e.target);
        }
      });

      resetBtn.addEventListener('click', () => {
        Array.from(target.querySelectorAll('.word-chip')).forEach(chip => pool.appendChild(chip));
      });

      checkBtn.addEventListener('click', () => {
        if (isDone) return;
        const words = Array.from(target.querySelectorAll('.word-chip')).map(c => c.textContent);
        const sentence = words.join(' ');
        // Normalise checking
        const cleanAnswer = q.answer.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().trim();
        const cleanUser = sentence.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().trim();

        if (cleanAnswer === cleanUser) {
          isDone = true;
          showFeedback(fb, true, q.feedbackCorrect);
          checkBtn.disabled = true;
          resetBtn.disabled = true;
          onAnswered();
        } else {
          showFeedback(fb, false, `Try again! Notice the capital letter at the start.`);
        }
      });
    }
  }

  function showFeedback(fbElem, isCorrect, message) {
    if (!fbElem) return;
    fbElem.className = `feedback-banner show ${isCorrect ? 'correct' : 'incorrect'}`;
    fbElem.innerHTML = `<strong>${isCorrect ? '✓ Correct!' : '✗ Not quite.'}</strong> ${message}`;
  }

  // Check if all 10 questions answered
  function checkLessonCompletion(dayNum, count) {
    if (count >= 10) {
      if (!state.completedDays.includes(dayNum)) {
        state.completedDays.push(dayNum);
        localStorage.setItem('creepy_completed_days', JSON.stringify(state.completedDays));
        buildSidebar();
        updateProgressUI();
      }
      const compBox = document.getElementById('day-completion-box');
      if (compBox) {
        compBox.style.display = 'block';
        compBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  // 3. Render Final Course Assessment
  function renderFinalAssessment() {
    const final = course.finalAssessment;
    mainContent.innerHTML = `
      <div class="day-banner">
        <span class="day-badge-large">COURSE GRADUATION</span>
        <h1 class="day-lesson-title">${final.title}</h1>
        <div class="day-lesson-subtitle">Comprehensive Review for A1–A2 English Learners</div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">🏆</span>
          <h2 class="section-title">Final Assessment Overview</h2>
        </div>
        <p style="font-size: 1rem; color: #f1f5f9; line-height: 1.7;">
          ${final.description}
        </p>
      </div>

      <!-- Part 1: Vocabulary Review (10 questions) -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">🔤</span>
          <h2 class="section-title">Part 1 — Vocabulary Mastery (10 Questions)</h2>
        </div>
        <div class="quiz-wrapper" id="final-vocab-container"></div>
      </div>

      <!-- Part 2: Grammar Review (10 questions) -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">⚡</span>
          <h2 class="section-title">Part 2 — Grammar In Action (10 Questions)</h2>
        </div>
        <div class="quiz-wrapper" id="final-grammar-container"></div>
      </div>

      <!-- Part 3: Reading Comprehension (10 questions) -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">📜</span>
          <h2 class="section-title">Part 3 — Legend Comprehension (10 Questions)</h2>
        </div>
        <div class="quiz-wrapper" id="final-reading-container"></div>
      </div>

      <!-- Part 4: Short Writing Task -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">✍️</span>
          <h2 class="section-title">Part 4 — Final Writing Challenge</h2>
        </div>
        <p style="font-size: 1rem; color: #fff; line-height: 1.6;">
          <strong>Task:</strong> ${final.writingTask.prompt}
        </p>
        <textarea class="interactive-textarea" id="final-writing-input" placeholder="Write your 5–7 sentences here..."></textarea>
      </div>

      <!-- Part 5: Speaking Task -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">🗣️</span>
          <h2 class="section-title">Part 5 — Final Speaking Challenge</h2>
        </div>
        <p style="font-size: 1rem; color: #fff; line-height: 1.6;">
          <strong>Task:</strong> ${final.speakingTask.prompt}
        </p>
      </div>

      <!-- Final Grade & Certificate Trigger -->
      <div class="completion-card">
        <div class="completion-icon">🎓</div>
        <h2 style="color: var(--accent-gold-light);">Claim Your Certificate of Completion!</h2>
        <p style="color: var(--text-muted); margin: 0.75rem 0 1.5rem;">
          Enter your name as you wish it to appear on your official Certificate of Completion:
        </p>
        <div style="max-width: 400px; margin: 0 auto 1.5rem; display: flex; gap: 0.5rem;">
          <input type="text" id="cert-name-input" class="short-answer-input" value="${state.studentName}" placeholder="Your Full Name" style="font-size: 1.05rem;" />
        </div>
        <button class="btn-nav btn-nav-primary" id="btn-generate-cert" style="font-size: 1.1rem; padding: 0.85rem 2rem;">
          Generate My Certificate →
        </button>
      </div>
    `;

    renderQuizList('final-vocab-container', final.vocabularyQuestions, 'Vocab');
    renderQuizList('final-grammar-container', final.grammarQuestions, 'Grammar');
    renderQuizList('final-reading-container', final.readingQuestions, 'Reading');

    document.getElementById('btn-generate-cert').addEventListener('click', () => {
      const nameInput = document.getElementById('cert-name-input');
      if (nameInput && nameInput.value.trim()) {
        state.studentName = nameInput.value.trim();
        localStorage.setItem('creepy_student_name', state.studentName);
      }
      renderView('certificate');
    });
  }

  function renderQuizList(containerId, questionList, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;

    questionList.forEach((q, idx) => {
      const qNum = idx + 1;
      const card = document.createElement('div');
      card.className = 'quiz-question-card';
      const letters = ['A', 'B', 'C', 'D'];

      card.innerHTML = `
        <div class="question-header">
          <span class="question-num-tag">${prefix} Q${qNum}</span>
        </div>
        <div class="question-text">${q.question}</div>
        <div class="options-grid">
          ${q.options.map((opt, optIdx) => `
            <button class="option-btn" data-opt="${optIdx}">
              <span class="option-letter">${letters[optIdx]}</span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>
        <div class="feedback-banner" id="final-fb-${prefix}-${qNum}"></div>
      `;
      container.appendChild(card);

      const btns = card.querySelectorAll('.option-btn');
      const fb = card.querySelector(`#final-fb-${prefix}-${qNum}`);
      let answered = false;

      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          const chosen = parseInt(btn.dataset.opt, 10);
          if (chosen === q.answer) {
            btn.classList.add('correct');
            showFeedback(fb, true, q.feedback);
          } else {
            btn.classList.add('incorrect');
            btns[q.answer].classList.add('correct');
            showFeedback(fb, false, q.feedback);
          }
          btns.forEach(b => b.disabled = true);
        });
      });
    });
  }

  // 4. Render Certificate View
  function renderCertificate() {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    mainContent.innerHTML = `
      <div class="day-banner">
        <span class="day-badge-large">OFFICIAL ACHIEVEMENT</span>
        <h1 class="day-lesson-title">Certificate of Completion</h1>
        <div class="day-lesson-subtitle">Learn English with Creepy Legends (A1–A2)</div>
      </div>

      <div style="display: flex; justify-content: center; gap: 1rem; margin-bottom: 1.5rem;">
        <button class="btn-nav btn-nav-primary" onclick="window.print()">
          🖨️ Print / Save as PDF
        </button>
        <button class="btn-nav" onclick="window.location.hash='overview'">
          🏠 Back to Course Home
        </button>
      </div>

      <div class="certificate-preview-wrapper">
        <div class="certificate-frame">
          <div class="cert-corner cert-top-left"></div>
          <div class="cert-corner cert-top-right"></div>
          <div class="cert-corner cert-bottom-left"></div>
          <div class="cert-corner cert-bottom-right"></div>

          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚜️</div>
          <h1 class="cert-title">Certificate of Completion</h1>
          <div class="cert-subtitle">LEARN ENGLISH WITH CREEPY LEGENDS • 12-DAY COURSE</div>

          <div class="cert-presented-to">This is proudly presented to:</div>
          <div class="cert-student-name" contenteditable="true" id="editable-cert-name" title="Click to edit name">
            ${state.studentName}
          </div>

          <p class="cert-body-text">
            For successfully completing all 12 days of reading, vocabulary, grammar, and oral storytelling, mastering 96+ key English vocabulary terms, and passing all 120 interactive assessments at the <strong>A1–A2 English Proficiency Level</strong>.
          </p>

          <div class="cert-footer-row">
            <div>
              <div class="cert-sig-line">${today}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; margin-top: 2px;">Date of Issue</div>
            </div>

            <div class="cert-seal">
              <span>★ ★ ★</span>
              <span>VERIFIED</span>
              <span>A1–A2</span>
            </div>

            <div>
              <div class="cert-sig-line">EdTechra Academic Board</div>
              <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; margin-top: 2px;">Course Director</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const editName = document.getElementById('editable-cert-name');
    if (editName) {
      editName.addEventListener('blur', () => {
        state.studentName = editName.textContent.trim() || 'Language Explorer';
        localStorage.setItem('creepy_student_name', state.studentName);
      });
    }
  }

  // Run initial setup on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();
