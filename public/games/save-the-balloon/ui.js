/* Modular UI Components: GameHeader, GameStats, WordSlots, GameActions, LetterKeyboard, Modals */
(function (global) {
  "use strict";

  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

  /* ---------- WORD SLOTS RENDERER ---------- */
  function renderWordSlots(panelEl, groups, parts, isLetterFn) {
    panelEl.classList.toggle("is-multiline", groups.length > 1 || (parts && parts.length > 9));
    panelEl.innerHTML = groups
      .map(
        (group) =>
          `<div class="word-group">${group
            .map((i) => {
              const ch = parts[i];
              return isLetterFn(ch)
                ? `<div class="letter-slot" data-i="${i}">${esc(ch.toUpperCase())}</div>`
                : `<div class="letter-slot sym revealed" data-i="${i}">${esc(ch)}</div>`;
            })
            .join("")}</div>`
      )
      .join("");
    sizeWordSlots(panelEl, groups);
  }

  function sizeWordSlots(panelEl, groups) {
    const longest = Math.max(1, ...groups.map((g) => g.length));
    const availW = Math.max(260, (panelEl.clientWidth || 340) - 28);
    const gap = 6;
    const rawSize = Math.floor((availW - gap * (longest - 1)) / longest);
    const tileSize = Math.max(22, Math.min(44, rawSize));
    panelEl.style.setProperty("--ts", `${tileSize}px`);
  }

  /* ---------- KEYBOARD RENDERER ---------- */
  function renderKeyboard(kbEl, rows, onGuess) {
    kbEl.innerHTML = rows
      .map(
        (row) =>
          `<div class="kb-row">${row
            .map(
              (k) =>
                `<button type="button" class="kb-key" data-k="${esc(k)}">${esc(k)}</button>`
            )
            .join("")}</div>`
      )
      .join("");

    kbEl.querySelectorAll(".kb-key").forEach((btn) => {
      btn.addEventListener("click", () => onGuess(btn.dataset.k));
    });
  }

  function resetKeyboardVisuals(kbEl) {
    kbEl.querySelectorAll(".kb-key").forEach((btn) => {
      btn.className = "kb-key";
      btn.disabled = false;
    });
  }

  function markKeyVisualState(kbEl, letterKey, isCorrect) {
    const btn = [...kbEl.querySelectorAll(".kb-key")].find((b) => b.dataset.k === letterKey);
    if (!btn) return;
    btn.disabled = true;
    if (isCorrect) {
      btn.classList.add("ok");
    } else {
      btn.classList.add("bad-flash");
      setTimeout(() => {
        btn.classList.remove("bad-flash");
        btn.classList.add("bad");
      }, 320);
    }
  }

  /* ---------- STATS RENDERER ---------- */
  function updateStatsUI(els, { wordIndex, wordTotal, score, seconds, lives, maxLives, showTimer, fmtTime }) {
    els.word.textContent = `${wordIndex + 1} / ${wordTotal}`;
    els.score.textContent = String(score);
    els.balloons.textContent = `${Math.max(0, lives)} / ${maxLives}`;
    els.balloonsPill.classList.toggle("pulse-warn", lives > 0 && lives <= 2);
    els.timeBox.classList.toggle("hidden", !showTimer);
    if (showTimer) {
      els.time.textContent = fmtTime(seconds);
    }
  }

  /* ---------- ROUND OUTCOME MODALS (SUCCESS / GAME OVER) ---------- */
  function showRoundModal(els, { win, word, pointsEarned, livesLeft, maxLives, isLastWord }) {
    els.modal.classList.remove("hidden");
    els.heroImg.src = win
      ? "./save-the-balloon/assets/char-excited.webp"
      : "./save-the-balloon/assets/char-sad.webp";
    els.title.textContent = win ? "Awesome Rescue!" : "Soft Landing!";
    els.sub.textContent = win
      ? "You saved the adventurer and kept the balloons flying!"
      : "The balloons ran out, but you landed safely in the meadow.";
    els.wordReveal.textContent = String(word || "").toUpperCase();
    els.pointsLabel.textContent = win ? `+${pointsEarned} pts` : "+0 pts";
    els.balloonsSummary.textContent = `${Math.max(0, livesLeft)} / ${maxLives}`;
    els.nextBtn.textContent = isLastWord ? "See Final Results ▶" : "Next Word ▶";
  }

  function hideRoundModal(els) {
    els.modal.classList.add("hidden");
  }

  /* ---------- FINAL SUMMARY MODAL ---------- */
  function showFinalSummaryModal(els, { results, score, seconds, showTimer, fmtTime, canEdit, canPlayAgain }) {
    const solved = results.filter((r) => r.ok).length;
    els.solved.textContent = `${solved} / ${results.length}`;
    els.score.textContent = String(score);
    els.time.textContent = fmtTime(seconds);
    els.timeBox.classList.toggle("hidden", !showTimer);
    els.sub.textContent =
      solved === results.length
        ? "Every single balloon adventure completed!"
        : solved >= results.length / 2
          ? "Great spelling work in the sky!"
          : "Nice effort — every flight makes you stronger!";
    els.list.innerHTML = results
      .map((r) => `<span class="${r.ok ? "" : "miss"}">${r.ok ? "✓" : "✗"} ${esc(r.w)}</span>`)
      .join("");
    els.editBtn.classList.toggle("hidden", !canEdit);
    els.againBtn.classList.toggle("hidden", !canPlayAgain);
    els.modal.classList.remove("hidden");
  }

  global.SaveBalloonUI = {
    renderWordSlots,
    sizeWordSlots,
    renderKeyboard,
    resetKeyboardVisuals,
    markKeyVisualState,
    updateStatsUI,
    showRoundModal,
    hideRoundModal,
    showFinalSummaryModal
  };
})(window);
