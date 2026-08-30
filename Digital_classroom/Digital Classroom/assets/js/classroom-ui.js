class ClassroomUI {
  static getRouteHref(target, params = {}) {
    const classroomId = params.classroomId || params.id;
    const inRootRuntime = Boolean(window.App);

    if (!inRootRuntime) {
      if (target === "dashboard") return "teacher-dashboard.html";
      if (target === "create") return "create-classroom.html";
      if (target === "detail") return `classroom-detail.html?classroomId=${encodeURIComponent(classroomId || "")}`;
      if (target === "exam") return `exam.html?classroomId=${encodeURIComponent(classroomId || "")}`;
      if (target === "activityHub") return `activity-hub.html?classroomId=${encodeURIComponent(classroomId || "")}`;
      if (target === "ocrGrading") return `ocr-grading.html?classroomId=${encodeURIComponent(classroomId || "")}`;
      if (target === "resources") return `teacher-resources.html?classroomId=${encodeURIComponent(classroomId || "")}`;
      if (target === "savedCollections") return `saved-collections.html?classroomId=${encodeURIComponent(classroomId || "")}`;
      if (target === "student") return `student-dashboard.html?classroomId=${encodeURIComponent(classroomId || "")}`;
      if (target === "studentExams") return `student-exams.html?classroomId=${encodeURIComponent(classroomId || "")}`;
      if (target === "studentExam") return `student-exam.html?classroomId=${encodeURIComponent(classroomId || "")}&examId=${encodeURIComponent(params.examId || "")}`;
      if (target === "join") return `join-classroom.html?classroomId=${encodeURIComponent(classroomId || "")}`;
    }

    if (target === "dashboard") return "#classroom";
    if (target === "create") return "#classroom/create";
    if (target === "detail") return `#classroom/detail/${encodeURIComponent(classroomId || "")}`;
    if (target === "exam") return classroomId ? `#classroom/exam/${encodeURIComponent(classroomId)}` : "#classroom/exam";
    if (target === "activityHub") return classroomId ? `#classroom/activity-hub/${encodeURIComponent(classroomId)}` : "#classroom/activity-hub";
    if (target === "ocrGrading") return classroomId ? `#classroom/ocr-grading/${encodeURIComponent(classroomId)}` : "#classroom/ocr-grading";
    if (target === "resources") return "#classroom/resources";
    if (target === "savedCollections") {
      const classroomParam = classroomId ? `?classroomId=${encodeURIComponent(classroomId)}` : "";
      return `#classroom/saved-collections${classroomParam}`;
    }
    if (target === "student") return `#classroom/student/${encodeURIComponent(classroomId || "")}`;
    if (target === "studentExams") return `#classroom/student-exams/${encodeURIComponent(classroomId || "")}`;
    if (target === "studentExam") return `#classroom/student-exam/${encodeURIComponent(classroomId || "")}?examId=${encodeURIComponent(params.examId || "")}`;
    if (target === "join") return `#classroom/join/${encodeURIComponent(classroomId || "")}`;
    if (target === "myClasses") return "#my-classes";
    return "#classroom";
  }

  static getRootRouteHref(target, params = {}) {
    const classroomId = params.classroomId || params.id || "";
    if (window.App) {
      if (target === "upload") {
        const classroomParam = classroomId ? `&classroomId=${encodeURIComponent(classroomId)}` : "";
        return `#upload?context=classroom&source=digital_classroom${classroomParam}`;
      }
      if (target === "myUploads") {
        const classroomParam = classroomId ? `?classroomId=${encodeURIComponent(classroomId)}` : "";
        return `#classroom/resources${classroomParam}`;
      }
      if (target === "savedCollections") {
        const classroomParam = classroomId ? `?classroomId=${encodeURIComponent(classroomId)}` : "";
        return `#classroom/saved-collections${classroomParam}`;
      }
      if (target === "explore") return "#explore";
    }

    const rootPath = window.location.pathname.replace(/Digital_classroom\/Digital%20Classroom\/[^/]*$/i, "");
    if (target === "upload") {
      const classroomParam = classroomId ? `&classroomId=${encodeURIComponent(classroomId)}` : "";
      return `${window.location.origin}${rootPath}#upload?context=classroom&source=digital_classroom${classroomParam}`;
    }
    if (target === "myUploads") {
      const classroomParam = classroomId ? `?classroomId=${encodeURIComponent(classroomId)}` : "";
      return `${window.location.origin}${rootPath}#classroom/resources${classroomParam}`;
    }
    if (target === "savedCollections") {
      const classroomParam = classroomId ? `?classroomId=${encodeURIComponent(classroomId)}` : "";
      return `${window.location.origin}${rootPath}#classroom/saved-collections${classroomParam}`;
    }
    if (target === "explore") return `${window.location.origin}${rootPath}#explore`;
    return "#";
  }

  static escape(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  static getTeacherAssets() {
    const rootImages = "../../assets/images/";
    return {
      classroomHero: `${rootImages}classroom.webp`,
      aiRobot: `${rootImages}ai-robot.webp`,
      tasksEmpty: `${rootImages}tasks-empty.webp`,
      messagesEmpty: `${rootImages}messages-empty.webp`
    };
  }

  static renderTeacherAssetImage(src, alt, className = "") {
    return `
      <div class="teacher-asset-frame ${className}">
        <img src="${this.escape(src)}" alt="${this.escape(alt)}" loading="lazy" decoding="async" onerror="this.closest('.teacher-asset-frame')?.classList.add('is-missing'); this.remove();">
        <div class="teacher-asset-fallback" aria-hidden="true">
          <span>${this.escape(alt)}</span>
        </div>
      </div>
    `;
  }

  static getBrandLogoSrc() {
    return this.getBrandLogoAsset("horizontalLight");
  }

  static getBrandLogoAsset(kind = "horizontalLight") {
    const assets = window.EdTechraBrandAssets?.logos || {};
    const asset = assets[kind] || assets.horizontalLight || "/assets/logos/edtechra-logo-light.png";
    return window.App ? asset : `../../${asset}`;
  }

  static setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  static renderSidebar(activePage = "dashboard") {
    if (activePage === "detail" || activePage === "exam" || activePage === "ocr-grading") return "";

    const links = activePage === "detail"
      ? [
        ["detail", "#", "Classroom", this.getIcon("classroom")],
        ["overview", "#classroom-title", "Overview", this.getIcon("home")],
        ["students", "#students-container", "Students", this.getIcon("users")],
        ["tasks", "#assignment-form", "Tasks", this.getIcon("assignment")],
        ["quizzes", "#", "Quizzes", this.getIcon("play")],
        ["exams", "#assignment-form", "Exams", this.getIcon("clipboard")],
        ["competitions", "#future-activity-routing", "Competitions", this.getIcon("trophy")],
        ["attendance", "#attendance-container", "Attendance", this.getIcon("attendance")],
        ["reports", "#analytics-container", "Reports", this.getIcon("bars")],
        ["ai-reports", "#ai-feedback-output", "AI Reports", this.getIcon("sparkles")],
        ["settings", "#danger-notice", "Settings", this.getIcon("settings")]
      ]
      : [
      ["dashboard", this.getRouteHref("dashboard"), "Home", this.getIcon("home")],
      ["create", this.getRouteHref("create"), "Create", this.getIcon("plusSquare")],
      ["activity-hub", this.getRouteHref("dashboard"), "Activities", this.getIcon("assignment")],
      ["teacher-resources", this.getRouteHref("resources"), "Resources", this.getIcon("library")],
      ["content", this.getRouteHref("dashboard"), "Content", this.getIcon("library")],
      ["leaderboard", this.getRouteHref("dashboard"), "Leaderboard", this.getIcon("trophy")],
      ["analytics", this.getRouteHref("dashboard"), "Analytics", this.getIcon("bars")],
      ["feedback", this.getRouteHref("dashboard"), "AI Feedback", this.getIcon("sparkles")]
    ];

    return `
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="teacher-dashboard.html" aria-label="Edtechra Digital Classroom">
          <span class="brand-mark">
            <img class="classroom-brand-logo-mark" src="${this.getBrandLogoAsset("icon")}" alt="Edtechra">
          </span>
          <span class="brand-copy">
            <img class="classroom-brand-logo" src="${this.getBrandLogoSrc()}" alt="Edtechra">
            <small>Classroom</small>
          </span>
        </a>
        <nav class="nav-menu" aria-label="Teacher navigation">
          ${links.map(([key, href, label, icon]) => `
            <a href="${href}" class="nav-link ${activePage === key ? "active" : ""}" aria-label="${label}">
              <span class="nav-icon">${icon}</span>
              <span class="nav-label">${label}</span>
            </a>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <a href="#settings" class="nav-link nav-link-ghost" aria-label="Settings">
            <span class="nav-icon">${this.getIcon("settings")}</span>
            <span class="nav-label">Settings</span>
          </a>
          <div class="sidebar-profile glass-chip">
            <span class="avatar avatar-small">TC</span>
            <div>
              <strong>Teacher</strong>
              <span>Control Center</span>
            </div>
          </div>
        </div>
      </aside>
    `;
  }

  static renderMobileNav(activePage = "dashboard") {
    const links = [
      ["dashboard", this.getRouteHref("dashboard"), "Home", this.getIcon("home")],
      ["create", this.getRouteHref("create"), "Create", this.getIcon("plusSquare")],
      ["activity-hub", this.getRouteHref("dashboard"), "Activities", this.getIcon("assignment")],
      ["teacher-resources", this.getRouteHref("resources"), "Resources", this.getIcon("library")],
      ["content", this.getRouteHref("dashboard"), "Content", this.getIcon("library")],
      ["leaderboard", this.getRouteHref("dashboard"), "Ranks", this.getIcon("trophy")],
      ["analytics", this.getRouteHref("dashboard"), "Stats", this.getIcon("bars")]
    ];

    return `
      <nav class="mobile-nav glass-panel" aria-label="Mobile navigation">
        ${links.map(([key, href, label, icon]) => `
          <a href="${href}" class="mobile-nav-link ${activePage === key ? "active" : ""}">
            <span class="nav-icon">${icon}</span>
            <span>${label}</span>
          </a>
        `).join("")}
      </nav>
    `;
  }

  static getIcon(name) {
    const icons = {
      home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>`,
      plusSquare: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`,
      library: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6.5A2.5 2.5 0 0 0 4 22Z"/><path d="M8 4v16"/></svg>`,
      trophy: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v3a4 4 0 0 1-8 0Z"/><path d="M6 7H4a3 3 0 0 0 3 3"/><path d="M18 7h2a3 3 0 0 1-3 3"/><path d="M12 11v4"/><path d="M9 20h6"/><path d="M10 15h4"/></svg>`,
      bars: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10"/><path d="M12 20V4"/><path d="M19 20v-7"/></svg>`,
      play: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>`,
      broadcast: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12h.01"/><path d="M8.5 8.5a5 5 0 0 0 0 7"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M5.5 5.5a9 9 0 0 0 0 13"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>`,
      book: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M4 5.5v16"/><path d="M8 7h8"/></svg>`,
      calendar: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/><path d="m9 15 2 2 4-5"/></svg>`,
      check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>`,
      sparkles: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 3v4"/><path d="M21 5h-4"/><path d="M4 17v4"/><path d="M6 19H2"/></svg>`,
      settings: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z"/><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z"/></svg>`,
      classroom: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="3"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`,
      users: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><path d="M9.5 11A4 4 0 1 0 9.5 3A4 4 0 1 0 9.5 11Z"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>`,
      assignment: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="3"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>`,
      clipboard: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4.5h6v3H9z"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>`,
      attendance: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/><path d="m8 15 2 2 5-5"/></svg>`,
      award: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="m8.5 12.5-1.5 8 5-3 5 3-1.5-8"/></svg>`,
      bell: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`,
      folder: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z"/></svg>`,
      headphones: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v4a2 2 0 0 0 2 2h2v-7H6a2 2 0 0 0-2 2"/><path d="M20 13v4a2 2 0 0 1-2 2h-2v-7h2a2 2 0 0 1 2 2"/></svg>`,
      trendingUp: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17 6-6 4 4 7-8"/><path d="M14 7h6v6"/></svg>`,
      message: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v5A3.5 3.5 0 0 1 16.5 15H12l-5 4v-4A3 3 0 0 1 4 12Z"/></svg>`,
      send: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-9 9"/><path d="m21 3-6 18-3-9-9-3Z"/></svg>`,
      arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>`,
      arrowLeft: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>`,
      arrowUp: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg>`,
      arrowDown: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="m18 13-6 6-6-6"/></svg>`,
      dots: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>`,
      search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>`,
      star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 10 18H2Z"/><path d="M12 9v5"/><path d="M12 18h.01"/></svg>`,
      archive: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="5" rx="2"/><path d="M6 9v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/></svg>`,
      trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/></svg>`
    };

    return icons[name] || "";
  }

  static getDashboardIcon(name) {
    const icons = {
      students: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 11.5a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/><path d="M15.5 10.5a3 3 0 1 0 0-6"/><path d="M2.5 21v-1.5a5.5 5.5 0 0 1 11 0V21"/><path d="M14.8 15.2A4.8 4.8 0 0 1 21.5 19.6V21"/></svg>`,
      assignments: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="4"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h3"/><path d="M16 3.5v3H8v-3"/></svg>`,
      submissions: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><rect x="4" y="13" width="16" height="7" rx="3"/><path d="M8 16.5h8"/></svg>`,
      completion: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0Z"/><path d="M7 6H4.5A2.5 2.5 0 0 0 7 10"/><path d="M17 6h2.5A2.5 2.5 0 0 1 17 10"/></svg>`,
      performance: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12 19 5"/><path d="M17 5h2v2"/></svg>`,
      deadlines: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="4"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/><path d="M9 14h3"/><path d="M9 17h6"/></svg>`,
      contentPreview: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/><circle cx="12" cy="12" r="9"/></svg>`,
      attendance: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 20V11"/><path d="M12 20V5"/><path d="M18 20v-8"/><rect x="4" y="11" width="4" height="9" rx="2"/><rect x="10" y="5" width="4" height="15" rx="2"/><rect x="16" y="12" width="4" height="8" rx="2"/></svg>`,
      classroomDefault: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="11" rx="3"/><path d="M8 20h8"/><path d="M12 16v4"/><path d="M8 9h8"/></svg>`,
      classroomEnglish: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5c2.8-1.4 5.2-1.4 8 0v13c-2.8-1.4-5.2-1.4-8 0Z"/><path d="M12 6.5c2.8-1.4 5.2-1.4 8 0v13c-2.8-1.4-5.2-1.4-8 0Z"/><path d="M8 10h1.5"/><path d="M15 10h1.5"/></svg>`,
      classroomMaths: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M8.5 8h7"/><path d="M9 12h.1"/><path d="M12 12h.1"/><path d="M15 12h.1"/><path d="M9 16h.1"/><path d="M12 16h.1"/><path d="M15 16h.1"/></svg>`,
      classroomScience: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3h4"/><path d="M11 3v5l-5 9a3 3 0 0 0 2.6 4.5h6.8A3 3 0 0 0 18 17l-5-9V3"/><path d="M8.5 16h7"/></svg>`,
      chevron: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`
    };

    return icons[name] || icons.classroomDefault;
  }

  static hydrateDashboardIcons(root = document) {
    root.querySelectorAll("[data-dashboard-icon]").forEach((element) => {
      element.innerHTML = this.getDashboardIcon(element.dataset.dashboardIcon);
    });
    root.querySelectorAll("[data-icon]").forEach((element) => {
      element.innerHTML = this.getIcon(element.dataset.icon);
    });
  }

  static getClassroomVisualType(classroom = {}) {
    const subject = String(classroom.subject || "").toLowerCase();
    if (subject.includes("math")) return "maths";
    if (subject.includes("science") || subject.includes("physics") || subject.includes("chem") || subject.includes("bio")) return "science";
    if (subject.includes("english") || subject.includes("writing") || subject.includes("literature")) return "english";
    return "default";
  }

  static getClassroomLabel(classroom = {}) {
    const subject = String(classroom.subject || "").trim();
    const grade = String(classroom.grade || "").trim();
    if (subject && grade) return `${subject} • ${grade}`;
    if (subject) return subject;
    if (grade) return grade;
    return "Classroom";
  }

  static renderClassroomIllustration(classroom = {}) {
    const visualType = this.getClassroomVisualType(classroom);
    const isMath = visualType === "maths";
    const isScience = visualType === "science";
    const isEnglish = visualType === "english";

    return `
      <svg class="classroom-card-art" viewBox="0 0 360 150" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="card-art-surface-${this.escape(classroom.id || "default")}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffffff"/>
            <stop offset="1" stop-color="#edf6ff"/>
          </linearGradient>
        </defs>
        <rect x="14" y="18" width="332" height="112" rx="26" fill="url(#card-art-surface-${this.escape(classroom.id || "default")})" opacity=".92"/>
        <ellipse cx="190" cy="126" rx="128" ry="12" fill="#b9c8e8" opacity=".22"/>
        <rect x="72" y="78" width="108" height="28" rx="10" fill="#f2c990"/>
        <path d="M88 106v22M164 106v22" stroke="#b4875f" stroke-width="7" stroke-linecap="round"/>
        <rect x="96" y="50" width="46" height="38" rx="14" fill="#7b61ff"/>
        <path d="M214 74c-18-32 1-60 28-58 20 2 26 25 9 43 21-12 45-4 45 18 0 25-38 31-82-3z" fill="#87c977"/>
        <rect x="231" y="72" width="28" height="44" rx="9" fill="#e7c49a"/>
        ${isMath ? `
          <rect x="206" y="56" width="52" height="68" rx="10" fill="#55a8ff"/>
          <circle cx="219" cy="74" r="5" fill="#e9f7ff"/><circle cx="237" cy="74" r="5" fill="#e9f7ff"/>
          <path d="M216 92h32M216 108h22" stroke="#e9f7ff" stroke-width="6" stroke-linecap="round"/>
          <path d="M274 74h34M291 57v34" stroke="#ff9b42" stroke-width="9" stroke-linecap="round"/>
        ` : ""}
        ${isScience ? `
          <path d="M236 44h28v18l26 50c5 10-2 20-13 20h-54c-11 0-18-10-13-20l26-50z" fill="#bda4ff" opacity=".9"/>
          <path d="M226 108h48" stroke="#6b7ff7" stroke-width="8" stroke-linecap="round"/>
          <rect x="272" y="42" width="28" height="76" rx="8" transform="rotate(22 286 80)" fill="#4f8cff"/>
        ` : ""}
        ${isEnglish ? `
          <path d="M210 88c24-18 56-18 82 0v44c-26-16-58-16-82 0z" fill="#fff8e8" stroke="#f3b55f" stroke-width="5"/>
          <path d="M251 88v43M224 104h18M262 104h18" stroke="#f3b55f" stroke-width="4" stroke-linecap="round"/>
          <rect x="292" y="78" width="12" height="48" rx="6" fill="#7b61ff"/>
          <rect x="310" y="72" width="12" height="54" rx="6" fill="#ff9b42"/>
        ` : ""}
        ${!isMath && !isScience && !isEnglish ? `
          <rect x="212" y="46" width="86" height="54" rx="12" fill="#53b39f"/>
          <path d="M228 70h54M228 86h36" stroke="#dffcf5" stroke-width="6" stroke-linecap="round"/>
        ` : ""}
      </svg>
    `;
  }

  static mountShell(activePage) {
    const shell = document.getElementById("app-shell");
    if (!shell) return;

    if (activePage !== "detail") document.body.classList.remove("teacher-classroom-detail");
    if (activePage !== "exam") this.unmountExam2();
    if (activePage !== "ocr-grading") this.unmountOcrGrading();

    const sidebarMarkup = this.renderSidebar(activePage);
    if (sidebarMarkup) shell.insertAdjacentHTML("afterbegin", sidebarMarkup);
    if (activePage !== "ocr-grading" && activePage !== "exam") {
      shell.insertAdjacentHTML("beforeend", this.renderMobileNav(activePage));
    }

    document.querySelectorAll(".mobile-topbar").forEach((topbar) => {
      if (topbar.querySelector(".mobile-topbar-logo")) return;
      topbar.insertAdjacentHTML(
        "afterbegin",
        `<img class="mobile-topbar-logo" src="${this.getBrandLogoSrc()}" alt="Edtechra">`
      );
    });

    const toggle = document.querySelector("[data-sidebar-toggle]");
    const sidebar = document.getElementById("sidebar");
    if (toggle && sidebar) {
      toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
    }
  }

  static emptyState(title, message) {
    return `
      <div class="empty-state">
        <strong>${this.escape(title)}</strong>
        <span>${this.escape(message)}</span>
      </div>
    `;
  }

  static renderTeacherLoginRequired() {
    this.hydrateDashboardIcons();
    const container = document.getElementById("classrooms-container");
    const activityContainer = document.getElementById("upcoming-activities");
    const contentContainer = document.getElementById("content-preview");

    this.setText("stat-total-classrooms", 0);
    this.setText("stat-total-students", 0);
    this.setText("stat-total-assignments", 0);
    this.setText("stat-total-submissions", 0);
    this.setText("dashboard-completion", "0%");
    this.setText("stat-average-completion", "0%");
    this.setText("dashboard-average", 0);
    this.setText("stat-trend-classrooms", "Sign in to sync");
    this.setText("stat-trend-students", "Session required");
    this.setText("stat-trend-assignments", "Session required");
    this.setText("stat-trend-submissions", "Session required");

    if (container) {
      container.innerHTML = `
        <div class="empty-state auth-state-card">
          <strong>Sign in to view your classrooms</strong>
          <span>Your Supabase connection is ready, but this standalone dashboard does not have an active Edtechra teacher session yet.</span>
          <div class="auth-state-actions">
            <button class="btn btn-primary" type="button" id="teacher-signin-btn">Sign in as Teacher</button>
            <button class="btn btn-secondary" type="button" id="teacher-demo-btn">Use Demo Mode</button>
          </div>
        </div>
      `;
    }

    if (activityContainer) {
      activityContainer.innerHTML = this.emptyState("No session yet", "Upcoming work will load after sign-in or when Demo Mode is selected.");
    }

    if (contentContainer) {
      contentContainer.innerHTML = this.emptyState("Content paused", "Sign in to continue with real classroom data.");
    }

    document.getElementById("teacher-signin-btn")?.addEventListener("click", () => {
      ClassroomAPI.storeReturnUrl(window.location.href);
      window.location.href = ClassroomAPI.getLoginUrl(window.location.href);
    });

    document.getElementById("teacher-demo-btn")?.addEventListener("click", async () => {
      ClassroomAPI.useDemoMode();
      await this.renderTeacherDashboard();
    });
  }

  static async renderTeacherDashboard() {
    this.hydrateDashboardIcons();
    let dashboardData;
    try {
      dashboardData = await ClassroomAPI.getTeacherDashboardData();
    } catch (error) {
      this.renderTeacherDashboardError(error);
      return;
    }

    const {
      source,
      classrooms,
      enrichedClassrooms,
      contentItems,
      leaderboardRows,
      assignmentRows,
      stats,
      teacherProfile
    } = dashboardData;
    const container = document.getElementById("classrooms-container");
    const activityContainer = document.getElementById("upcoming-activities");
    const contentContainer = document.getElementById("content-preview");
    const welcomeName = teacherProfile?.display_name || teacherProfile?.displayName || teacherProfile?.email || "Teacher";
    this.setText("teacher-welcome-name", welcomeName.split("@")[0]);

    if (container) {
      container.innerHTML = enrichedClassrooms.length
        ? enrichedClassrooms.map((classroom) => `
          <article class="classroom-card glass-card">
            <div class="classroom-banner ${this.escape(classroom.theme || "theme-blue")}">
              <span class="classroom-banner-badge">${this.escape(this.getClassroomLabel(classroom))}</span>
              <button class="card-icon-button" type="button" tabindex="-1" aria-hidden="true">${this.getIcon("dots")}</button>
              ${this.renderClassroomIllustration(classroom)}
            </div>
            <div class="classroom-card-body">
              <p class="card-kicker">${this.escape(classroom.subject)}  •  ${this.escape(classroom.grade)}</p>
              <h3>${this.escape(classroom.name)}</h3>
              <div class="classroom-meta">
                <span><span class="meta-icon">${this.getIcon("users")}</span>${classroom.studentCount || 0} students</span>
                <span><span class="meta-icon">${this.getIcon("assignment")}</span>${classroom.assignmentCount || 0} tasks</span>
              </div>
              <div class="classroom-invite-mini" aria-label="Student invitation">
                <span>Code <strong>${this.escape(classroom.inviteCode || "Pending")}</strong></span>
                <button class="copy-invite-mini" type="button" data-copy-invite="${this.escape(classroom.inviteCode || "")}" ${classroom.inviteCode ? "" : "disabled"}>Copy Link</button>
              </div>
              <div class="classroom-action-row">
                <a class="inline-action" href="${this.getRouteHref("detail", { classroomId: classroom.id })}">Open ${this.getIcon("arrow")}</a>
                <a class="inline-action inline-action-muted" href="${this.getRouteHref("detail", { classroomId: classroom.id })}#invite-link-input">Invite Students</a>
              </div>
            </div>
          </article>
        `).join("")
        : `
          <div class="empty-state classroom-empty-state">
            <span class="empty-state-visual" data-dashboard-icon="classroomDefault" aria-hidden="true"></span>
            <strong>No classrooms yet</strong>
            <span>Create your first classroom to begin organising students, tasks, and learning progress.</span>
            <a class="btn btn-primary btn-small" href="${this.getRouteHref("create")}">+ Create Classroom</a>
          </div>
        `;
      this.hydrateDashboardIcons(container);
      this.bindClassroomInviteActions(container);
    }

    if (activityContainer) {
      const upcoming = assignmentRows
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);
      activityContainer.innerHTML = upcoming.length
        ? upcoming.map((assignment) => `
          <div class="list-item list-item-feature">
            <div class="list-item-icon soft-gradient-amber">${this.getIcon("assignment")}</div>
            <div class="list-item-content">
              <h4>${this.escape(assignment.title)}</h4>
              <span>${this.escape(assignment.classroomName)} / Due ${this.escape(assignment.dueDate)}</span>
            </div>
            <strong class="list-item-value">${assignment.points} pts</strong>
          </div>
        `).join("")
        : this.emptyState("No upcoming work", "Assignments created in a classroom will appear here.");
    }

    if (contentContainer) {
      const previewItems = contentItems.slice(0, 4);
      contentContainer.innerHTML = previewItems.length
        ? previewItems.map((item) => `
          <div class="list-item compact list-item-feature">
            <div class="list-item-icon soft-gradient-blue">${this.getIcon("library")}</div>
            <div class="list-item-content">
              <h4>${this.escape(item.title)}</h4>
              <span>${this.escape(item.type)} / ${this.escape(item.subject)} / ${item.minutes} min</span>
            </div>
          </div>
        `).join("")
        : this.emptyState("No content items yet", source === "supabase"
          ? "Assigned classroom resources will appear here when available."
          : "Demo Edtechra resources will appear here when available.");
    }

    const totalStudents = stats.studentCount;
    const totalAssignments = stats.assignmentCount;
    const totalSubmissions = stats.submissionCount;
    const averageCompletion = totalStudents && totalAssignments
      ? Math.round((totalSubmissions / (totalStudents * totalAssignments)) * 100)
      : 0;

    this.setText("stat-total-classrooms", stats.classroomCount);
    this.setText("stat-total-students", totalStudents);
    this.setText("stat-total-assignments", totalAssignments);
    this.setText("stat-total-submissions", totalSubmissions);
    this.setText("dashboard-completion", `${averageCompletion}%`);
    this.setText("stat-average-completion", `${averageCompletion}%`);
    this.setText("dashboard-average", totalStudents ? Math.round(leaderboardRows.reduce((sum, row) => sum + row.points, 0) / totalStudents) : 0);
    this.setText("stat-trend-classrooms", stats.classroomCount ? `+${stats.classroomCount} active` : "Start with one");
    this.setText("stat-trend-students", totalStudents ? `+${totalStudents} enrolled` : "Waiting for joins");
    this.setText("stat-trend-assignments", totalAssignments ? `${totalAssignments} live tasks` : "No tasks yet");
    this.setText("stat-trend-submissions", totalSubmissions ? `${totalSubmissions} received` : "No submissions");
  }

  static bindClassroomInviteActions(container = document) {
    container.querySelectorAll("[data-copy-invite]").forEach((button) => {
      button.addEventListener("click", async () => {
        const inviteCode = button.dataset.copyInvite;
        if (!inviteCode) return;

        const inviteLink = this.getInviteLink(inviteCode);
        await navigator.clipboard.writeText(inviteLink);
        button.textContent = "Copied";
        this.showToast("Invite link copied.", "success");
        window.setTimeout(() => {
          button.textContent = "Copy Link";
        }, 1600);
      });
    });
  }

  static renderTeacherDashboardError(error) {
    this.hydrateDashboardIcons();
    const container = document.getElementById("classrooms-container");
    const activityContainer = document.getElementById("upcoming-activities");
    const contentContainer = document.getElementById("content-preview");

    this.setText("stat-total-classrooms", 0);
    this.setText("stat-total-students", 0);
    this.setText("stat-total-assignments", 0);
    this.setText("stat-total-submissions", 0);
    this.setText("dashboard-completion", "0%");
    this.setText("stat-average-completion", "0%");
    this.setText("dashboard-average", 0);
    this.setText("stat-trend-classrooms", "Supabase issue");
    this.setText("stat-trend-students", "Supabase issue");
    this.setText("stat-trend-assignments", "Supabase issue");
    this.setText("stat-trend-submissions", "Supabase issue");

    const message = error?.code === "DIGITAL_CLASSROOM_SCHEMA_MISSING"
      ? "Digital Classroom Supabase tables are missing or unavailable. Apply the classroom migration before using live teacher data."
      : "Supabase could not return teacher classroom data. Check RLS policies and the browser console.";

    console.warn("[Digital Classroom] Teacher dashboard could not load real Supabase data.", error);

    if (container) {
      container.innerHTML = this.emptyState("Real classroom data unavailable", message);
    }
    if (activityContainer) {
      activityContainer.innerHTML = this.emptyState("No upcoming work", "Live assignments could not be loaded.");
    }
    if (contentContainer) {
      contentContainer.innerHTML = this.emptyState("No content items", "Live classroom resources could not be loaded.");
    }
  }

  static async renderCreateClassroom() {
    const form = document.getElementById("create-classroom-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const required = ["name", "subject", "grade"];
      const missing = required.some((field) => !String(formData.get(field) || "").trim());

      if (missing) {
        this.showNotice("create-notice", "Please complete classroom name, subject, and grade.", "error");
        return;
      }

      const classroom = await ClassroomAPI.createClassroom({
        name: formData.get("name"),
        subject: formData.get("subject"),
        grade: formData.get("grade"),
        description: formData.get("description") || "",
        theme: formData.get("theme")
      });

      window.location.href = this.getRouteHref("detail", { classroomId: classroom.id });
    });
  }

  static async renderClassroomDetail(classroomId) {
    document.body.classList.add("teacher-classroom-detail");
    document.body.classList.remove("teacher-ocr-grading-page");

    const detectedClassroomId = this.getCurrentClassroomId(classroomId);
    console.log("[Digital Classroom] detected classId", detectedClassroomId);

    const classroom = await ClassroomAPI.getClassroomById(detectedClassroomId);
    if (!classroom) {
      const main = document.querySelector("main");
      if (main) main.innerHTML = this.emptyState("Classroom not found", "Return to the dashboard and choose an existing classroom.");
      return;
    }
    this.bindLiveQuizLaunch({
      classroomId: detectedClassroomId,
      teacherId: classroom.teacherId || classroom.teacher_id || "",
      profileId: classroom.teacherId || classroom.teacher_id || "",
      userId: classroom.teacherId || classroom.teacher_id || "",
      role: "teacher"
    });

    const assets = this.getTeacherAssets();
    const teacherName = classroom.teacherName || classroom.teacher?.display_name || "Class Teacher";
    const main = document.querySelector("main");
    if (main) main.dataset.classroomId = detectedClassroomId;
    this.setText("classroom-title", classroom.name);
    this.setText("mobile-classroom-title", classroom.name);
    this.setText("classroom-subtitle", `${classroom.subject} / ${classroom.grade}`);
    this.setText("classroom-description", classroom.description || "No description provided.");
    this.setText("hero-subject", classroom.subject || "Subject");
    this.setText("hero-grade", classroom.grade || "Grade");
    this.setText("teacher-name", teacherName);
    this.setText("teacher-avatar", teacherName.charAt(0).toUpperCase());
    this.setText("delete-classroom-name", classroom.name);

    const heroAsset = document.getElementById("classroom-hero-asset");
    if (heroAsset) {
      heroAsset.innerHTML = this.renderTeacherAssetImage(assets.classroomHero, "Classroom illustration", "teacher-hero-image");
    }

    const aiAsset = document.getElementById("ai-report-asset");
    if (aiAsset) {
      aiAsset.innerHTML = this.renderTeacherAssetImage(assets.aiRobot, "AI classroom report robot", "teacher-ai-robot-image");
    }

    const inviteLink = this.getInviteLink(classroom.inviteCode || detectedClassroomId);
    const inviteInput = document.getElementById("invite-link-input");
    if (inviteInput) inviteInput.value = inviteLink;
    this.setText("classroom-invite-code", classroom.inviteCode || "Pending");

    document.querySelectorAll(".wa-share-link").forEach((waShareBtn) => {
      waShareBtn.href = `https://wa.me/?text=${encodeURIComponent(`Join my Edtechra Digital Classroom "${classroom.name}" here: ${inviteLink}`)}`;
    });

    document.getElementById("copy-invite-btn")?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(inviteLink);
      this.showNotice("invite-notice", "Invite link copied.", "success");
    });

    const activityHubCard = document.querySelector("[data-activity-hub-link]");
    if (activityHubCard) {
      activityHubCard.href = this.getRouteHref("activityHub", { classroomId: detectedClassroomId });
    }

    const ocrGradingCard = document.querySelector("[data-ocr-grading-link]");
    if (ocrGradingCard) {
      ocrGradingCard.href = this.getRouteHref("ocrGrading", { classroomId: detectedClassroomId });
    }

    const examCard = document.querySelector("[data-exam2-link]");
    if (examCard) {
      examCard.href = this.getRouteHref("exam", { classroomId: detectedClassroomId });
    }

    document.querySelectorAll("[data-add-learning-material-btn]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        ClassroomUI.openAddLearningMaterialModal({ classroomId: detectedClassroomId });
      });
    });

    this.hydrateDashboardIcons(document);
    this.bindTeacherActionScroller();
    this.bindAssignmentForm(detectedClassroomId);
    this.enhanceDateInputs();
    this.bindMessagePanel(detectedClassroomId);
    this.bindDangerZone(detectedClassroomId, classroom.name);
    await this.refreshClassroomSections(detectedClassroomId);
    this.startClassroomDetailRefresh(detectedClassroomId);
  }

  static bindTeacherActionScroller() {
    const row = document.querySelector("[data-action-card-row]");
    if (!row) return;

    document.querySelectorAll("[data-action-scroll]").forEach((button) => {
      button.addEventListener("click", () => {
        const direction = button.dataset.actionScroll === "left" ? -1 : 1;
        row.scrollBy({ left: direction * 300, behavior: "smooth" });
      });
    });
  }

  static async renderOcrGrading(classroomId) {
    const detectedClassroomId = this.getCurrentClassroomId(classroomId);
    document.body.classList.add("teacher-ocr-grading-page");
    document.body.classList.remove("teacher-classroom-detail");
    window.__EDTECHRA_OCR_EMBEDDED = true;
    window.__EDTECHRA_OCR_CONTEXT = {
      classroomId: detectedClassroomId || ""
    };

    const backHref = detectedClassroomId
      ? this.getRouteHref("detail", { classroomId: detectedClassroomId })
      : this.getRouteHref("dashboard");

    document.querySelector("[data-ocr-back]")?.setAttribute("href", backHref);
    this.hydrateDashboardIcons(document);

    if (!document.querySelector('link[data-ai-evaluation-css="true"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/ocr-grading/assets/index-BDBAMEUp.css";
      link.dataset.aiEvaluationCss = "true";
      document.head.appendChild(link);
    }

    if (window.EdtechraOcrMount) {
      window.EdtechraOcrMount();
      return;
    }

    if (!document.querySelector('script[data-ai-evaluation-script="true"]')) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = `/ocr-grading/assets/index-BwuAg06m.js?embedded=${Date.now()}`;
      script.dataset.aiEvaluationScript = "true";
      document.body.appendChild(script);
    }
  }

  static async renderExam2(classroomId) {
    const detectedClassroomId = this.getCurrentClassroomId(classroomId);
    document.body.classList.add("teacher-exam2-page");
    document.body.classList.remove("teacher-classroom-detail", "teacher-ocr-grading-page");

    const backHref = detectedClassroomId
      ? this.getRouteHref("detail", { classroomId: detectedClassroomId })
      : this.getRouteHref("dashboard");

    document.querySelector("[data-exam2-back]")?.setAttribute("href", backHref);
    this.hydrateDashboardIcons(document);

    const frame = document.querySelector("[data-exam2-frame]");
    if (!frame) return;

    let teacherId = "";
    try {
      const classroom = detectedClassroomId ? await ClassroomAPI.getClassroomById(detectedClassroomId) : null;
      teacherId = classroom?.teacherId || classroom?.teacher_id || "";
    } catch (error) {
      console.warn("[Digital Classroom] Exam classroom context lookup skipped:", error);
    }

    const params = new URLSearchParams({
      source: "edtechra",
      classroomId: detectedClassroomId || ""
    });
    if (teacherId) params.set("teacherId", teacherId);
    window.__EDTECHRA_EXAM2_FRAME_CLEANUP?.();
    window.__EDTECHRA_EXAM2_FRAME_CLEANUP = null;
    const resizeFrame = () => {
      const doc = frame.contentDocument;
      if (!doc?.documentElement || !doc.body) return;
      doc.documentElement.style.overflow = "hidden";
      doc.body.style.overflow = "hidden";
      const height = Math.max(
        doc.documentElement.scrollHeight,
        doc.body.scrollHeight,
        doc.documentElement.offsetHeight,
        doc.body.offsetHeight,
        720
      );
      frame.style.height = `${height}px`;
      frame.closest(".exam2-frame-shell")?.style.setProperty("--exam2-frame-height", `${height}px`);
    };
    const bindFrameResize = () => {
      resizeFrame();
      const frameWindow = frame.contentWindow;
      const frameDocument = frame.contentDocument;
      const Observer = frameWindow?.ResizeObserver || window.ResizeObserver;
      const observer = Observer && frameDocument?.body
        ? new Observer(resizeFrame)
        : null;
      observer?.observe(frameDocument.documentElement);
      observer?.observe(frameDocument.body);
      frameWindow?.addEventListener("resize", resizeFrame);
      const intervalId = window.setInterval(resizeFrame, 500);
      window.__EDTECHRA_EXAM2_FRAME_CLEANUP = () => {
        observer?.disconnect();
        frameWindow?.removeEventListener("resize", resizeFrame);
        window.clearInterval(intervalId);
      };
    };
    frame.addEventListener("load", bindFrameResize, { once: true });
    frame.src = `/exam2/index.html?${params.toString()}`;
  }

  static unmountExam2() {
    document.body.classList.remove("teacher-exam2-page");
    window.__EDTECHRA_EXAM2_FRAME_CLEANUP?.();
    window.__EDTECHRA_EXAM2_FRAME_CLEANUP = null;
    document.querySelector("[data-exam2-frame]")?.removeAttribute("src");
  }

  static getTokenFromLocalStorage() {
    // Supabase JS v2 stores session under "sb-<projectRef>-auth-token" in localStorage
    try {
      const keys = Object.keys(localStorage);
      const sbKey = keys.find((k) => k.includes("-auth-token") && k.startsWith("sb-"));
      if (!sbKey) return null;
      const parsed = JSON.parse(localStorage.getItem(sbKey) || "null");
      return parsed?.access_token || null;
    } catch (_) {
      return null;
    }
  }

  static async getExamAuthHeaders() {
    try {
      // Strategy 1: Use the DigitalClassroomSupabase facade (primary)
      const session = await window.DigitalClassroomSupabase?.getSession?.();
      const token = session?.access_token || this.getTokenFromLocalStorage();
      if (!token) {
        console.warn("[Digital Classroom] getExamAuthHeaders: No auth token found");
      }
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (error) {
      // Strategy 2: localStorage fallback
      const token = this.getTokenFromLocalStorage();
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
  }

  static async callExamApi(action, options = {}) {
    const headers = {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(await this.getExamAuthHeaders()),
      ...(options.headers || {})
    };
    const response = await fetch(`/api/exam-engine?action=${action}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Exam request failed.");
    return data;
  }

  static getExamIdFromRoute() {
    const hashQuery = window.location.hash.includes("?") ? window.location.hash.split("?")[1] : "";
    return new URLSearchParams(hashQuery).get("examId") || new URLSearchParams(window.location.search).get("examId") || "";
  }

  static async renderStudentExams(classroomId) {
    const root = document.getElementById("student-exams-root") || document.querySelector("#app-shell");
    if (!root) return;
    root.innerHTML = `<div class="se-page"><div class="se-loading"><div class="se-loading-spinner"></div><span class="se-loading-text">Loading classroom exams…</span></div></div>`;
    try {
      if (!classroomId) throw new Error("Missing classroom ID. Cannot load exams.");
      console.info("[Digital Classroom] renderStudentExams called", { classroomId });
      const data = await this.callExamApi(`list-student-exams&classroomId=${encodeURIComponent(classroomId)}`);
      const exams = data.exams || [];
      console.info("[Digital Classroom] Exams loaded", { count: exams.length, classroomId });
      root.innerHTML = `
        <div class="se-page">
          <header class="se-header">
            <div class="se-header-top">
              <a class="btn btn-secondary" href="${this.getRouteHref("student", { classroomId })}">${this.getIcon("arrowLeft")} Back to classroom</a>
            </div>
            <p class="se-header-eyebrow">Classroom Exams</p>
            <h1 class="se-header-title">Available Exams${exams.length ? `<span class="se-header-count">${exams.length}</span>` : ""}</h1>
            <p class="se-header-subtitle">View and begin your assigned exams. Complete each exam within the allocated time to submit your answers.</p>
          </header>
          ${exams.length ? `<div class="se-exam-grid">${exams.map((exam) => this.renderStudentExamCard(exam, classroomId)).join("")}</div>` : `
            <div class="se-empty-state">
              <div class="se-empty-state-icon">${this.getIcon("clipboard")}</div>
              <h3>No exams available</h3>
              <p>Your teacher has not published any active exams for this classroom yet. Check back later.</p>
            </div>
          `}
        </div>
      `;
    } catch (error) {
      console.error("[Digital Classroom] renderStudentExams FAILED:", error.message, { classroomId });
      root.innerHTML = `
        <div class="se-page">
          <header class="se-header">
            <div class="se-header-top">
              <a class="btn btn-secondary" href="${this.getRouteHref("student", { classroomId: classroomId || "" })}">${this.getIcon("arrowLeft")} Back to classroom</a>
            </div>
          </header>
          <div class="se-error-state">
            <h3>Could not load exams</h3>
            <p>${this.escape(error.message)}</p>
            <button class="btn btn-secondary" onclick="location.reload()">Try again</button>
          </div>
        </div>
      `;
    }
  }

  static renderStudentExamCard(exam, classroomId) {
    const status = exam.status || "scheduled";
    const submitted = Boolean(exam.latest_result);
    const badgeClass = status === "active" ? "se-badge--active" : status === "scheduled" ? "se-badge--scheduled" : status === "closed" ? "se-badge--closed" : submitted ? "se-badge--completed" : "se-badge--draft";
    const badgeLabel = submitted ? "Completed" : status.charAt(0).toUpperCase() + status.slice(1);
    const dateLabel = exam.starts_at ? new Date(exam.starts_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Open";
    const scoreMeta = submitted ? `<span class="se-meta-item se-meta-item--score"><svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></svg>${Number(exam.latest_result.percentage || 0)}%</span>` : "";
    const action = exam.can_start
      ? `<a class="se-btn-start" href="${this.getRouteHref("studentExam", { classroomId, examId: exam.id })}"><svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z"/></svg>Start Exam</a>`
      : submitted
        ? `<a class="se-btn-view" href="${this.getRouteHref("studentExam", { classroomId, examId: exam.id })}">View Result</a>`
        : `<button class="se-btn-disabled" type="button" disabled>${status === "scheduled" ? "Opens Later" : status === "closed" ? "Closed" : "Unavailable"}</button>`;
    return `
      <article class="se-exam-card">
        <div class="se-exam-card-top">
          <div class="se-exam-card-icon">${this.getIcon("clipboard")}</div>
          <span class="se-badge ${badgeClass}">${this.escape(badgeLabel)}</span>
        </div>
        <div class="se-exam-card-body">
          <h3 class="se-exam-card-title">${this.escape(exam.title || "Untitled Exam")}</h3>
          <p class="se-exam-card-desc">${this.escape(exam.description || "Digital Classroom exam")}</p>
        </div>
        <div class="se-exam-card-meta">
          <span class="se-meta-item"><svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></svg>${Number(exam.total_marks || 0)} Marks</span>
          <span class="se-meta-item"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>${Number(exam.duration_minutes || 0)} Minutes</span>
          <span class="se-meta-item"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/></svg>${dateLabel}</span>
          ${scoreMeta}
        </div>
        <div class="se-exam-card-actions">${action}</div>
      </article>
    `;
  }

  static async renderStudentExam(classroomId) {
    const root = document.getElementById("student-exam-root") || document.querySelector("#app-shell");
    if (!root) return;
    const examId = this.getExamIdFromRoute();
    root.innerHTML = `<div class="se-page"><div class="se-loading"><div class="se-loading-spinner"></div><span class="se-loading-text">Loading exam…</span></div></div>`;
    try {
      const data = await this.callExamApi(`get-student-exam&classroomId=${encodeURIComponent(classroomId)}&examId=${encodeURIComponent(examId)}`);
      root.innerHTML = this.renderStudentExamView(data, classroomId, examId);
      this.hydrateStudentExam(root, classroomId, examId, data);
    } catch (error) {
      root.innerHTML = `
        <div class="se-page">
          <div class="se-error-state">
            <h3>Could not open exam</h3>
            <p>${this.escape(error.message)}</p>
            <a class="btn btn-secondary" href="${this.getRouteHref("studentExams", { classroomId })}">${this.getIcon("arrowLeft")} Back to exams</a>
          </div>
        </div>
      `;
    }
  }

  static hydrateStudentExam(root, classroomId, examId, data) {
    /* Bind submit button with confirmation modal */
    root.querySelector("[data-submit-student-exam]")?.addEventListener("click", () => {
      this.showExamSubmitModal(root, classroomId, examId);
    });
    /* Bind download report */
    root.querySelector("[data-download-student-report]")?.addEventListener("click", async (event) => {
      await this.downloadStudentExamReport(event.currentTarget.dataset.resultId);
    });
    /* Hydrate option cards — toggle .is-selected on click */
    root.querySelectorAll(".se-option").forEach((option) => {
      const radio = option.querySelector("input[type=\"radio\"]");
      if (!radio) return;
      option.addEventListener("click", () => {
        radio.checked = true;
        const name = radio.name;
        root.querySelectorAll(`.se-option input[name="${name}"]`).forEach((r) => {
          r.closest(".se-option")?.classList.toggle("is-selected", r.checked);
        });
        this.updateExamProgress(root);
      });
    });
    /* Hydrate question navigator */
    root.querySelectorAll(".se-nav-btn[data-nav-q]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = root.querySelector(`[data-question-id="${btn.dataset.navQ}"]`);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
    /* Timer */
    if (data.can_start) {
      const durationMin = Number(data.exam?.duration_minutes || 0);
      if (durationMin > 0) this.startExamTimer(root, durationMin);
    }
  }

  static startExamTimer(root, durationMinutes) {
    let remaining = durationMinutes * 60;
    const timerEl = root.querySelector("[data-exam-timer]");
    if (!timerEl) return;
    const update = () => {
      if (remaining < 0) remaining = 0;
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      timerEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      timerEl.closest(".se-exam-timer")?.classList.toggle("se-exam-timer--warning", remaining <= 300 && remaining > 60);
      timerEl.closest(".se-exam-timer")?.classList.toggle("se-exam-timer--danger", remaining <= 60);
      remaining--;
    };
    update();
    const interval = setInterval(() => {
      if (!root.isConnected) { clearInterval(interval); return; }
      update();
      if (remaining < 0) clearInterval(interval);
    }, 1000);
  }

  static updateExamProgress(root) {
    const allQs = root.querySelectorAll("[data-question-id]");
    let answered = 0;
    allQs.forEach((qCard) => {
      const qid = qCard.dataset.questionId;
      const radio = root.querySelector(`input[data-exam-answer="${qid}"]:checked`);
      const textarea = root.querySelector(`textarea[data-exam-answer="${qid}"]`);
      const isAnswered = radio || (textarea && textarea.value.trim());
      if (isAnswered) answered++;
      /* Update navigator button */
      const navBtn = root.querySelector(`.se-nav-btn[data-nav-q="${qid}"]`);
      navBtn?.classList.toggle("se-nav-btn--answered", !!isAnswered);
    });
    const total = allQs.length;
    const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
    const answeredEl = root.querySelector("[data-progress-answered]");
    const pctEl = root.querySelector("[data-progress-pct]");
    const fillEl = root.querySelector("[data-progress-fill]");
    const headerFillEl = root.querySelector("[data-header-progress-fill]");
    if (answeredEl) answeredEl.textContent = `${answered} of ${total}`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (headerFillEl) headerFillEl.style.width = `${pct}%`;
  }

  static renderStudentExamView(data, classroomId, examId) {
    const exam = data.exam || {};
    const latest = data.latest_result;
    const backHref = this.getRouteHref("studentExams", { classroomId });
    const statusLabel = exam.runtime_status || exam.status || "unavailable";
    const badgeClass = statusLabel === "active" ? "se-badge--active" : statusLabel === "scheduled" ? "se-badge--scheduled" : statusLabel === "closed" ? "se-badge--closed" : "se-badge--draft";

    if (!data.can_start) {
      return `
        <div class="se-page">
          <header class="se-header">
            <div class="se-header-top">
              <a class="btn btn-secondary" href="${backHref}">${this.getIcon("arrowLeft")} Back to exams</a>
            </div>
            <p class="se-header-eyebrow">Exam</p>
            <h1 class="se-header-title">${this.escape(exam.title || "Exam")}</h1>
            <p class="se-header-subtitle"><span class="se-badge ${badgeClass}">${this.escape(statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1))}</span></p>
          </header>
          ${latest ? this.renderStudentExamResult(latest) : `
            <div class="se-empty-state">
              <div class="se-empty-state-icon">${this.getIcon("calendar")}</div>
              <h3>Exam not available</h3>
              <p>This exam is not available to start right now. Please check back when the exam window opens.</p>
            </div>
          `}
        </div>
      `;
    }

    const sections = exam.questions_json || [];
    const totalMarks = Number(exam.total_marks || 0);
    const duration = Number(exam.duration_minutes || 0);
    /* Flatten all questions for navigator */
    let questionIndex = 0;
    const allQuestions = [];
    sections.forEach((section) => {
      (section.questions || []).forEach((q) => {
        questionIndex++;
        allQuestions.push({ ...q, _index: questionIndex });
      });
    });
    const totalQs = allQuestions.length;

    /* Build sections with question cards */
    questionIndex = 0;
    const sectionMarkup = sections.map((section) => {
      const questions = (section.questions || []).map((question) => {
        questionIndex++;
        return this.renderStudentExamQuestion(question, questionIndex);
      }).join("");
      return `
        <div class="se-section-card">
          <h3 class="se-section-title">${this.escape(section.title || section.questionType || "Section")}</h3>
          ${section.passage ? `<div class="se-section-passage">${this.escape(section.passage)}</div>` : ""}
          ${questions}
        </div>
      `;
    }).join("");

    /* Navigator buttons */
    const navButtons = allQuestions.map((q) => {
      return `<button type="button" class="se-nav-btn" data-nav-q="${this.escape(q.questionId || "")}" title="Question ${q._index}">${q._index}</button>`;
    }).join("");

    return `
      <div class="se-page">
        <div class="se-exam-header">
          <div class="se-exam-header-inner">
            <a class="se-exam-header-back" href="${backHref}" title="Back to exams">${this.getIcon("arrowLeft")}</a>
            <div class="se-exam-header-info">
              <p class="se-exam-header-type">${this.escape(exam.exam_type || exam.type || "Examination")}</p>
              <h2 class="se-exam-header-title">${this.escape(exam.title || "Exam")}</h2>
            </div>
            <div class="se-exam-header-stats">
              <span class="se-header-stat"><svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></svg>${totalMarks} marks</span>
              <span class="se-header-stat"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>${duration} min</span>
              <span class="se-header-stat"><svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="3"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>${totalQs} questions</span>
            </div>
            <div class="se-exam-timer"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg><span data-exam-timer>${String(duration).padStart(2, "0")}:00</span></div>
          </div>
          <div class="se-progress-bar-wrap"><div class="se-progress-bar-track"><div class="se-progress-bar-fill" data-header-progress-fill style="width: 0%"></div></div></div>
        </div>

        <form id="student-exam-form" data-exam-id="${this.escape(examId)}">
          <div class="se-exam-body">
            <div class="se-exam-main">
              ${sectionMarkup}
            </div>
            <aside class="se-exam-sidebar">
              <div class="se-navigator">
                <p class="se-navigator-title">Questions</p>
                <div class="se-navigator-grid">${navButtons}</div>
              </div>
              <div class="se-progress-panel">
                <p class="se-progress-panel-title">Progress</p>
                <div class="se-progress-stats">
                  <div class="se-progress-stat"><span class="se-progress-stat-label">Answered</span><span class="se-progress-stat-value" data-progress-answered>0 of ${totalQs}</span></div>
                </div>
                <div class="se-progress-track"><div class="se-progress-fill" data-progress-fill style="width: 0%"></div></div>
                <p class="se-progress-pct" data-progress-pct>0%</p>
              </div>
              <div class="se-submit-panel">
                <button class="se-submit-btn" type="button" data-submit-student-exam><svg viewBox="0 0 24 24"><path d="m21 3-9 9"/><path d="m21 3-6 18-3-9-9-3Z"/></svg>Submit Exam</button>
              </div>
            </aside>
          </div>
        </form>
      </div>
    `;
  }

  static renderStudentExamQuestion(question, index) {
    const qid = this.escape(question.questionId || "");
    const options = Array.isArray(question.options) ? question.options.filter(Boolean) : [];
    const isChoice = options.length > 1 || /true|false/i.test(question.questionType || "");
    const choices = options.length ? options : ["True", "False"];
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    if (isChoice) {
      const optionCards = choices.map((option, i) => `
        <label class="se-option" tabindex="0" role="radio" aria-checked="false">
          <input type="radio" name="answer-${qid}" data-exam-answer="${qid}" value="${this.escape(option)}">
          <span class="se-option-marker"></span>
          <span class="se-option-letter">${letters[i] || String(i + 1)}</span>
          <span class="se-option-text">${this.escape(option)}</span>
        </label>
      `).join("");

      return `
        <div class="se-question-card" data-question-id="${qid}">
          <div class="se-question-top">
            <span class="se-question-num">Q${index}</span>
            <span class="se-question-marks">${Number(question.marks || 0)} marks</span>
          </div>
          <p class="se-question-text">${this.escape(question.questionText || "Question")}</p>
          <div class="se-options-list" role="radiogroup" aria-label="Question ${index} options">${optionCards}</div>
        </div>
      `;
    }

    return `
      <div class="se-question-card" data-question-id="${qid}">
        <div class="se-question-top">
          <span class="se-question-num">Q${index}</span>
          <span class="se-question-marks">${Number(question.marks || 0)} marks</span>
        </div>
        <p class="se-question-text">${this.escape(question.questionText || "Question")}</p>
        <textarea class="se-textarea" data-exam-answer="${qid}" rows="4" placeholder="Type your answer…"></textarea>
      </div>
    `;
  }

  static renderStudentExamResult(result) {
    const pct = Number(result.percentage || 0);
    const score = Number(result.score || 0);
    const maxScore = Number(result.max_score || 0);
    const grade = this.escape(result.grade || "");
    const status = this.escape(result.status || "");
    return `
      <div class="se-result-card">
        <div class="se-result-header">
          <h3>Your Result</h3>
        </div>
        <div class="se-result-score-ring">
          <span class="se-result-score-pct">${pct}%</span>
          <span class="se-result-score-label">Score</span>
        </div>
        <div class="se-result-details">
          <span class="se-result-detail">${score}/${maxScore} marks</span>
          ${grade ? `<span class="se-result-detail">Grade: ${grade}</span>` : ""}
          ${status ? `<span class="se-result-detail">${status}</span>` : ""}
        </div>
        <div class="se-result-actions">
          <button class="se-btn-view" type="button" data-download-student-report data-result-id="${this.escape(result.id)}"><svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round"><path d="M12 15V4"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><rect x="4" y="17" width="16" height="3" rx="1.5"/></svg> Download PDF Report</button>
        </div>
      </div>
    `;
  }

  static collectStudentExamAnswers(root) {
    const answers = {};
    root.querySelectorAll("[data-exam-answer]").forEach((field) => {
      if (field.type === "radio" && !field.checked) return;
      answers[field.dataset.examAnswer] = field.value;
    });
    return answers;
  }

  static showExamSubmitModal(root, classroomId, examId) {
    const allQs = root.querySelectorAll("[data-question-id]");
    const total = allQs.length;
    let answered = 0;
    allQs.forEach((qCard) => {
      const qid = qCard.dataset.questionId;
      const radio = root.querySelector(`input[data-exam-answer="${qid}"]:checked`);
      const textarea = root.querySelector(`textarea[data-exam-answer="${qid}"]`);
      if (radio || (textarea && textarea.value.trim())) answered++;
    });
    const unanswered = total - answered;

    const overlay = document.createElement("div");
    overlay.className = "se-modal-overlay";
    overlay.innerHTML = `
      <div class="se-modal">
        <div class="se-modal-icon">${this.getIcon("send")}</div>
        <h3>Submit Exam?</h3>
        <p>You have answered <strong>${answered} of ${total}</strong> questions.</p>
        ${unanswered > 0 ? `<p>${unanswered} question${unanswered > 1 ? "s" : ""} remain${unanswered === 1 ? "s" : ""} unanswered.</p>` : `<p>All questions have been answered.</p>`}
        <p class="se-modal-warning">You will not be able to change your answers after submission.</p>
        <div class="se-modal-actions">
          <button type="button" class="se-btn-cancel" data-modal-cancel>Cancel</button>
          <button type="button" class="se-btn-confirm" data-modal-confirm>Submit</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("[data-modal-cancel]").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector("[data-modal-confirm]").addEventListener("click", async () => {
      overlay.querySelector("[data-modal-confirm]").disabled = true;
      overlay.querySelector("[data-modal-confirm]").textContent = "Submitting…";
      overlay.remove();
      await this.submitStudentExam(root, classroomId, examId);
    });
  }

  static async submitStudentExam(root, classroomId, examId) {
    try {
      const data = await this.callExamApi("submit-exam-attempt", {
        method: "POST",
        body: JSON.stringify({
          classroomId,
          examId,
          answers: this.collectStudentExamAnswers(root),
          startedAt: new Date().toISOString()
        })
      });
      root.innerHTML = `
        <div class="se-page">
          <header class="se-header">
            <div class="se-header-top">
              <a class="btn btn-secondary" href="${this.getRouteHref("studentExams", { classroomId })}">${this.getIcon("arrowLeft")} Back to exams</a>
            </div>
          </header>
          <div class="se-submitted-state">
            <div class="se-submitted-icon">${this.getIcon("check")}</div>
            <h2>Exam Submitted</h2>
            <p>Your answers have been recorded successfully.</p>
            ${this.renderStudentExamResult(data.result)}
          </div>
        </div>
      `;
      root.querySelector("[data-download-student-report]")?.addEventListener("click", async (event) => {
        await this.downloadStudentExamReport(event.currentTarget.dataset.resultId);
      });
    } catch (error) {
      this.showToast(error.message || "Could not submit exam.", "error");
    }
  }

  static async downloadStudentExamReport(resultId) {
    try {
      const data = await this.callExamApi(`generate-student-report-pdf&resultId=${encodeURIComponent(resultId)}`);
      window.open(data.report_pdf_url, "_blank", "noopener");
    } catch (error) {
      this.showToast(error.message || "Could not generate report PDF.", "error");
    }
  }

  static unmountOcrGrading() {
    document.body.classList.remove("teacher-ocr-grading-page");
    window.__EDTECHRA_OCR_EMBEDDED = false;
    window.__EDTECHRA_OCR_CONTEXT = null;
    document.querySelector('link[data-ai-evaluation-css="true"]')?.remove();
    document.querySelector('script[data-ai-evaluation-script="true"]')?.remove();
    try {
      window.EdtechraOcrRoot?.unmount?.();
      window.EdtechraOcrRoot = null;
    } catch (error) {
      console.warn("[Digital Classroom] OCR unmount skipped:", error);
    }
  }

  static async renderActivityHub(classroomId) {
    const detectedClassroomId = this.getCurrentClassroomId(classroomId);
    const backHref = detectedClassroomId
      ? this.getRouteHref("detail", { classroomId: detectedClassroomId })
      : this.getRouteHref("dashboard");

    document.querySelectorAll("[data-activity-back]").forEach((link) => {
      link.setAttribute("href", backHref);
    });

    document.querySelector('[data-hub-action="resources"]')?.setAttribute("href", this.getRootRouteHref("myUploads", { classroomId: detectedClassroomId }));
    document.querySelector('[data-hub-action="collections"]')?.setAttribute("href", this.getRootRouteHref("savedCollections", { classroomId: detectedClassroomId }));
    const uploadBtn = document.querySelector('[data-hub-action="upload"]');
    if (uploadBtn) {
      uploadBtn.setAttribute("href", "#");
      uploadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        ClassroomUI.openAddLearningMaterialModal({ classroomId: detectedClassroomId });
      });
    }

    const premiumLibrary = document.getElementById("premium-library-placeholder");
    const [premiumResources, dashboardData] = await Promise.all([
      ClassroomAPI.getPremiumLibraryResources(),
      ClassroomAPI.getTeacherDashboardData()
    ]);
    const classrooms = dashboardData.classrooms || [];
    if (premiumLibrary) {
      premiumLibrary.innerHTML = this.renderPremiumLibrary(premiumResources);
    }
    document.querySelector('[data-hub-action="premium"]')?.addEventListener("click", () => {
      if (!premiumLibrary) return;
      premiumLibrary.hidden = false;
      premiumLibrary.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    this.bindPremiumLibraryActions(premiumResources, classrooms);

    const modal = document.getElementById("activity-guide-modal");
    const guideSeenKey = "edtechra_activity_hub_guide_seen";
    const openModal = () => {
      if (!modal) return;
      modal.hidden = false;
      document.body.classList.add("activity-modal-open");
    };
    const closeModal = () => {
      if (!modal) return;
      modal.hidden = true;
      document.body.classList.remove("activity-modal-open");
    };
    const acknowledgeGuide = () => {
      localStorage.setItem(guideSeenKey, "true");
      closeModal();
    };

    document.getElementById("activity-guide-btn")?.addEventListener("click", openModal);
    document.getElementById("activity-guide-close")?.addEventListener("click", closeModal);
    document.getElementById("activity-guide-ok")?.addEventListener("click", acknowledgeGuide);
    modal?.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    if (localStorage.getItem(guideSeenKey) !== "true") {
      window.setTimeout(openModal, 350);
    }

    window.ClassroomSpreeActions = {
      createSpreeFromResources: (resources = []) => this.createSpreeFromResources(resources, detectedClassroomId),
      assignSpreeToClassroom: (spree = {}) => this.assignSpreeToClassroom(spree, detectedClassroomId),
      trackSpreeProgress: (spreeId) => this.trackSpreeProgress(spreeId, detectedClassroomId)
    };
  }

  static async renderTeachingResources(classroomId = "") {
    const detectedClassroomId = this.getCurrentClassroomId(classroomId);
    const resourcesList = document.getElementById("teaching-resources-list");
    const uploadLink = document.querySelector("[data-resource-upload-link]");
    if (uploadLink) uploadLink.setAttribute("href", this.getRootRouteHref("upload", { classroomId: this.getCurrentClassroomId() }));

    const backLink = document.querySelector("[data-resources-back]");
    if (backLink) backLink.setAttribute("href", this.getRouteHref("dashboard"));

    const [resources, dashboardData, quota] = await Promise.all([
      ClassroomAPI.getTeachingResources(detectedClassroomId),
      ClassroomAPI.getTeacherDashboardData(),
      ClassroomAPI.getTeacherStorageUsage().catch(() => null)
    ]);
    const classrooms = dashboardData.classrooms || [];

    // Render Quota Widget in Teacher Resources page
    let quotaWidgetEl = document.getElementById("teacher-storage-quota-widget");
    if (quota && resourcesList) {
      const isNearLimit = quota.percentage >= 85;
      const isFull = quota.percentage >= 100;
      const quotaClass = isFull ? "is-danger" : (isNearLimit ? "is-warning" : "");

      const quotaWidgetHtml = `
        <div class="teacher-storage-quota-widget" id="teacher-storage-quota-widget">
          <div class="quota-widget-header">
            <span class="quota-widget-title">
              <span class="quota-cloud-icon">☁️</span> Teacher Cloud Storage Allocation
            </span>
            <div class="quota-widget-actions">
              <span class="quota-stat-text">
                Storage Used: <strong>${quota.usedMb} MB</strong> / 500 MB (${quota.percentage}%) &bull; <strong>${quota.remainingMb} MB remaining</strong>
              </span>
              <button class="btn btn-secondary btn-small" type="button" id="btn-explore-cloud-bucket">
                Explore Cloud Bucket
              </button>
            </div>
          </div>
          <div class="quota-progress-track">
            <div class="quota-progress-fill ${quotaClass}" style="width: ${quota.percentage}%;"></div>
          </div>
        </div>
      `;

      if (quotaWidgetEl) {
        quotaWidgetEl.outerHTML = quotaWidgetHtml;
      } else {
        resourcesList.parentElement.insertAdjacentHTML("afterbegin", quotaWidgetHtml);
      }

      document.getElementById("btn-explore-cloud-bucket")?.addEventListener("click", () => {
        ClassroomUI.openCloudBucketModal({ classroomId: detectedClassroomId });
      });
    }

    if (resourcesList) {
      resourcesList.innerHTML = resources.length
        ? resources.map((resource) => this.renderTeachingResourceCard(resource)).join("")
        : this.emptyState("No teaching resources yet", "Upload a resource from your teacher account and it will appear here.");
    }

    this.bindTeachingResourceActions(resources, classrooms);
    this.enhanceDateInputs();

    const params = new URLSearchParams((window.location.hash.split("?")[1] || window.location.search || "").replace(/^#/, ""));
    const assignResourceId = params.get("assignResource");
    if (assignResourceId) {
      const resource = resources.find((item) => String(item.id) === String(assignResourceId));
      if (resource) this.openResourceAssignment(resource, classrooms);
    }
  }

  static renderTeachingResourceCard(resource) {
    const visibilityText = resource.visibility === "public" ? "Public" : "Private";
    const previewUrl = resource.previewUrl || (!resource.isWebProject ? resource.fileUrl : "") || `#detail/${encodeURIComponent(resource.id)}`;
    const previewTarget = /^https?:\/\//i.test(previewUrl) ? "_blank" : "_self";
    const previewRel = /^https?:\/\//i.test(previewUrl) ? "noopener noreferrer" : "";
    const previewMissing = resource.isWebProject && !resource.previewUrl;

    return `
      <article class="teaching-resource-card" data-resource-id="${this.escape(resource.id)}">
        <div class="teaching-resource-copy">
          <div class="teaching-resource-title-row">
            <h3>${this.escape(resource.title)}</h3>
            <span class="resource-visibility-badge ${resource.visibility === "public" ? "is-public" : "is-private"}">${visibilityText}</span>
            ${resource.sharedToPremium ? `<span class="resource-visibility-badge is-premium">Premium</span>` : ""}
          </div>
          <div class="teaching-resource-meta">
            <span>${this.escape(resource.resourceType)}</span>
            <span>Uploaded ${this.formatDate(resource.createdAt)}</span>
          </div>
          ${resource.description ? `<p>${this.escape(resource.description)}</p>` : ""}
        </div>
        <div class="teaching-resource-actions">
          <a class="btn btn-secondary btn-small" href="${this.escape(previewMissing ? "#" : previewUrl)}" target="${previewTarget}" rel="${previewRel}" ${previewMissing ? `data-preview-missing="${this.escape(resource.id)}"` : ""}>Preview</a>
          <a class="btn btn-secondary btn-small" href="#edit/${this.escape(resource.id)}">Edit</a>
          <button class="btn btn-primary btn-small" type="button" data-assign-resource="${this.escape(resource.id)}">Assign</button>
          <div class="teaching-resource-menu">
            <button class="btn btn-secondary btn-small teaching-resource-menu-toggle" type="button" data-resource-menu="${this.escape(resource.id)}" aria-haspopup="menu" aria-expanded="false" aria-label="Resource actions">&#8943;</button>
            <div class="teaching-resource-menu-dropdown" role="menu" hidden>
              <button type="button" role="menuitem" data-share-resource-premium="${this.escape(resource.id)}">Share to Premium Library</button>
              <button type="button" role="menuitem" class="is-danger" data-delete-teacher-resource="${this.escape(resource.id)}">Delete Resource</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  static renderPremiumLibrary(resources = []) {
    return `
      <div class="premium-library-panel">
        <div class="premium-library-heading">
          <h2>Premium Learning Library</h2>
        </div>
        <div class="premium-library-list" id="premium-library-list">
          ${resources.length
            ? resources.map((resource) => this.renderPremiumLibraryCard(resource)).join("")
            : this.emptyState("No premium materials yet.", "Share a resource from My Teaching Resources to publish it here.")}
        </div>
      </div>
    `;
  }

  static renderPremiumLibraryCard(resource) {
    const previewUrl = resource.previewUrl || (!resource.isWebProject ? resource.fileUrl : "") || `#detail/${encodeURIComponent(resource.id)}`;
    const previewTarget = /^https?:\/\//i.test(previewUrl) ? "_blank" : "_self";
    const previewRel = /^https?:\/\//i.test(previewUrl) ? "noopener noreferrer" : "";
    const previewMissing = resource.isWebProject && !resource.previewUrl;
    const sharedDate = resource.premiumSharedAt || resource.updatedAt || resource.createdAt;

    return `
      <article class="teaching-resource-card premium-library-card" data-premium-resource-id="${this.escape(resource.id)}">
        <div class="teaching-resource-copy">
          <div class="teaching-resource-title-row">
            <h3>${this.escape(resource.title)}</h3>
            <span class="resource-visibility-badge is-premium">Premium</span>
          </div>
          <div class="teaching-resource-meta">
            <span>${this.escape(resource.resourceType)}</span>
            <span>Shared ${this.formatDate(sharedDate)}</span>
          </div>
          ${resource.description ? `<p>${this.escape(resource.description)}</p>` : ""}
        </div>
        <div class="teaching-resource-actions">
          <a class="btn btn-secondary btn-small" href="${this.escape(previewMissing ? "#" : previewUrl)}" target="${previewTarget}" rel="${previewRel}" ${previewMissing ? `data-preview-missing="${this.escape(resource.id)}"` : ""}>Preview</a>
          <button class="btn btn-primary btn-small" type="button" data-assign-resource="${this.escape(resource.id)}">Assign</button>
        </div>
      </article>
    `;
  }

  static bindPremiumLibraryActions(resources, classrooms) {
    document.querySelectorAll("#premium-library-placeholder [data-preview-missing]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        this.showToast("This ZIP has been uploaded but has not been processed into a preview yet.", "error");
      });
    });

    document.querySelectorAll("#premium-library-placeholder [data-assign-resource]").forEach((button) => {
      button.addEventListener("click", () => {
        const resource = resources.find((item) => String(item.id) === String(button.dataset.assignResource));
        if (resource) this.openResourceAssignment(resource, classrooms);
      });
    });
  }

  static async renderSavedCollections() {
    const savedList = document.getElementById("saved-collections-list");
    const detectedClassroomId = this.getCurrentClassroomId();
    const backHref = this.getRouteHref("activityHub", { classroomId: detectedClassroomId });
    document.querySelectorAll("[data-saved-collections-back]").forEach((link) => {
      link.setAttribute("href", backHref);
    });

    try {
      const [savedCollections, dashboardData] = await Promise.all([
        ClassroomAPI.getSavedCollections(),
        ClassroomAPI.getTeacherDashboardData()
      ]);
      const classrooms = dashboardData.classrooms || [];

      if (savedList) {
        savedList.innerHTML = savedCollections.length
          ? savedCollections.map((resource) => this.renderSavedCollectionCard(resource)).join("")
          : this.emptyState("No saved collections yet.", "Save works from Explore to use them in your classroom.");
      }

      this.bindTeachingResourceActions(savedCollections, classrooms);
      this.bindSavedCollectionBulkActions(savedCollections, classrooms);
      this.bindLearningSpreeForm(savedCollections, classrooms, detectedClassroomId);
      this.enhanceDateInputs();
    } catch (error) {
      const message = error?.message || String(error);
      console.error(`[Digital Classroom] renderSavedCollections failed while querying bookmarks/submissions: ${message}`, {
        functionName: "renderSavedCollections",
        tables: ["bookmarks", "submissions"],
        code: error?.code || null,
        details: error?.details || null,
        hint: error?.hint || null
      });

      if (savedList) {
        savedList.innerHTML = this.emptyState(
          "Could not load saved collections",
          "Refresh the page or try again after saving a work from Explore."
        );
      }
    }
  }

  static renderSavedCollectionCard(resource) {
    const previewUrl = resource.fileUrl || `#detail/${encodeURIComponent(resource.id)}`;
    const previewTarget = resource.fileUrl ? "_blank" : "_self";
    const previewRel = resource.fileUrl ? "noopener noreferrer" : "";

    return `
      <article class="teaching-resource-card saved-collection-card" data-resource-id="${this.escape(resource.id)}">
        <label class="saved-selection-control" aria-label="Select ${this.escape(resource.title)}">
          <input type="checkbox" data-select-saved-resource="${this.escape(resource.id)}">
          <span aria-hidden="true"></span>
        </label>
        <div class="teaching-resource-copy">
          <div class="teaching-resource-title-row">
            <h3>${this.escape(resource.title)}</h3>
            <span class="resource-visibility-badge is-public">Saved</span>
          </div>
          <div class="teaching-resource-meta">
            <span>${this.escape(resource.resourceType)}</span>
            <span>Saved ${this.formatDate(resource.savedAt)}</span>
            <span>By ${this.escape(resource.authorName)}</span>
          </div>
          ${resource.description ? `<p>${this.escape(resource.description)}</p>` : ""}
        </div>
        <div class="teaching-resource-actions">
          <a class="btn btn-secondary btn-small" href="${this.escape(previewUrl)}" target="${previewTarget}" rel="${previewRel}">Preview</a>
          <button class="btn btn-primary btn-small" type="button" data-assign-resource="${this.escape(resource.id)}">Assign</button>
        </div>
      </article>
    `;
  }

  static bindSavedCollectionBulkActions(resources, classrooms) {
    const selectButton = document.querySelector("[data-select-multiple]");
    const actionBar = document.querySelector("[data-saved-selection-bar]");
    const selectedCount = document.querySelector("[data-selected-count]");
    const assignSelectedButton = document.querySelector("[data-assign-selected]");
    const createSpreeButton = document.querySelector("[data-create-learning-spree]");
    const clearButton = document.querySelector("[data-clear-selection]");
    const list = document.getElementById("saved-collections-list");
    if (!selectButton || !actionBar || !selectedCount || !list) return;

    const selectedIds = new Set();
    const setSelectionMode = (enabled) => {
      list.classList.toggle("is-selecting", enabled);
      selectButton.classList.toggle("active", enabled);
      selectButton.textContent = enabled ? "Selection Mode" : "Select Multiple";
      selectButton.setAttribute("aria-pressed", enabled ? "true" : "false");
    };

    const updateSelectionUi = () => {
      document.querySelectorAll("[data-select-saved-resource]").forEach((checkbox) => {
        const isSelected = selectedIds.has(String(checkbox.dataset.selectSavedResource));
        checkbox.checked = isSelected;
        checkbox.closest(".saved-collection-card")?.classList.toggle("is-selected", isSelected);
      });

      const count = selectedIds.size;
      selectedCount.textContent = `${count} ${count === 1 ? "material" : "materials"} selected`;
      actionBar.hidden = count === 0;
    };

    const clearSelection = () => {
      selectedIds.clear();
      updateSelectionUi();
    };

    setSelectionMode(false);
    updateSelectionUi();

    selectButton.addEventListener("click", () => {
      const enabled = !list.classList.contains("is-selecting");
      setSelectionMode(enabled);
      if (!enabled) clearSelection();
    });

    list.querySelectorAll("[data-select-saved-resource]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const resourceId = String(checkbox.dataset.selectSavedResource || "");
        if (!resourceId) return;
        if (checkbox.checked) selectedIds.add(resourceId);
        else selectedIds.delete(resourceId);
        updateSelectionUi();
      });
    });

    clearButton?.addEventListener("click", clearSelection);
    assignSelectedButton?.addEventListener("click", () => {
      const selectedResources = [...selectedIds]
        .map((id) => resources.find((resource) => String(resource.id) === id))
        .filter(Boolean);
      if (selectedResources.length) this.openResourceAssignment(selectedResources, classrooms);
    });

    createSpreeButton?.addEventListener("click", () => {
      const selectedResources = [...selectedIds]
        .map((id) => resources.find((resource) => String(resource.id) === id))
        .filter(Boolean);
      this.openLearningSpreeForm(selectedResources, classrooms);
    });
  }

  static enhanceDateInputs(root = document) {
    const today = this.getTodayInTimezone();
    root.querySelectorAll("[data-modern-date]").forEach((input) => {
      if (!input.min) input.min = today;
      const shell = input.closest(".date-picker-shell");
      const preview = shell?.querySelector("[data-date-preview]");
      const updatePreview = () => {
        preview.textContent = input.value ? this.formatDate(input.value) : (preview.dataset.placeholder || preview.textContent || "Select date");
        shell?.classList.toggle("has-value", Boolean(input.value));
      };
      if (preview && !preview.dataset.placeholder) preview.dataset.placeholder = preview.textContent || "Select date";
      if (input.dataset.dateBound !== "true") {
        input.dataset.dateBound = "true";
        input.addEventListener("change", updatePreview);
        input.addEventListener("input", updatePreview);
        shell?.addEventListener("click", () => input.showPicker?.());
      }
      updatePreview();
    });
  }

  static getClassroomTimezone() {
    return "Asia/Colombo";
  }

  static addDaysToDate(dateText, days) {
    const [year, month, day] = String(dateText).split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days));
    return date.toISOString().slice(0, 10);
  }

  static getTodayInTimezone(timezone = this.getClassroomTimezone()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
  }

  static getSpreeItemUnlockDate(assignment, item) {
    if (assignment.unlockMode !== "one_lesson_per_day") return "";
    const startDate = assignment.startDate || assignment.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    return this.addDaysToDate(startDate, Math.max(Number(item.position || 1) - 1, 0));
  }

  static isSpreeItemUnlocked(assignment, item, today = this.getTodayInTimezone(assignment.timezone || this.getClassroomTimezone())) {
    if (assignment.unlockMode !== "one_lesson_per_day") return true;
    return this.getSpreeItemUnlockDate(assignment, item) <= today;
  }

  static getUnlockText(unlockDate) {
    if (!unlockDate) return "Available";
    const tomorrow = this.addDaysToDate(this.getTodayInTimezone(), 1);
    if (unlockDate === tomorrow) return "Unlocks tomorrow";
    return `Unlocks on ${this.formatDate(unlockDate)}`;
  }

  static getLearningSpreeResources(form) {
    try {
      return JSON.parse(form?.dataset.resources || "[]");
    } catch (error) {
      return [];
    }
  }

  static setLearningSpreeResources(form, resources) {
    if (!form) return;
    form.dataset.resources = JSON.stringify(resources);
    form.elements.resourceIds.value = resources.map((item) => item.id).join(",");
    this.renderLearningSpreeSelectedList(resources);
    this.setText("learning-spree-count", `${resources.length} ${resources.length === 1 ? "selected" : "selected"}`);
  }

  static renderLearningSpreeSelectedList(resources = []) {
    const list = document.getElementById("learning-spree-selected-list");
    if (!list) return;
    list.innerHTML = resources.length
      ? resources.map((resource, index) => `
        <article class="spree-lesson-item" data-spree-resource-id="${this.escape(resource.id)}">
          <span class="spree-lesson-order">${index + 1}</span>
          <div class="spree-lesson-copy">
            <h4>${this.escape(resource.title)}</h4>
            <span>${this.escape(resource.resourceType || "saved work")} / ${resource.savedAt ? `Saved ${this.formatDate(resource.savedAt)}` : this.escape(resource.authorName || "Saved material")}</span>
          </div>
          <div class="spree-lesson-controls">
            <button class="icon-button glass-chip" type="button" data-spree-move="up" data-spree-index="${index}" aria-label="Move ${this.escape(resource.title)} up" ${index === 0 ? "disabled" : ""}>${this.getIcon("arrowUp")}</button>
            <button class="icon-button glass-chip" type="button" data-spree-move="down" data-spree-index="${index}" aria-label="Move ${this.escape(resource.title)} down" ${index === resources.length - 1 ? "disabled" : ""}>${this.getIcon("arrowDown")}</button>
            <button class="icon-button glass-chip" type="button" data-spree-remove="${index}" aria-label="Remove ${this.escape(resource.title)}">${this.getIcon("trash")}</button>
          </div>
        </article>
      `).join("")
      : this.emptyState("No lessons selected", "Return to Saved Collections and choose at least two materials.");
  }

  static openLearningSpreeForm(resources, classrooms = []) {
    const panel = document.getElementById("learning-spree-panel");
    const form = document.getElementById("learning-spree-form");
    if (!panel || !form) return;

    if (resources.length < 2) {
      this.showNotice("learning-spree-notice", "Select at least two saved materials to create a Learning Spree.", "error");
      return;
    }

    panel.hidden = false;
    const classroomSelect = form.querySelector('select[name="classroomId"]');
    const detectedClassroomId = this.getCurrentClassroomId();
    if (classroomSelect) {
      classroomSelect.innerHTML = classrooms.length
        ? classrooms.map((classroom) => `<option value="${this.escape(classroom.id)}">${this.escape(classroom.name)}</option>`).join("")
        : '<option value="" disabled selected>No classrooms available</option>';
      if (detectedClassroomId && classrooms.some((classroom) => String(classroom.id) === String(detectedClassroomId))) {
        classroomSelect.value = detectedClassroomId;
      }
    }

    form.elements.title.value = "Learning Spree";
    form.elements.instructions.value = resources.map((item, index) => `${index + 1}. ${item.title}`).join("\n");
    form.elements.dueDate.value = "";
    form.elements.startDate.value = this.getTodayInTimezone();
    form.querySelector('input[name="unlockMode"][value="open_access"]').checked = true;
    form.querySelector("[data-start-date-group]").hidden = true;
    this.setLearningSpreeResources(form, resources);
    this.enhanceDateInputs(form);
    this.showNotice("learning-spree-notice", "", "");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  static async openAddLearningMaterialModal({ classroomId = "" } = {}) {
    const existing = document.getElementById("add-material-choice-modal");
    if (existing) existing.remove();

    const quota = await ClassroomAPI.getTeacherStorageUsage().catch(() => null);
    const quotaText = quota
      ? `${quota.usedMb} MB / ${quota.maxMb} MB used (${quota.percentage}%)`
      : "500 MB cloud storage";

    const modalHtml = `
      <div class="cloud-modal-backdrop" id="add-material-choice-modal">
        <div class="cloud-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="choice-modal-title">
          <div class="cloud-modal-header">
            <div class="cloud-modal-header-copy">
              <h3 id="choice-modal-title">Add Learning Material</h3>
              <p>Choose how you would like to add materials for your class</p>
            </div>
            <button class="cloud-modal-close" type="button" aria-label="Close modal">&times;</button>
          </div>
          <div class="cloud-modal-body">
            <div class="cloud-action-choice-grid">
              <div class="cloud-action-choice-card" role="button" tabindex="0" data-choice="device">
                <div class="cloud-choice-icon is-upload">📤</div>
                <div class="cloud-choice-copy">
                  <h4>Upload from Device</h4>
                  <p>Upload a new PDF or document from your computer/phone into your cloud storage.</p>
                </div>
                <span class="cloud-choice-badge">Upload &amp; Assign</span>
              </div>
              <div class="cloud-action-choice-card" role="button" tabindex="0" data-choice="cloud">
                <div class="cloud-choice-icon">☁️</div>
                <div class="cloud-choice-copy">
                  <h4>Explore Your Cloud Bucket</h4>
                  <p>Pick from files already saved in your 500 MB Cloudflare bucket without re-uploading.</p>
                </div>
                <span class="cloud-choice-badge is-instant">Instant &bull; 0 MB added</span>
              </div>
            </div>
            <div style="margin-top: 14px; text-align: center; font-size: 0.8rem; color: var(--text-muted, #64748b);">
              <span>Cloud Storage Quota: <strong>${quotaText}</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    const modalEl = document.getElementById("add-material-choice-modal");

    const closeModal = () => modalEl?.remove();
    modalEl.querySelector(".cloud-modal-close")?.addEventListener("click", closeModal);
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) closeModal();
    });

    modalEl.querySelector('[data-choice="device"]')?.addEventListener("click", () => {
      closeModal();
      ClassroomUI.openUploadFromDeviceModal({ classroomId });
    });

    modalEl.querySelector('[data-choice="cloud"]')?.addEventListener("click", () => {
      closeModal();
      ClassroomUI.openCloudBucketModal({ classroomId });
    });
  }

  static async openCloudBucketModal({ classroomId = "" } = {}) {
    const existing = document.getElementById("cloud-bucket-modal");
    if (existing) existing.remove();

    const [materials, quota] = await Promise.all([
      ClassroomAPI.getTeacherCloudMaterials(classroomId),
      ClassroomAPI.getTeacherStorageUsage()
    ]);

    const isNearLimit = quota.percentage >= 85;
    const isFull = quota.percentage >= 100;
    const quotaClass = isFull ? "is-danger" : (isNearLimit ? "is-warning" : "");
    const categories = Array.from(new Set(materials.map(m => m.category || m.resourceType || "General").filter(Boolean)));

    const renderMaterialCard = (material) => {
      const isAssigned = Boolean(material.isAssigned);
      return `
        <div class="cloud-material-card ${isAssigned ? "is-assigned" : ""}" data-material-id="${ClassroomUI.escape(material.id)}" data-category="${ClassroomUI.escape(material.category || material.resourceType || '')}" data-title="${ClassroomUI.escape(material.title)}" data-filename="${ClassroomUI.escape(material.originalFilename || '')}">
          <input type="checkbox" class="cloud-material-checkbox" data-select-id="${ClassroomUI.escape(material.id)}" ${isAssigned ? "disabled checked" : ""} aria-label="Select ${ClassroomUI.escape(material.title)}">
          <div class="cloud-material-pdf-badge">
            <span>📄</span>
            PDF
          </div>
          <div class="cloud-material-info">
            <div class="cloud-material-title-row">
              <span class="cloud-material-title">${ClassroomUI.escape(material.title)}</span>
              ${material.category ? `<span class="cloud-material-tag">${ClassroomUI.escape(material.category)}</span>` : ""}
              ${isAssigned ? `<span class="already-assigned-badge">✓ Already Assigned to this Class</span>` : ""}
            </div>
            <div class="cloud-material-meta">
              <span class="file-name" title="${ClassroomUI.escape(material.originalFilename)}">${ClassroomUI.escape(material.originalFilename)}</span>
              <span>&bull;</span>
              <span>${ClassroomUI.escape(material.formattedSize || "0 B")}</span>
              <span>&bull;</span>
              <span>${ClassroomUI.formatDate(material.createdAt)}</span>
            </div>
          </div>
          <div class="cloud-material-actions">
            <button class="btn-preview-icon" type="button" data-preview-id="${ClassroomUI.escape(material.id)}" title="Preview PDF">
              👁️ Preview
            </button>
          </div>
        </div>
      `;
    };

    const modalHtml = `
      <div class="cloud-modal-backdrop" id="cloud-bucket-modal">
        <div class="cloud-modal-dialog modal-large" role="dialog" aria-modal="true" aria-labelledby="bucket-modal-title">
          <div class="cloud-modal-header">
            <div class="cloud-modal-header-copy">
              <h3 id="bucket-modal-title">YOUR CLOUD MATERIALS</h3>
              <p>Select a material to assign to this class &bull; Reuses files in cloud storage without duplicate upload</p>
            </div>
            <button class="cloud-modal-close" type="button" aria-label="Close modal">&times;</button>
          </div>
          <div class="cloud-modal-body">
            <!-- Quota Bar -->
            <div class="teacher-storage-quota-widget" style="margin-bottom: 16px; padding: 12px 16px;">
              <div class="quota-widget-header">
                <span class="quota-widget-title" style="font-size: 0.88rem;">
                  <span class="quota-cloud-icon">☁️</span> Cloud Storage Allocation
                </span>
                <span class="quota-stat-text">
                  Storage Used: <strong>${quota.usedMb} MB</strong> / 500 MB (${quota.percentage}%) &bull; <strong>${quota.remainingMb} MB remaining</strong>
                </span>
              </div>
              <div class="quota-progress-track">
                <div class="quota-progress-fill ${quotaClass}" style="width: ${quota.percentage}%;"></div>
              </div>
            </div>

            <!-- Toolbar -->
            <div class="cloud-bucket-toolbar">
              <div class="cloud-bucket-search-wrap">
                <span class="cloud-bucket-search-icon">🔍</span>
                <input id="cloud-search-input" type="search" placeholder="Search materials by name or filename..." autocomplete="off">
              </div>
              <div class="cloud-bucket-filters">
                <select id="cloud-category-select" class="cloud-bucket-select" aria-label="Filter by category">
                  <option value="">All Categories</option>
                  ${categories.map(cat => `<option value="${ClassroomUI.escape(cat)}">${ClassroomUI.escape(cat)}</option>`).join("")}
                </select>
                <select id="cloud-sort-select" class="cloud-bucket-select" aria-label="Sort materials">
                  <option value="newest">Newest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="size">Size (Largest)</option>
                </select>
              </div>
            </div>

            <!-- Materials List -->
            <div id="cloud-materials-container" class="cloud-materials-grid">
              ${materials.length ? materials.map(renderMaterialCard).join("") : `
                <div style="text-align: center; padding: 36px 16px;">
                  <div style="font-size: 2.5rem; margin-bottom: 10px;">📦</div>
                  <h4 style="margin: 0 0 6px;">No materials in your cloud bucket yet</h4>
                  <p style="margin: 0 0 16px; color: var(--text-muted, #64748b); font-size: 0.88rem;">Upload your first PDF to start building your reusable cloud library.</p>
                  <button class="btn btn-primary btn-small" type="button" data-switch-to-upload>Upload from Device</button>
                </div>
              `}
            </div>
          </div>
          <div class="cloud-modal-footer">
            <div style="font-size: 0.88rem; color: var(--text-muted, #64748b);">
              <span id="cloud-selected-count">0 materials selected</span>
              <span style="font-size: 0.78rem; opacity: 0.8; margin-left: 6px;">(0 MB added)</span>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary btn-small" type="button" data-bucket-cancel>Cancel</button>
              <button class="btn btn-primary btn-small" type="button" id="btn-assign-cloud-materials" disabled>
                Assign Selected Materials
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    const modalEl = document.getElementById("cloud-bucket-modal");
    const container = document.getElementById("cloud-materials-container");
    const searchInput = document.getElementById("cloud-search-input");
    const categorySelect = document.getElementById("cloud-category-select");
    const sortSelect = document.getElementById("cloud-sort-select");
    const assignBtn = document.getElementById("btn-assign-cloud-materials");
    const countLabel = document.getElementById("cloud-selected-count");

    const selectedIds = new Set();

    const updateSelectionUI = () => {
      const count = selectedIds.size;
      countLabel.textContent = `${count} material${count === 1 ? "" : "s"} selected`;
      assignBtn.disabled = count === 0;
      assignBtn.textContent = count > 0 ? `Assign Selected Materials (${count})` : "Assign Selected Materials";
    };

    const bindListEvents = () => {
      container.querySelectorAll(".cloud-material-card").forEach(card => {
        const id = card.dataset.materialId;
        const checkbox = card.querySelector(".cloud-material-checkbox");
        if (!checkbox || checkbox.disabled) return;

        card.addEventListener("click", (e) => {
          if (e.target.closest(".btn-preview-icon")) return;
          checkbox.checked = !checkbox.checked;
          if (checkbox.checked) {
            selectedIds.add(id);
            card.classList.add("is-selected");
          } else {
            selectedIds.delete(id);
            card.classList.remove("is-selected");
          }
          updateSelectionUI();
        });

        checkbox.addEventListener("click", (e) => {
          e.stopPropagation();
          if (checkbox.checked) {
            selectedIds.add(id);
            card.classList.add("is-selected");
          } else {
            selectedIds.delete(id);
            card.classList.remove("is-selected");
          }
          updateSelectionUI();
        });
      });

      container.querySelectorAll("[data-preview-id]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = btn.dataset.previewId;
          const item = materials.find(m => String(m.id) === String(id));
          if (item) {
            ClassroomUI.openPdfPreviewModal({
              title: item.title,
              url: item.previewUrl || item.fileUrl,
              filename: item.originalFilename
            });
          }
        });
      });

      modalEl.querySelector("[data-switch-to-upload]")?.addEventListener("click", () => {
        closeModal();
        ClassroomUI.openUploadFromDeviceModal({ classroomId });
      });
    };

    bindListEvents();

    const filterAndSort = () => {
      const q = (searchInput?.value || "").toLowerCase().trim();
      const cat = categorySelect?.value || "";
      const sort = sortSelect?.value || "newest";

      let filtered = materials.filter(m => {
        const matchesQuery = !q ||
          m.title.toLowerCase().includes(q) ||
          (m.originalFilename && m.originalFilename.toLowerCase().includes(q)) ||
          (m.description && m.description.toLowerCase().includes(q));
        const matchesCategory = !cat || (m.category === cat || m.resourceType === cat);
        return matchesQuery && matchesCategory;
      });

      if (sort === "name") {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sort === "size") {
        filtered.sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
      } else {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      container.innerHTML = filtered.length
        ? filtered.map(renderMaterialCard).join("")
        : `<div style="text-align: center; padding: 24px; color: var(--text-muted, #64748b);">No materials match your search.</div>`;

      filtered.forEach(m => {
        if (selectedIds.has(m.id)) {
          const card = container.querySelector(`[data-material-id="${m.id}"]`);
          const cb = card?.querySelector(".cloud-material-checkbox");
          if (card && cb && !cb.disabled) {
            cb.checked = true;
            card.classList.add("is-selected");
          }
        }
      });

      bindListEvents();
    };

    searchInput?.addEventListener("input", filterAndSort);
    categorySelect?.addEventListener("change", filterAndSort);
    sortSelect?.addEventListener("change", filterAndSort);

    const closeModal = () => modalEl?.remove();
    modalEl.querySelector(".cloud-modal-close")?.addEventListener("click", closeModal);
    modalEl.querySelector("[data-bucket-cancel]")?.addEventListener("click", closeModal);
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) closeModal();
    });

    assignBtn.addEventListener("click", async () => {
      if (selectedIds.size === 0) return;
      assignBtn.disabled = true;
      assignBtn.textContent = "Assigning Materials...";

      try {
        const resourceIds = Array.from(selectedIds);
        await ClassroomAPI.assignCloudMaterialsToClassroom({
          classroomId,
          resourceIds
        });

        ClassroomUI.showToast(
          resourceIds.length === 1
            ? "Material assigned to class successfully!"
            : `${resourceIds.length} materials assigned to class successfully!`,
          "success"
        );

        closeModal();

        if (classroomId) {
          await ClassroomUI.refreshClassroomSections(classroomId);
        } else {
          await ClassroomUI.renderTeachingResources(classroomId);
        }
      } catch (err) {
        console.error("[Digital Classroom] Cloud material assignment failed", err);
        ClassroomUI.showToast(err?.message || "Could not assign materials. Please try again.", "error");
        assignBtn.disabled = false;
        updateSelectionUI();
      }
    });
  }

  static async openUploadFromDeviceModal({ classroomId = "", prefillFile = null } = {}) {
    const existing = document.getElementById("upload-device-modal");
    if (existing) existing.remove();

    const quota = await ClassroomAPI.getTeacherStorageUsage().catch(() => null);
    const isFull = quota && quota.percentage >= 100;

    const modalHtml = `
      <div class="cloud-modal-backdrop" id="upload-device-modal">
        <div class="cloud-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="upload-modal-title">
          <div class="cloud-modal-header">
            <div class="cloud-modal-header-copy">
              <h3 id="upload-modal-title">Upload from Device</h3>
              <p>Upload a PDF to your Cloudflare storage and assign it to class</p>
            </div>
            <button class="cloud-modal-close" type="button" aria-label="Close modal">&times;</button>
          </div>
          <div class="cloud-modal-body">
            ${isFull ? `
              <div class="duplicate-alert-card" style="background: #fef2f2; border-color: #fecaca;">
                <div class="duplicate-alert-header" style="color: #991b1b;">
                  <span>⚠️</span> Cloud Storage Full (500 MB reached)
                </div>
                <div class="duplicate-alert-info" style="color: #7f1d1d;">
                  You have reached your 500 MB cloud storage allocation. You can still assign any of your existing cloud materials to this class without using any extra storage.
                </div>
                <div class="duplicate-alert-actions">
                  <button class="btn btn-primary btn-small" type="button" data-switch-to-bucket>Explore Your Cloud Bucket</button>
                </div>
              </div>
            ` : ""}

            <form id="device-upload-form" ${isFull ? 'style="opacity: 0.5; pointer-events: none;"' : ""}>
              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" for="device-file-input">Select File (PDF, Document) *</label>
                <input id="device-file-input" class="form-control" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf" required>
              </div>

              <!-- Duplicate Alert Placeholder -->
              <div id="duplicate-detection-container"></div>

              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" for="material-name-input">Material Name *</label>
                <input id="material-name-input" class="form-control" type="text" placeholder="e.g., Present Simple Grammar Guide" required>
              </div>

              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" for="material-category-input">Category / Topic</label>
                <input id="material-category-input" class="form-control" type="text" placeholder="e.g., Grammar, Reading, Unit 1">
              </div>

              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" for="material-desc-input">Description / Student Instructions</label>
                <textarea id="material-desc-input" class="form-control" rows="2" placeholder="Optional notes for students..."></textarea>
              </div>

              <!-- Upload Progress -->
              <div id="upload-progress-container" class="cloud-upload-progress-wrap" hidden>
                <div class="cloud-upload-progress-header">
                  <span id="upload-status-text">Uploading to Cloud Storage...</span>
                  <span id="upload-percent-text">0%</span>
                </div>
                <div class="quota-progress-track">
                  <div id="upload-progress-bar" class="quota-progress-fill" style="width: 0%;"></div>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
                <span style="font-size: 0.8rem; color: var(--text-muted, #64748b);">
                  ${quota ? `Remaining storage: <strong>${quota.remainingMb} MB</strong>` : ""}
                </span>
                <div style="display: flex; gap: 10px;">
                  <button class="btn btn-secondary btn-small" type="button" data-upload-cancel>Cancel</button>
                  <button class="btn btn-primary btn-small" type="submit" id="btn-submit-upload">
                    Upload &amp; Assign
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    const modalEl = document.getElementById("upload-device-modal");
    const form = document.getElementById("device-upload-form");
    const fileInput = document.getElementById("device-file-input");
    const nameInput = document.getElementById("material-name-input");
    const categoryInput = document.getElementById("material-category-input");
    const descInput = document.getElementById("material-desc-input");
    const duplicateContainer = document.getElementById("duplicate-detection-container");
    const progressContainer = document.getElementById("upload-progress-container");
    const progressBar = document.getElementById("upload-progress-bar");
    const statusText = document.getElementById("upload-status-text");
    const percentText = document.getElementById("upload-percent-text");
    const submitBtn = document.getElementById("btn-submit-upload");

    let existingMatch = null;

    modalEl.querySelector("[data-switch-to-bucket]")?.addEventListener("click", () => {
      closeModal();
      ClassroomUI.openCloudBucketModal({ classroomId });
    });

    const closeModal = () => modalEl?.remove();
    modalEl.querySelector(".cloud-modal-close")?.addEventListener("click", closeModal);
    modalEl.querySelector("[data-upload-cancel]")?.addEventListener("click", closeModal);
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) closeModal();
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;

      if (!nameInput.value.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        nameInput.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }

      duplicateContainer.innerHTML = "";
      existingMatch = await ClassroomAPI.findMatchingCloudMaterial({
        filename: file.name,
        size: file.size
      }).catch(() => null);

      if (existingMatch) {
        duplicateContainer.innerHTML = `
          <div class="duplicate-alert-card">
            <div class="duplicate-alert-header">
              <span>⚠️</span> This material is already in your cloud storage.
            </div>
            <div class="duplicate-alert-info">
              <strong>Existing file:</strong> "${ClassroomUI.escape(existingMatch.title)}"<br>
              <span style="font-size: 0.8rem; opacity: 0.85;">
                ${ClassroomUI.escape(existingMatch.originalFilename || file.name)} &bull; ${ClassroomUI.escape(existingMatch.formattedSize || '')} &bull; Uploaded ${ClassroomUI.formatDate(existingMatch.createdAt)}
              </span>
            </div>
            <div class="duplicate-alert-actions">
              <button class="btn btn-primary btn-small" type="button" id="btn-use-existing-file">
                [ Use Existing File ]
              </button>
              <button class="btn btn-secondary btn-small" type="button" id="btn-upload-anyway" style="font-size: 0.78rem;">
                Upload Anyway as New File
              </button>
            </div>
          </div>
        `;

        document.getElementById("btn-use-existing-file")?.addEventListener("click", async () => {
          try {
            submitBtn.disabled = true;
            submitBtn.textContent = "Assigning...";
            await ClassroomAPI.assignCloudMaterialsToClassroom({
              classroomId,
              resourceIds: [existingMatch.id],
              title: nameInput.value.trim() || existingMatch.title,
              instructions: descInput.value.trim()
            });

            ClassroomUI.showToast(`Existing file "${existingMatch.title}" assigned successfully! (0 MB added)`, "success");
            closeModal();
            if (classroomId) await ClassroomUI.refreshClassroomSections(classroomId);
          } catch (err) {
            ClassroomUI.showToast(err?.message || "Could not assign existing file.", "error");
            submitBtn.disabled = false;
          }
        });

        document.getElementById("btn-upload-anyway")?.addEventListener("click", () => {
          duplicateContainer.innerHTML = `
            <div style="font-size: 0.8rem; color: var(--text-muted, #64748b); margin-bottom: 10px;">
              ✓ Proceeding with new file upload.
            </div>
          `;
          existingMatch = null;
        });
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const file = fileInput.files[0];
      if (!file) return;

      const title = nameInput.value.trim() || file.name;
      const category = categoryInput.value.trim() || "General";
      const description = descInput.value.trim();

      submitBtn.disabled = true;
      progressContainer.hidden = false;
      progressBar.style.width = "20%";
      percentText.textContent = "20%";
      statusText.textContent = "Requesting secure cloud storage signature...";

      try {
        const submissionId = "sub_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        let uploadResult = null;

        if (window.DigitalClassroomSupabase?.getSession) {
          const session = await window.DigitalClassroomSupabase.getSession().catch(() => null);
          if (session?.access_token) {
            const signRes = await fetch("/api/r2?action=sign-upload", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                submissionId,
                assetType: "project",
                filename: file.name,
                contentType: file.type || "application/pdf",
                size: file.size
              })
            });

            if (!signRes.ok) {
              const errJson = await signRes.json().catch(() => ({}));
              throw new Error(errJson.error || "Could not sign upload.");
            }

            uploadResult = await signRes.json();
          }
        }

        progressBar.style.width = "50%";
        percentText.textContent = "50%";
        statusText.textContent = "Uploading file to Cloudflare R2...";

        let fileUrl = "";
        let filePath = "";

        if (uploadResult?.uploadUrl) {
          const putRes = await fetch(uploadResult.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "application/pdf"
            },
            body: file
          });

          if (!putRes.ok) {
            throw new Error("Could not store file in cloud bucket.");
          }

          fileUrl = uploadResult.publicUrl || "";
          filePath = uploadResult.objectKey || "";
        } else {
          fileUrl = URL.createObjectURL(file);
          filePath = `projects/teacher/${file.name}`;
        }

        progressBar.style.width = "85%";
        percentText.textContent = "85%";
        statusText.textContent = "Saving resource record...";

        const resource = await ClassroomAPI.createTeachingResource({
          title,
          originalFilename: file.name,
          filename: file.name,
          fileUrl,
          filePath,
          fileSize: file.size,
          fileType: "pdf",
          mimeType: file.type || "application/pdf",
          category,
          resourceType: "PDF",
          description
        });

        progressBar.style.width = "100%";
        percentText.textContent = "100%";
        statusText.textContent = "Finalizing assignment...";

        if (classroomId && resource) {
          await ClassroomAPI.assignCloudMaterialsToClassroom({
            classroomId,
            resourceIds: [resource.id],
            title,
            instructions: description
          });
        }

        ClassroomUI.showToast(`"${title}" uploaded to cloud and assigned successfully!`, "success");
        closeModal();

        if (classroomId) {
          await ClassroomUI.refreshClassroomSections(classroomId);
        } else {
          await ClassroomUI.renderTeachingResources(classroomId);
        }
      } catch (err) {
        console.error("[Digital Classroom] Device upload failed", err);
        ClassroomUI.showToast(err?.message || "Upload failed. Please try again.", "error");
        submitBtn.disabled = false;
        progressContainer.hidden = true;
      }
    });
  }

  static openPdfPreviewModal({ title = "PDF Preview", url = "", filename = "" } = {}) {
    const existing = document.getElementById("pdf-preview-modal");
    if (existing) existing.remove();

    const isSecure = /^https?:\/\//i.test(url) || url.startsWith("blob:");
    const frameSrc = isSecure ? url : "";

    const modalHtml = `
      <div class="cloud-modal-backdrop" id="pdf-preview-modal">
        <div class="cloud-modal-dialog pdf-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title">
          <div class="cloud-modal-header">
            <div class="cloud-modal-header-copy">
              <h3 id="pdf-preview-title">📄 ${ClassroomUI.escape(title)}</h3>
              <p>${ClassroomUI.escape(filename || "PDF Document Preview")}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${url ? `<a class="btn btn-secondary btn-small" href="${ClassroomUI.escape(url)}" target="_blank" rel="noopener noreferrer" download>⬇️ Open / Download</a>` : ""}
              <button class="cloud-modal-close" type="button" aria-label="Close preview">&times;</button>
            </div>
          </div>
          <div style="flex: 1; min-height: 0; position: relative;">
            ${frameSrc ? `
              <iframe class="pdf-preview-frame" src="${ClassroomUI.escape(frameSrc)}" title="${ClassroomUI.escape(title)}"></iframe>
            ` : `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 32px; text-align: center;">
                <p style="font-size: 1.1rem; font-weight: 600;">Preview unavailable</p>
                <p style="color: var(--text-muted, #64748b); font-size: 0.88rem;">The file can still be opened directly or assigned to your students.</p>
                ${url ? `<a class="btn btn-primary btn-small" href="${ClassroomUI.escape(url)}" target="_blank" rel="noopener">Open File Directly</a>` : ""}
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    const modalEl = document.getElementById("pdf-preview-modal");

    const closeModal = () => modalEl?.remove();
    modalEl.querySelector(".cloud-modal-close")?.addEventListener("click", closeModal);
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) closeModal();
    });
  }

  static bindLearningSpreeForm(resources, classrooms, classroomId = "") {
    const form = document.getElementById("learning-spree-form");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";

    form.querySelectorAll('input[name="unlockMode"]').forEach((input) => {
      input.addEventListener("change", () => {
        const startDateGroup = form.querySelector("[data-start-date-group]");
        const isDaily = form.elements.unlockMode.value === "one_lesson_per_day";
        if (startDateGroup) startDateGroup.hidden = !isDaily;
        form.elements.startDate.required = isDaily;
      });
    });

    document.getElementById("learning-spree-selected-list")?.addEventListener("click", (event) => {
      const moveButton = event.target.closest("[data-spree-move]");
      const removeButton = event.target.closest("[data-spree-remove]");
      const current = this.getLearningSpreeResources(form);
      if (moveButton) {
        const index = Number(moveButton.dataset.spreeIndex);
        const direction = moveButton.dataset.spreeMove === "up" ? -1 : 1;
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= current.length) return;
        [current[index], current[nextIndex]] = [current[nextIndex], current[index]];
        this.setLearningSpreeResources(form, current);
      }
      if (removeButton) {
        const index = Number(removeButton.dataset.spreeRemove);
        current.splice(index, 1);
        this.setLearningSpreeResources(form, current);
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const selectedResources = this.getLearningSpreeResources(form);
      const selectedIds = selectedResources.map((item) => String(item.id || "").trim()).filter(Boolean);
      const classroomValue = String(formData.get("classroomId") || classroomId || "").trim();
      const title = String(formData.get("title") || "").trim();
      const instructions = String(formData.get("instructions") || "").trim();
      const dueDate = String(formData.get("dueDate") || "").trim();
      const unlockMode = String(formData.get("unlockMode") || "open_access").trim();
      const startDate = String(formData.get("startDate") || "").trim();
      const timezone = this.getClassroomTimezone();

      if (!classroomValue || !title || selectedResources.length < 2 || !dueDate || !unlockMode || selectedIds.length !== selectedResources.length) {
        this.showNotice("learning-spree-notice", "Choose a classroom, title, deadline, unlock mode, and at least two valid saved materials.", "error");
        return;
      }

      if (unlockMode === "one_lesson_per_day" && !startDate) {
        this.showNotice("learning-spree-notice", "Choose a start date for One Lesson Per Day.", "error");
        return;
      }

      if (unlockMode === "one_lesson_per_day") {
        const finalUnlockDate = this.addDaysToDate(startDate, selectedResources.length - 1);
        if (startDate > dueDate) {
          this.showNotice("learning-spree-notice", "Start date should not be after the deadline.", "error");
          return;
        }
        if (finalUnlockDate > dueDate) {
          this.showNotice("learning-spree-notice", "The deadline is before all lessons can unlock.", "error");
          return;
        }
      }

      if (unlockMode !== "open_access" && unlockMode !== "one_lesson_per_day") {
        this.showNotice("learning-spree-notice", "Choose a valid unlock mode.", "error");
        return;
      }

      const resourceItems = selectedResources.map((resource, index) => ({
        id: `${resource.id}:${index + 1}`,
        resourceId: resource.id,
        title: resource.title,
        resourceType: resource.resourceType || "saved work",
        savedAt: resource.savedAt || "",
        authorName: resource.authorName || "",
        fileUrl: resource.fileUrl || "",
        position: index + 1
      }));

      const assignment = await ClassroomAPI.createAssignment({
        classroomId: classroomValue,
        title,
        instructions,
        dueDate,
        points: 0,
        assignmentType: "learning_spree",
        resourceItems,
        unlockMode,
        startDate: unlockMode === "one_lesson_per_day" ? startDate : "",
        timezone,
        status: "published"
      });

      this.showNotice("learning-spree-notice", "Learning Spree created successfully.", "success");
      document.querySelector(".spree-success-actions")?.remove();
      const notice = document.getElementById("learning-spree-notice");
      if (notice) {
        notice.insertAdjacentHTML(
          "afterend",
          `<div class="spree-success-actions">
            <a class="btn btn-primary btn-small" href="${this.escape(this.getRouteHref("detail", { classroomId: classroomValue }))}#assignments-container">View Assignment</a>
            <a class="btn btn-secondary btn-small" href="#saved-collections-list">Back to Saved Collections</a>
          </div>`
        );
      }
      console.info("[Digital Classroom] Learning Spree created", { assignmentId: assignment?.id, selectedIds });
    });
  }

  static bindTeachingResourceActions(resources, classrooms) {
    const refreshEmptyState = () => {
      const list = document.getElementById("teaching-resources-list");
      if (list && !list.querySelector(".teaching-resource-card")) {
        list.innerHTML = this.emptyState("No teaching resources yet", "Upload a resource from your teacher account and it will appear here.");
      }
    };

    const closeResourceMenus = (exceptMenu = null) => {
      document.querySelectorAll(".teaching-resource-menu").forEach((menu) => {
        if (exceptMenu && menu === exceptMenu) return;
        menu.querySelector(".teaching-resource-menu-dropdown")?.setAttribute("hidden", "");
        const toggle = menu.querySelector("[data-resource-menu]");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
    };

    document.querySelectorAll("[data-preview-missing]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        this.showToast("This ZIP has been uploaded but has not been processed into a preview yet.", "error");
      });
    });

    document.querySelectorAll("[data-resource-menu]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const menu = button.closest(".teaching-resource-menu");
        const dropdown = menu?.querySelector(".teaching-resource-menu-dropdown");
        if (!menu || !dropdown) return;
        const willOpen = dropdown.hasAttribute("hidden");
        closeResourceMenus(menu);
        dropdown.toggleAttribute("hidden", !willOpen);
        button.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });
    });

    if (document.body && document.body.dataset.resourceMenuCloseBound !== "true") {
      document.body.dataset.resourceMenuCloseBound = "true";
      document.addEventListener("click", () => {
        document.querySelectorAll(".teaching-resource-menu").forEach((menu) => {
          menu.querySelector(".teaching-resource-menu-dropdown")?.setAttribute("hidden", "");
          menu.querySelector("[data-resource-menu]")?.setAttribute("aria-expanded", "false");
        });
      });
    }

    document.querySelectorAll("[data-open-cloud-bucket]").forEach((button) => {
      button.addEventListener("click", () => {
        ClassroomUI.openCloudBucketModal({ classroomId: this.getCurrentClassroomId() });
      });
    });

    document.querySelectorAll("[data-assign-resource]").forEach((button) => {
      button.addEventListener("click", () => {
        const resource = resources.find((item) => String(item.id) === String(button.dataset.assignResource));
        if (resource) this.openResourceAssignment(resource, classrooms);
      });
    });

    document.querySelectorAll("[data-share-resource-premium]").forEach((button) => {
      button.addEventListener("click", async () => {
        const resourceId = button.dataset.shareResourcePremium;
        const resource = resources.find((item) => String(item.id) === String(resourceId));
        if (!resource) return;
        closeResourceMenus();
        button.disabled = true;
        try {
          await ClassroomAPI.shareResourceToPremiumLibrary(resourceId);
          resource.sharedToPremium = true;
          const titleRow = button.closest(".teaching-resource-card")?.querySelector(".teaching-resource-title-row");
          if (titleRow && !titleRow.querySelector(".resource-visibility-badge.is-premium")) {
            titleRow.insertAdjacentHTML("beforeend", `<span class="resource-visibility-badge is-premium">Premium</span>`);
          }
          this.showToast("Resource shared to Premium Library.", "success");
        } catch (error) {
          console.error("[Digital Classroom] Resource premium share failed", error);
          this.showToast(error?.message || "Could not share this resource. Please try again.", "error");
          button.disabled = false;
        }
      });
    });

    document.querySelectorAll("[data-delete-teacher-resource]").forEach((button) => {
      button.addEventListener("click", async () => {
        const resourceId = button.dataset.deleteTeacherResource;
        const resource = resources.find((item) => String(item.id) === String(resourceId));
        if (!resource) return;
        closeResourceMenus();
        const confirmed = window.confirm("Are you sure you want to delete this resource? This action will remove it from your teaching resources.");
        if (!confirmed) return;
        button.disabled = true;
        try {
          await ClassroomAPI.deleteTeacherResource(resourceId);
          button.closest(".teaching-resource-card")?.remove();
          refreshEmptyState();
          this.showToast("Resource removed from your teaching resources.", "success");
        } catch (error) {
          console.error("[Digital Classroom] Resource delete failed", error);
          this.showToast(error?.message || "Could not delete this resource. Please try again.", "error");
          button.disabled = false;
        }
      });
    });

    const form = document.getElementById("resource-assignment-form");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const selectedResourceIds = String(form.dataset.resourceIds || formData.get("resourceId") || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      const selectedResources = selectedResourceIds
        .map((id) => resources.find((item) => String(item.id) === id))
        .filter(Boolean);
      const resource = selectedResources[0];
      const classroomId = String(formData.get("classroomId") || "").trim();
      const title = String(formData.get("title") || "").trim();
      const dueDate = String(formData.get("dueDate") || "").trim();
      const points = Number(formData.get("points"));

      if (!selectedResources.length || !classroomId || !title || !dueDate || !Number.isFinite(points) || points <= 0) {
        this.showNotice("resource-assignment-notice", "Choose a classroom, title, due date, and positive points value.", "error");
        return;
      }

      const baseInstructions = String(formData.get("instructions") || "").trim();
      await Promise.all(selectedResources.map((selectedResource, index) => {
        const selectedResourceUrl = selectedResource.previewUrl || selectedResource.fileUrl || "";
        const resourceItems = [{
          id: `${selectedResource.id}:${index + 1}`,
          resourceId: selectedResource.id,
          title: selectedResource.title,
          resourceType: selectedResource.resourceType || "resource",
          fileUrl: selectedResource.fileUrl || "",
          resourceUrl: selectedResourceUrl,
          projectUrl: selectedResource.projectUrl || selectedResource.previewUrl || "",
          previewUrl: selectedResource.previewUrl || "",
          metadata: {
            indexUrl: selectedResource.previewUrl || selectedResourceUrl,
            previewUrl: selectedResource.previewUrl || selectedResourceUrl
          },
          position: 1
        }];
        const assignmentTitle = selectedResources.length === 1
          ? title
          : `${title}: ${selectedResource.title}`;

        return ClassroomAPI.createAssignment({
          classroomId,
          title: assignmentTitle,
          instructions: baseInstructions,
          dueDate,
          points,
          assignmentType: "assignment",
          resourceItems,
          resourceId: selectedResource.id,
          resourceTitle: selectedResource.title,
          resourceUrl: selectedResourceUrl,
          projectUrl: selectedResource.projectUrl || selectedResource.previewUrl || "",
          previewUrl: selectedResource.previewUrl || "",
          fileUrl: selectedResource.fileUrl || "",
          status: "published"
        });
      }));

      this.showNotice(
        "resource-assignment-notice",
        selectedResources.length === 1 ? "Assignment created." : `${selectedResources.length} assignments created.`,
        "success"
      );
      delete form.dataset.resourceIds;
      form.reset();
    });
  }

  static openResourceAssignment(resource, classrooms = []) {
    const panel = document.getElementById("resource-assign-panel");
    const form = document.getElementById("resource-assignment-form");
    if (!panel || !form) return;

    const resources = Array.isArray(resource) ? resource : [resource];
    const primaryResource = resources[0];
    if (!primaryResource) return;

    panel.hidden = false;
    const isBulk = resources.length > 1;
    this.setText("assign-resource-name", isBulk ? `${resources.length} saved materials selected` : primaryResource.title);

    const classroomSelect = form.querySelector('select[name="classroomId"]');
    if (classroomSelect) {
      classroomSelect.innerHTML = classrooms.length
        ? classrooms.map((classroom) => `<option value="${this.escape(classroom.id)}">${this.escape(classroom.name)}</option>`).join("")
        : '<option value="" disabled selected>No classrooms available</option>';
    }

    const resourceIds = resources.map((item) => item.id);
    form.elements.resourceId.value = resourceIds[0];
    form.dataset.resourceIds = resourceIds.join(",");
    form.elements.title.value = isBulk ? "Saved Materials Assignment" : primaryResource.title;
    form.elements.instructions.value = isBulk
      ? resources.map((item, index) => `${index + 1}. ${item.title}`).join("\n")
      : primaryResource.description || "";
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  static createSpreeFromResources(resources = [], classroomId = "") {
    return {
      status: "placeholder",
      classroomId,
      resources,
      trackingFields: ["started", "completionStatus", "score", "progressPercentage", "deadline", "timeSpent", "engagementStatus"],
      message: "Learning spree creation is prepared for a future backend connection."
    };
  }

  static assignSpreeToClassroom(spree = {}, classroomId = "") {
    return {
      status: "placeholder",
      classroomId,
      spree,
      message: "Spree assignment will connect when backend tables are available."
    };
  }

  static trackSpreeProgress(spreeId = "", classroomId = "") {
    return {
      status: "placeholder",
      classroomId,
      spreeId,
      started: false,
      completionStatus: "not_started",
      score: null,
      progressPercentage: 0,
      deadline: null,
      timeSpent: 0,
      engagementStatus: "pending"
    };
  }

  static getCurrentClassroomId(classroomId) {
    if (classroomId) return classroomId;

    const params = new URLSearchParams(window.location.search);
    const queryClassroomId = params.get("classroomId") || params.get("id");
    if (queryClassroomId) return queryClassroomId;

    const hashQuery = window.location.hash.includes("?") ? window.location.hash.split("?")[1] : "";
    const hashParams = new URLSearchParams(hashQuery);
    const hashClassroomId = hashParams.get("classroomId") || hashParams.get("id");
    if (hashClassroomId) return hashClassroomId;

    const hashMatch = window.location.hash.match(/#classroom\/detail\/([^/?#]+)/);
    return hashMatch ? decodeURIComponent(hashMatch[1]) : "";
  }

  static getLiveQuizBaseUrl() {
    return String(
      window.EDTECHRA_LIVE_QUIZ_URL ||
      window.__DIGITAL_CLASSROOM_ENV__?.LIVE_QUIZ_URL ||
      window.EDTECHRA_DC_ENV?.LIVE_QUIZ_URL ||
      "https://joyal520.github.io/live_quiz/index.html"
    ).trim();
  }

  static getLiveQuizSyncEndpoint() {
    const configured = String(
      window.EDTECHRA_SCORE_SYNC_ENDPOINT ||
      window.__DIGITAL_CLASSROOM_ENV__?.LIVE_QUIZ_SCORE_SYNC_ENDPOINT ||
      window.EDTECHRA_DC_ENV?.LIVE_QUIZ_SCORE_SYNC_ENDPOINT ||
      ""
    ).trim();
    if (configured) return configured;
    if (/^https?:\/\//i.test(window.location.origin || "")) {
      return `${window.location.origin}/api/live-quiz-score-sync`;
    }
    return "";
  }

  static normalizeLiveQuizLaunchContext(classOrContext = {}) {
    if (typeof classOrContext === "string") {
      return { classroomId: this.getCurrentClassroomId(classOrContext) };
    }
    const classroomId = classOrContext.classroomId || classOrContext.classId || classOrContext.id || "";
    const teacherId = classOrContext.teacherId || classOrContext.teacher_id || "";
    const role = classOrContext.role || classOrContext.userRole || (classOrContext.studentId || classOrContext.student_id ? "student" : "teacher");
    const profileId = classOrContext.profileId || classOrContext.profile_id || "";
    const studentId = classOrContext.studentId || classOrContext.student_id || (role === "student" ? profileId : "");
    const userId = classOrContext.userId || classOrContext.user_id || profileId || studentId || teacherId || "";
    return {
      classroomId: this.getCurrentClassroomId(classroomId),
      teacherId,
      studentId,
      profileId,
      userId,
      role,
      quizId: classOrContext.quizId || classOrContext.quiz_id || "",
      returnUrl: classOrContext.returnUrl || window.location.href,
      syncEndpoint: classOrContext.syncEndpoint || this.getLiveQuizSyncEndpoint()
    };
  }

  static getLiveQuizUrl(classOrContext) {
    const context = this.normalizeLiveQuizLaunchContext(classOrContext);
    const url = new URL(this.getLiveQuizBaseUrl(), window.location.href);
    url.searchParams.set("source", "edtechra");
    url.searchParams.set("legacySource", "edectra");
    url.searchParams.set("classId", context.classroomId || "");
    url.searchParams.set("classroom_id", context.classroomId || "");
    url.searchParams.set("role", context.role || "");
    if (context.userId) url.searchParams.set("userId", context.userId);
    if (context.teacherId) url.searchParams.set("teacher_id", context.teacherId);
    if (context.studentId) url.searchParams.set("student_id", context.studentId);
    if (context.profileId) url.searchParams.set("profile_id", context.profileId);
    if (context.quizId) url.searchParams.set("quiz_id", context.quizId);
    if (context.returnUrl) url.searchParams.set("return_url", context.returnUrl);
    if (context.syncEndpoint) url.searchParams.set("syncEndpoint", context.syncEndpoint);
    return url.href;
  }

  static renderLiveQuizLauncherModal(externalUrl) {
    const safeUrl = this.escape(externalUrl);
    return `
      <div class="live-quiz-modal-backdrop" data-live-quiz-modal>
        <section class="live-quiz-modal" role="dialog" aria-modal="true" aria-labelledby="live-quiz-modal-title">
          <header class="live-quiz-modal-header">
            <div>
              <p>Edtechra Classroom</p>
              <h2 id="live-quiz-modal-title">Live Quiz</h2>
            </div>
            <button class="live-quiz-modal-close" type="button" aria-label="Close Live Quiz" data-live-quiz-close>&times;</button>
          </header>
          <div class="live-quiz-launcher" data-live-quiz-launcher>
            <button class="live-quiz-option live-quiz-option-primary" type="button" data-live-quiz-instant>
              <span class="live-quiz-option-icon">${this.getIcon("play")}</span>
              <span>
                <strong>Instant Quiz</strong>
                <small>Start the current live quiz flow inside Edtechra.</small>
              </span>
            </button>
            <button class="live-quiz-option live-quiz-option-disabled" type="button" disabled aria-disabled="true">
              <span class="live-quiz-option-icon">${this.getIcon("calendar")}</span>
              <span>
                <strong>Scheduled Quiz</strong>
                <small>Schedule quizzes with student countdown will be added soon.</small>
              </span>
              <em>Coming Soon</em>
            </button>
          </div>
          <div class="live-quiz-frame-shell" data-live-quiz-frame-shell hidden>
            <div class="live-quiz-frame-toolbar">
              <div>
                <span class="live-quiz-frame-eyebrow">Edtechra Classroom</span>
                <strong>Instant Live Quiz</strong>
              </div>
              <div class="live-quiz-frame-actions">
                <a class="live-quiz-fallback-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">Open in new tab</a>
                <button class="live-quiz-frame-close" type="button" data-live-quiz-close>Close</button>
              </div>
            </div>
            <iframe
              class="live-quiz-frame"
              title="Live Quiz"
              data-live-quiz-frame
              referrerpolicy="no-referrer"
              allow="fullscreen; clipboard-read; clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            ></iframe>
          </div>
          <footer class="live-quiz-modal-footer">
            <a class="live-quiz-fallback-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">Open in new tab</a>
          </footer>
        </section>
      </div>
    `;
  }

  static openLiveQuizLauncherModal(externalUrl) {
    document.querySelector("[data-live-quiz-modal]")?.remove();
    document.body.insertAdjacentHTML("beforeend", this.renderLiveQuizLauncherModal(externalUrl));

    const modal = document.querySelector("[data-live-quiz-modal]");
    const launcher = modal?.querySelector("[data-live-quiz-launcher]");
    const frameShell = modal?.querySelector("[data-live-quiz-frame-shell]");
    const frame = modal?.querySelector("[data-live-quiz-frame]");
    const closeModal = () => {
      document.removeEventListener("keydown", onKeydown);
      modal?.remove();
    };
    const onKeydown = (event) => {
      if (event.key === "Escape") closeModal();
    };

    modal?.querySelectorAll("[data-live-quiz-close]").forEach((closeButton) => {
      closeButton.addEventListener("click", closeModal);
    });
    modal?.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    modal?.querySelector("[data-live-quiz-instant]")?.addEventListener("click", () => {
      if (!frame || !frameShell || !launcher) return;
      if (frame.sandbox && !frame.sandbox.contains("allow-same-origin")) {
        console.warn("[Digital Classroom] Live Quiz iframe sandbox blocks storage; opening in a new tab instead.");
        window.open(externalUrl, "_blank", "noopener,noreferrer");
        return;
      }
      frame.src = externalUrl;
      launcher.hidden = true;
      frameShell.hidden = false;
      modal.querySelector(".live-quiz-modal")?.classList.add("is-frame-open");
    });
    document.addEventListener("keydown", onKeydown);
    modal?.querySelector("[data-live-quiz-instant]")?.focus({ preventScroll: true });
  }

  static bindLiveQuizLaunch(classOrContext) {
    const liveQuizCards = document.querySelectorAll('[data-future-route="live-quiz"]');
    if (!liveQuizCards.length) return;

    const launchContext = this.normalizeLiveQuizLaunchContext(classOrContext);
    const classId = launchContext.classroomId;
    const initialExternalUrl = this.getLiveQuizUrl(launchContext);
    console.log("final externalUrl", initialExternalUrl);

    liveQuizCards.forEach((liveQuizCard) => {
      liveQuizCard.href = initialExternalUrl;
      liveQuizCard.dataset.liveQuizUrl = initialExternalUrl;
      const isTeacherLaunchCard = liveQuizCard.matches(".teacher-action-card");
      if (!isTeacherLaunchCard) {
        liveQuizCard.target = "_blank";
        liveQuizCard.rel = "noopener noreferrer";
        return;
      }

      if (liveQuizCard.dataset.liveQuizBound === "true") return;
      liveQuizCard.dataset.liveQuizBound = "true";
      liveQuizCard.removeAttribute("target");
      liveQuizCard.removeAttribute("rel");
      liveQuizCard.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const externalUrl = liveQuizCard.dataset.liveQuizUrl || this.getLiveQuizUrl(launchContext);

        console.log("Live Quiz card clicked");
        console.log("detected classId", classId);
        console.log("final externalUrl", externalUrl);

        if (!externalUrl.startsWith("https://") || externalUrl.startsWith("#/")) {
          console.error("[Digital Classroom] blocked invalid LiveQuiz URL", externalUrl);
          return;
        }

        this.openLiveQuizLauncherModal(externalUrl);
      });
    });
  }

  static async refreshClassroomSections(classroomId) {
    const [students, assignments, metrics, contentItems, bucketItems, feedback] = await Promise.all([
      ClassroomAPI.getStudentsByClassroom(classroomId),
      ClassroomAPI.getAssignmentsByClassroom(classroomId),
      ClassroomAPI.getClassroomMetrics(classroomId),
      ClassroomAPI.getContentItems(),
      ClassroomAPI.getClassroomContent(classroomId),
      ClassroomAPI.getLatestAiFeedback(classroomId)
    ]);

    this.renderLeaderboard("leaderboard-container", students);
    this.setText("detail-students", metrics.studentCount);
    this.setText("detail-assignments", metrics.assignmentCount);
    this.setText("detail-completion", `${metrics.completionRate}%`);
    this.setText("detail-pending", Math.max((metrics.studentCount * metrics.assignmentCount) - metrics.submissionCount, 0));
    this.renderStudents("students-container", students);
    await this.renderMessages(classroomId);
    this.renderAssignments("assignments-container", assignments, metrics.studentCount);
    this.renderAssignmentStatus(assignments, metrics);
    this.renderAttendance(students);
    this.renderClassActivity(assignments, students);
    this.renderContentBucket(classroomId, contentItems, bucketItems);
    this.renderAnalytics(metrics);
    this.renderAiFeedback(feedback);

  }

  static startClassroomDetailRefresh(classroomId) {
    this.stopClassroomDetailRefresh();

    if (document.body?.dataset?.page !== "detail" || !classroomId) return;

    this.classroomDetailRefreshBusy = false;
    this.classroomDetailRefreshTimer = window.setInterval(async () => {
      if (document.hidden || this.classroomDetailRefreshBusy) return;

      this.classroomDetailRefreshBusy = true;
      try {
        await this.refreshClassroomSections(classroomId);
      } catch (error) {
        console.warn("[Digital Classroom] Classroom detail refresh failed.", error);
      } finally {
        this.classroomDetailRefreshBusy = false;
      }
    }, 30000);
  }

  static stopClassroomDetailRefresh() {
    if (this.classroomDetailRefreshTimer) {
      window.clearInterval(this.classroomDetailRefreshTimer);
      this.classroomDetailRefreshTimer = null;
    }
  }

  static bindAssignmentForm(classroomId) {
    const form = document.getElementById("assignment-form");
    if (!form || form.dataset.bound === "true") return;

    form.dataset.bound = "true";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const title = String(formData.get("title") || "").trim();
      const dueDate = String(formData.get("dueDate") || "").trim();
      const points = Number(formData.get("points"));

      if (!title || !dueDate || !Number.isFinite(points) || points <= 0) {
        this.showNotice("assignment-notice", "Add a title, due date, and positive points value.", "error");
        return;
      }

      await ClassroomAPI.createAssignment({
        classroomId,
        title,
        instructions: formData.get("instructions") || "",
        dueDate,
        points
      });

      form.reset();
      this.showNotice("assignment-notice", "Assignment created.", "success");
      await this.refreshClassroomSections(classroomId);
    });

    document.getElementById("generate-feedback-btn")?.addEventListener("click", async () => {
      const feedback = await ClassroomAPI.generateAiFeedback(classroomId);
      this.renderAiFeedback(feedback);
    });
  }

  static bindMessagePanel(classroomId) {
    const form = document.getElementById("class-message-form");
    if (!form || form.dataset.bound === "true") return;

    form.dataset.bound = "true";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const message = String(formData.get("message") || "").trim();
      if (!message) {
        this.showNotice("message-notice", "Write a message before sending.", "error");
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      this.showNotice("message-notice", "Sending message...", "success");
      try {
        await ClassroomAPI.createClassroomMessage(classroomId, message);
        form.reset();
        this.showNotice("message-notice", "Message sent to this classroom.", "success");
        await this.renderMessages(classroomId);
      } catch (error) {
        console.error("[Digital Classroom] Could not send classroom message", error);
        this.showNotice("message-notice", error?.message || "Could not send this message.", "error");
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  static bindDangerZone(classroomId, classroomName) {
    const modal = document.getElementById("delete-classroom-modal");
    const input = document.getElementById("delete-confirm-input");
    const confirmButton = document.getElementById("confirm-delete-btn");
    const closeModal = () => {
      if (!modal) return;
      modal.hidden = true;
      if (input) input.value = "";
      if (confirmButton) confirmButton.disabled = true;
      this.showNotice("delete-modal-notice", "", "success");
    };

    document.getElementById("archive-classroom-btn")?.addEventListener("click", () => {
      this.showNotice("danger-notice", "Archive is prepared, but this backend does not expose a classroom archive action yet.", "success");
    });

    document.getElementById("open-delete-modal-btn")?.addEventListener("click", () => {
      if (!modal) return;
      modal.hidden = false;
      input?.focus();
    });

    document.getElementById("cancel-delete-btn")?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    input?.addEventListener("input", () => {
      if (confirmButton) confirmButton.disabled = input.value.trim() !== classroomName;
    });

    confirmButton?.addEventListener("click", () => {
      if (input?.value.trim() !== classroomName) return;
      this.showNotice("delete-modal-notice", "Delete is intentionally blocked here until a safe backend delete endpoint exists.", "error");
      console.info("[Digital Classroom] Delete confirmation collected without deleting classroom", { classroomId });
    });
  }

  static async renderMessages(classroomId) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const assets = this.getTeacherAssets();
    let messages = [];
    try {
      messages = await ClassroomAPI.getClassroomMessages(classroomId);
    } catch (error) {
      console.error("[Digital Classroom] Could not load classroom messages", error);
      container.innerHTML = `
        <div class="illustrated-empty">
          ${this.renderTeacherAssetImage(assets.messagesEmpty, "No classroom messages", "empty-asset-image")}
          <strong>Messages unavailable</strong>
          <span>${this.escape(error?.message || "Check the classroom_messages table and RLS policies.")}</span>
        </div>
      `;
      return;
    }

    container.innerHTML = messages.length
      ? messages.map((message) => `
        <div class="teacher-message-item" data-message-id="${this.escape(message.id)}">
          <span class="message-icon">${this.getIcon("message")}</span>
          <div>
            <strong>${this.escape(message.message)}</strong>
            <small>
              ${this.formatDate(message.createdAt)}
              ${message.editedAt ? " / edited" : ""}
              ${message.isPinned ? " / pinned" : ""}
            </small>
          </div>
          <div class="teacher-message-actions">
            <button class="table-icon-btn" type="button" title="Edit message" aria-label="Edit message" data-edit-message="${this.escape(message.id)}">${this.getIcon("clipboard")}</button>
            <button class="table-icon-btn danger" type="button" title="Delete message" aria-label="Delete message" data-delete-message="${this.escape(message.id)}">${this.getIcon("trash")}</button>
          </div>
        </div>
      `).join("")
      : `
        <div class="illustrated-empty">
          ${this.renderTeacherAssetImage(assets.messagesEmpty, "No classroom messages", "empty-asset-image")}
          <strong>No messages yet</strong>
          <span>Class announcements will appear here after you send a message.</span>
        </div>
      `;

    container.querySelectorAll("[data-edit-message]").forEach((button) => {
      button.addEventListener("click", async () => {
        const message = messages.find((item) => String(item.id) === String(button.dataset.editMessage));
        if (!message) return;
        const updatedText = window.prompt("Edit classroom message", message.message);
        if (updatedText === null) return;
        const trimmed = updatedText.trim();
        if (!trimmed) {
          this.showToast("Message cannot be empty.", "error");
          return;
        }

        button.disabled = true;
        try {
          await ClassroomAPI.updateClassroomMessage(message.id, trimmed);
          this.showToast("Message updated.", "success");
          await this.renderMessages(classroomId);
        } catch (error) {
          console.error("[Digital Classroom] Could not update classroom message", error);
          this.showToast(error?.message || "Could not update this message.", "error");
        } finally {
          button.disabled = false;
        }
      });
    });

    container.querySelectorAll("[data-delete-message]").forEach((button) => {
      button.addEventListener("click", async () => {
        const confirmed = window.confirm("Are you sure you want to delete this message?");
        if (!confirmed) return;
        button.disabled = true;
        try {
          await ClassroomAPI.deleteClassroomMessage(button.dataset.deleteMessage);
          button.closest(".teacher-message-item")?.remove();
          this.showToast("Message deleted.", "success");
          await this.renderMessages(classroomId);
        } catch (error) {
          console.error("[Digital Classroom] Could not delete classroom message", error);
          this.showToast(error?.message || "Could not delete this message.", "error");
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  static renderStudents(containerId, students) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const assignmentsCount = Number(document.getElementById("detail-assignments")?.textContent || 0);
    const formatSkillScore = (value, max) => {
      const score = Math.min(100, Math.max(0, Number(value || 0)));
      const scorePercent = max ? Math.min(100, Math.max(0, (score / max) * 100)) : score;
      if (!Number.isFinite(scorePercent)) return "0";
      return Number.isInteger(scorePercent) ? String(scorePercent) : scorePercent.toFixed(1);
    };
    const formatClassSkillScore = (value, max) => {
      // Deep Ocean class skill display uses fixed activity totals:
      // Reading max = 50 from Days 1-5, Listening max = 30 from Day 6,
      // Vocabulary max = 20 from Day 7. Clamp display percentages to 0-100.
      const score = Number(value || 0);
      if (!Number.isFinite(score)) return "0";
      return formatSkillScore(score, max);
    };
    const renderSkillBreakdown = (student) => {
      const breakdown = student.classroomSkillBreakdown;
      if (!breakdown) {
        return `<div class="student-skill-breakdown" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;font-size:.72rem;color:var(--text-muted);">No skill data yet</div>`;
      }

      const chips = [
        ["Reading", breakdown.reading_score, 50],
        ["Listening", breakdown.listening_score, 30],
        ["Vocabulary", breakdown.vocabulary_score, 20]
      ];

      return `
        <div class="student-skill-breakdown" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
          <span style="display:inline-flex;align-items:center;color:var(--text-muted);font-size:.72rem;font-weight:800;white-space:nowrap;">Class skills</span>
          ${chips.map(([label, value, max]) => `
            <span style="display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;background:rgba(226,232,244,.78);color:var(--text-muted);font-size:.72rem;font-weight:700;white-space:nowrap;">
              ${this.escape(label)}: ${this.escape(formatClassSkillScore(value, max))}%
            </span>
          `).join("")}
        </div>
      `;
    };
    const renderRows = (rows) => {
      container.innerHTML = rows.length
        ? rows.map((student) => {
          const displayName = this.getStudentDisplayName(student);
          const progress = assignmentsCount ? Math.min(100, Math.round(((student.completedAssignments || 0) / assignmentsCount) * 100)) : 0;
          const status = progress > 0 ? "Online" : "Not marked";
          return `
            <tr data-student-id="${this.escape(student.profileId || student.memberId || student.id || "")}">
              <td>
                <div class="student-info">
                  ${this.renderStudentAvatar(student)}
                  <div>
                    <h4>${this.escape(displayName)}</h4>
                  </div>
                </div>
              </td>
              <td><span class="student-status ${progress > 0 ? "online" : "idle"}">${status}</span></td>
              <td>
                <div class="table-progress" aria-label="${progress}% complete"><span><i style="width: ${progress}%"></i></span><strong>${progress}%</strong></div>
                ${renderSkillBreakdown(student)}
              </td>
              <td>${Number(student.points || 0)}</td>
              <td>
                <div class="student-actions">
                  <button class="table-icon-btn" type="button" title="View progress" data-view-student="${this.escape(student.id)}">${this.getIcon("bars")}</button>
                  <button class="table-icon-btn danger" type="button" title="Remove student" data-remove-student="${this.escape(student.id)}">${this.getIcon("trash")}</button>
                </div>
              </td>
            </tr>
          `;
        }).join("")
        : `<tr><td colspan="5">${this.emptyState("No students yet", "Share the invite link to let students join this classroom.")}</td></tr>`;
    };

    const search = document.getElementById("student-search-input");
    const initialQuery = search?.value?.trim().toLowerCase() || "";
    renderRows(initialQuery
      ? students.filter((student) => this.getStudentDisplayName(student).toLowerCase().includes(initialQuery))
      : students);
    if (search && search.dataset.bound !== "true") {
      search.dataset.bound = "true";
      search.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        renderRows(students.filter((student) => this.getStudentDisplayName(student).toLowerCase().includes(query)));
      });
    }

    container.querySelectorAll("[data-view-student]").forEach((button) => {
      button.addEventListener("click", () => this.showToast("Student progress details will open when the progress route is connected.", "success"));
    });

    container.querySelectorAll("[data-remove-student]").forEach((button) => {
      button.addEventListener("click", async () => {
        const confirmed = window.confirm("Remove this student from the classroom? Their profile will not be deleted.");
        if (!confirmed) return;
        await ClassroomAPI.removeStudentFromClassroom?.(button.closest("main")?.dataset.classroomId || this.getCurrentClassroomId(), button.dataset.removeStudent);
        await this.refreshClassroomSections(this.getCurrentClassroomId());
      });
    });
  }

  static renderAssignments(containerId, assignments, studentCount = 0) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = ClassroomState.getData();
    const assets = this.getTeacherAssets();
    const visibleAssignments = [...assignments].filter((assignment) => (
      assignment?.isDeleted !== true &&
      !assignment?.deletedAt &&
      !["deleted", "archived"].includes(String(assignment?.status || "").toLowerCase())
    ));
    const recentAssignments = visibleAssignments
      .sort((a, b) => new Date(b.createdAt || b.assignedAt || b.dueDate || 0) - new Date(a.createdAt || a.assignedAt || a.dueDate || 0))
      .slice(0, 3);
    container.innerHTML = recentAssignments.length
      ? recentAssignments.map((assignment) => {
        const completionCount = data.submissions.filter((submission) => submission.assignmentId === assignment.id).length;
        const completionPercent = studentCount ? Math.round((completionCount / studentCount) * 100) : 0;
        const isSpree = assignment.assignmentType === "learning_spree";
        const itemCount = assignment.resourceItems?.length || 0;
        const unlockLabel = assignment.unlockMode === "one_lesson_per_day" ? "One Lesson Per Day" : "Open Access";
        const assignedDate = assignment.assignedAt || assignment.createdAt || "";
        const statusLabel = assignment.status || "published";
        return `
          <div class="assignment-row list-item assignment-detail-row ${isSpree ? "learning-spree-row" : ""}"
            data-assignment-id="${this.escape(assignment.id)}"
            data-source-type="${this.escape(assignment.sourceType || "assignment")}"
            data-source-table="${this.escape(assignment.sourceTable || "assignments")}"
            data-classroom-id="${this.escape(assignment.classroomId || "")}">
            <div class="list-item-content">
              <div class="assignment-row-title">
                <h4>${this.escape(assignment.title)}${isSpree ? ' <span class="resource-visibility-badge is-public">Learning Spree</span>' : ""}</h4>
                <span class="assignment-status-pill">${this.escape(statusLabel)}</span>
              </div>
              <div class="assignment-meta-grid">
                <span>Assigned ${this.formatDate(assignedDate)}</span>
                <span>Due ${this.formatDate(assignment.dueDate)}</span>
                <span>${studentCount || 0} assigned student${Number(studentCount) === 1 ? "" : "s"}</span>
                <span>${isSpree ? `${itemCount} materials` : `${assignment.points} pts`}</span>
              </div>
              ${isSpree ? `<p class="spree-row-summary">${this.escape(assignment.instructions || "Structured learning path")} / Unlock Mode: ${unlockLabel}</p>` : ""}
              <div class="mini-progress" aria-label="${completionPercent}% submitted"><span style="width: ${completionPercent}%"></span></div>
            </div>
            <div class="right-stat">
              <strong>${completionCount}/${studentCount || 0}</strong>
              <span>Submitted</span>
            </div>
            <button class="table-icon-btn assignment-delete-btn" type="button" title="Delete assignment" aria-label="Delete ${this.escape(assignment.title)}" data-delete-assignment="${this.escape(assignment.id)}">
              ${this.getIcon("trash")}
            </button>
          </div>
        `;
      }).join("")
      : `
        <div class="illustrated-empty">
          ${this.renderTeacherAssetImage(assets.tasksEmpty, "No assignments yet", "empty-asset-image")}
          <strong>No assignments yet</strong>
          <span>Create a task, exam, or competition activity to send work to joined students.</span>
        </div>
      `;

    container.querySelectorAll("[data-delete-assignment]").forEach((button) => {
      button.addEventListener("click", async () => {
        const assignmentId = button.dataset.deleteAssignment;
        if (!assignmentId) {
          this.showToast("Invalid assignment. Please refresh and try again.", "error");
          return;
        }

        const confirmed = window.confirm("Are you sure you want to delete this assignment? Student submissions will be kept safely, but the assignment will be hidden from active classroom views.");
        if (!confirmed) return;

        button.disabled = true;
        button.classList.add("is-loading");
        try {
          const classroomId = button.closest("main")?.dataset.classroomId || this.getCurrentClassroomId();
          const result = await ClassroomAPI.deleteAssignment(classroomId, assignmentId);
          if (!result?.success) {
            throw new Error("Assignment delete was not confirmed.");
          }
          button.closest(".assignment-row")?.remove();
          this.showToast("Assignment deleted successfully.", "success");
          await this.refreshClassroomSections(classroomId);
        } catch (error) {
          console.error("[Digital Classroom] Assignment delete failed", error);
          const message = /permission|RLS|row-level security/i.test(error?.message || "")
            ? "You do not have permission to delete this assignment."
            : error?.message || "Could not delete assignment. Please try again.";
          this.showToast(message, "error");
        } finally {
          button.disabled = false;
          button.classList.remove("is-loading");
        }
      });
    });
  }

  static renderLeaderboard(containerId, students) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = students.length
      ? `
        <div class="leaderboard-head"><span>Rank</span><span>Student</span><span>Points</span></div>
        ${students.map((student, index) => {
          const displayName = this.getStudentDisplayName(student);
          return `
          <div class="leaderboard-entry">
            <span class="rank rank-${index + 1}">${index + 1}</span>
            <strong>${this.escape(displayName)}</strong>
            <span>${Number(student.points || 0)} ${this.getIcon("star")}</span>
          </div>
        `;
        }).join("")}
      `
      : this.emptyState("No leaderboard yet", "Student points will appear after submissions.");
  }

  static renderContentBucket(classroomId, contentItems, bucketItems) {
    const bucketContainer = document.getElementById("bucket-items");
    const libraryContainer = document.getElementById("content-library");
    if (!bucketContainer || !libraryContainer) return;

    const bucketIds = new Set(bucketItems.map((item) => item.id));
    bucketContainer.innerHTML = bucketItems.length
      ? bucketItems.map((item) => this.contentItemTemplate(item, "Remove", "remove", classroomId)).join("")
      : this.emptyState("Bucket is empty", "Add Edtechra content from the library below.");

    libraryContainer.innerHTML = contentItems.map((item) => {
      const added = bucketIds.has(item.id);
      return this.contentItemTemplate(item, added ? "Added" : "Add to bucket", added ? "added" : "add", classroomId);
    }).join("");

    document.querySelectorAll("[data-content-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.contentAction;
        const contentId = button.dataset.contentId;

        if (action === "add") {
          await ClassroomAPI.addContentToClassroom(classroomId, contentId);
        }

        if (action === "remove") {
          await ClassroomAPI.removeContentFromClassroom(classroomId, contentId);
        }

        await this.refreshClassroomSections(classroomId);
      });
    });
  }

  static contentItemTemplate(item, label, action, classroomId) {
    return `
      <div class="list-item">
        <div>
          <h4>${this.escape(item.title)}</h4>
          <span>${this.escape(item.type)} / ${this.escape(item.subject)} / ${this.escape(item.level)} / ${item.minutes} min</span>
        </div>
        <button class="btn btn-small ${action === "added" ? "btn-muted" : "btn-secondary"}"
          data-content-action="${action}"
          data-content-id="${this.escape(item.id)}"
          data-classroom-id="${this.escape(classroomId)}"
          ${action === "added" ? "disabled" : ""}>${label}</button>
      </div>
    `;
  }

  static renderAnalytics(metrics) {
    const container = document.getElementById("analytics-container");
    if (!container) return;

    container.innerHTML = `
      <div class="performance-stat-grid">
        <div><span>Average Score</span><strong>${metrics.classAverage || 0}</strong></div>
        <div><span>Quizzes Completed</span><strong>${metrics.submissionCount || 0}</strong></div>
        <div><span>Assignments Done</span><strong>${metrics.completionRate || 0}%</strong></div>
        <div><span>Participation</span><strong>${metrics.activeStudents || 0}/${metrics.studentCount || 0}</strong></div>
      </div>
    `;
  }

  static renderAssignmentStatus(assignments, metrics) {
    const container = document.getElementById("assignment-status-container");
    if (!container) return;

    const completed = metrics.submissionCount;
    const totalSlots = Math.max(metrics.studentCount * metrics.assignmentCount, 1);
    const notCompleted = Math.max(totalSlots - completed, 0);
    const overdue = assignments.filter((assignment) => new Date(assignment.dueDate) < new Date()).length;
    const inProgress = Math.max(Math.round(notCompleted * 0.58), 0);
    const notStarted = Math.max(notCompleted - inProgress, 0);
    const segments = [
      ["Completed", completed, "#42d487"],
      ["In Progress", inProgress, "#4f8cff"],
      ["Pending", notStarted, "#f4b74d"],
      ["Overdue", overdue, "#ef5b72"]
    ];
    const total = Math.max(segments.reduce((sum, [, value]) => sum + value, 0), 1);
    let cursor = 0;
    const gradient = segments.map(([, value, color]) => {
      const start = cursor;
      cursor += (value / total) * 100;
      return `${color} ${start}% ${cursor}%`;
    }).join(", ");

    container.innerHTML = `
      <div class="status-chart-wrap">
        <div class="donut-chart" style="background: conic-gradient(${gradient});">
          <div>
            <span>Total</span>
            <strong>${totalSlots}</strong>
            <span>Tasks</span>
          </div>
        </div>
        <div class="status-legend">
          ${segments.map(([label, value, color]) => `
            <div>
              <span><i style="background: ${color}"></i>${label}</span>
              <strong>${Math.round((value / total) * 100)}%</strong>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  static renderAttendance(students) {
    const container = document.getElementById("attendance-container");
    if (!container) return;

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const visibleStudents = students.slice(0, 5);
    const statusCycle = ["present", "present", "not-marked", "absent", "present", "not-marked"];
    const statusLabel = {
      present: "✓ Present",
      absent: "✕ Absent",
      "not-marked": "– Not marked"
    };
    container.innerHTML = visibleStudents.length
      ? `
        <div class="attendance-table">
          <div class="attendance-row attendance-head">
            <span>Student</span>
            ${days.map((day) => `<span>${day}</span>`).join("")}
          </div>
          ${visibleStudents.map((student, studentIndex) => `
            <div class="attendance-row">
              <strong>${this.escape(this.getStudentDisplayName(student))}</strong>
              ${days.map((day, dayIndex) => {
                const status = statusCycle[(studentIndex + dayIndex) % statusCycle.length];
                return `<span class="attendance-mark ${status}" title="${day} ${statusLabel[status]}">${statusLabel[status].split(" ")[0]}</span>`;
              }).join("")}
            </div>
          `).join("")}
        </div>
        <div class="attendance-legend">
          <span><i class="attendance-mark present">✓</i>Present</span>
          <span><i class="attendance-mark absent">✕</i>Absent</span>
          <span><i class="attendance-mark not-marked">–</i>Not Marked</span>
        </div>
      `
      : this.emptyState("No attendance yet", "Students will appear after they join this classroom.");
  }

  static renderClassActivity(assignments, students) {
    const container = document.getElementById("class-activity-container");
    if (!container) return;

    const data = ClassroomState.getData();
    const submissionItems = data.submissions
      .filter((submission) => assignments.some((assignment) => assignment.id === submission.assignmentId))
      .slice(0, 3)
      .map((submission) => {
        const student = students.find((item) => item.id === submission.studentId);
        const assignment = assignments.find((item) => item.id === submission.assignmentId);
        return {
          type: "submission",
          title: `${student ? this.getStudentDisplayName(student) : "A student"} submitted ${assignment?.title || "an assignment"}.`,
          meta: this.formatDate(submission.submittedAt)
        };
      });
    const assignmentItems = assignments.slice(0, 3).map((assignment) => ({
      type: "assignment",
      title: `New assignment "${assignment.title}" created.`,
      meta: `Due ${this.formatDate(assignment.dueDate)}`
    }));
    const activityItems = [...submissionItems, ...assignmentItems].slice(0, 5);

    container.innerHTML = activityItems.length
      ? activityItems.map((item) => `
        <div class="activity-feed-item list-item">
          <span class="feed-icon ${item.type}">${item.type === "submission" ? "S" : "A"}</span>
          <div class="list-item-content">
            <h4>${this.escape(item.title)}</h4>
            <span>${this.escape(item.meta)}</span>
          </div>
        </div>
      `).join("")
      : this.emptyState("No class activity yet", "Assignments, quiz events, and submissions will appear here.");
  }

  static formatDate(value) {
    if (!value) return "No date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return this.escape(value);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  static renderAiFeedback(feedback) {
    const container = document.getElementById("ai-feedback-output");
    if (!container) return;

    if (!feedback) {
      container.innerHTML = `
        <ul class="ai-insight-list">
          <li>Generate a classroom report after students begin submitting work.</li>
          <li>This uses the existing mock/report log flow only.</li>
          <li>No paid AI call is made from this page.</li>
        </ul>
      `;
      return;
    }

    container.innerHTML = `
      <div class="ai-feedback-box">
        <p>${this.escape(feedback.summary)}</p>
        <ul class="ai-insight-list">
          ${feedback.recommendations.map((item) => `<li>${this.escape(item)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  static renderJoinLoading(panel) {
    panel.innerHTML = `
      <div class="join-card-layout">
        <div class="join-card-copy">
          <p class="eyebrow">Classroom Invitation</p>
          <div class="join-skeleton join-skeleton-title"></div>
          <div class="join-skeleton join-skeleton-line"></div>
          <div class="join-skeleton join-skeleton-line short"></div>
          <div class="join-classroom-meta">
            <div class="join-skeleton join-skeleton-row"></div>
            <div class="join-skeleton join-skeleton-row"></div>
            <div class="join-skeleton join-skeleton-row"></div>
          </div>
        </div>
        <div class="join-card-art" aria-hidden="true">${this.renderJoinIllustration()}</div>
      </div>
    `;
  }

  static renderJoinIllustration() {
    return `
      <svg class="join-illustration" viewBox="0 0 360 280" role="img" aria-label="Digital classroom illustration">
        <defs>
          <linearGradient id="joinBlob" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#eef4ff"/>
            <stop offset="1" stop-color="#f4ecff"/>
          </linearGradient>
          <linearGradient id="joinBoard" x1="0" x2="1">
            <stop offset="0" stop-color="#70d6b5"/>
            <stop offset="1" stop-color="#7fb8ff"/>
          </linearGradient>
        </defs>
        <path d="M42 204c-25-39-20-104 19-139 40-37 101-23 141-10 45 14 98-11 124 25 28 38 4 102-35 136-40 35-90 42-145 38-49-4-82-14-104-50Z" fill="url(#joinBlob)"/>
        <rect x="134" y="58" width="124" height="78" rx="14" fill="url(#joinBoard)" stroke="#8e99d8" stroke-width="5"/>
        <path d="M157 84c19-14 40-14 58 0M157 109h78" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".78"/>
        <rect x="154" y="151" width="78" height="18" rx="8" fill="#e7ecff"/>
        <rect x="174" y="134" width="42" height="33" rx="8" fill="#a997ff"/>
        <rect x="74" y="156" width="74" height="46" rx="12" fill="#ffdca8"/>
        <rect x="90" y="139" width="42" height="29" rx="12" fill="#9078ff"/>
        <path d="M85 200v35M139 200v35" stroke="#d5aa78" stroke-width="8" stroke-linecap="round"/>
        <rect x="230" y="156" width="74" height="46" rx="12" fill="#ffdca8"/>
        <rect x="246" y="139" width="42" height="29" rx="12" fill="#a997ff"/>
        <path d="M241 200v35M295 200v35" stroke="#d5aa78" stroke-width="8" stroke-linecap="round"/>
        <path d="M75 133c-16-14-21-40-10-59 22 7 30 31 20 52 18-12 40-8 52 10-14 18-40 20-56 5Z" fill="#94d78f" opacity=".8"/>
        <path d="M79 139v50" stroke="#d2b58c" stroke-width="9" stroke-linecap="round"/>
        <rect x="34" y="189" width="58" height="14" rx="7" fill="#9cc9ff"/>
        <rect x="40" y="174" width="58" height="14" rx="7" fill="#ffd17d"/>
        <path d="M279 75h31M279 93h23M279 111h29" stroke="#cbd7ef" stroke-width="6" stroke-linecap="round"/>
        <circle cx="296" cy="50" r="18" fill="#fff" stroke="#dbe4f7" stroke-width="5"/>
        <path d="M296 39v11l8 6" stroke="#b9c4da" stroke-width="4" stroke-linecap="round"/>
      </svg>
    `;
  }

  static async renderJoinClassroom(inviteCodeOrId) {
    const panel = document.getElementById("join-classroom-panel");
    const meta = document.getElementById("join-classroom-meta");
    const joinButton = document.getElementById("join-classroom-btn");
    if (!panel || !meta) return;

    this.renderJoinLoading(panel);
    const invite = await ClassroomAPI.getClassroomInvite(inviteCodeOrId).catch(() => null);
    if (!invite?.classroom) {
      panel.innerHTML = `
        <p class="eyebrow">Classroom Invitation</p>
        ${this.renderJoinIllustration()}
        ${this.emptyState("Invalid invitation", "This invite code is not active. Ask your teacher for a fresh classroom invitation link.")}
        <a class="btn btn-secondary" href="#home">Back Home</a>
      `;
      return;
    }

    const { classroom, alreadyJoined, studentProfile } = invite;
    if (["teacher", "admin"].includes(studentProfile?.role)) {
      panel.innerHTML = `
        <p class="eyebrow">Classroom Invitation</p>
        ${this.emptyState("Student account required", "Teacher and admin accounts should use the teacher Classes workspace, not the student join flow.")}
        <a class="btn btn-secondary" href="${studentProfile.role === "teacher" ? "#classroom" : "#home"}">Back</a>
      `;
      return;
    }

    panel.innerHTML = `
      <div class="join-card-layout">
        <div class="join-card-copy">
          <p class="eyebrow">Classroom Invitation</p>
          <h1>Join Classroom?</h1>
          <p class="subtitle" id="join-classroom-summary">${this.escape(classroom.name)} is ready to add to your Edtechra student account.</p>
          <div class="join-classroom-meta" id="join-classroom-meta"></div>
          <div class="form-actions">
            <button class="btn btn-primary" type="button" id="join-classroom-btn">${alreadyJoined ? "Open Classroom" : "Join Classroom"}</button>
            <a class="btn btn-secondary" href="#home">Cancel</a>
          </div>
          <p id="join-classroom-notice" class="notice" aria-live="polite"></p>
        </div>
        <div class="join-card-art" aria-hidden="true">${this.renderJoinIllustration()}</div>
      </div>
    `;

    const refreshedMeta = document.getElementById("join-classroom-meta");
    const refreshedJoinButton = document.getElementById("join-classroom-btn");
    this.setText("join-classroom-summary", `${classroom.name} is ready to add to your Edtechra student account.`);
    refreshedMeta.innerHTML = `
      <div class="join-meta-row"><span>Classroom</span><strong>${this.escape(classroom.name)}</strong></div>
      <div class="join-meta-row"><span>Subject / Grade</span><strong>${this.escape(this.getClassroomLabel(classroom))}</strong></div>
      <div class="join-meta-row"><span>Teacher</span><strong>${this.escape(classroom.teacherName || "Teacher")}</strong></div>
      <div class="join-meta-row"><span>Joining as</span><strong>${this.escape(studentProfile?.displayName || "Student")}</strong></div>
    `;

    if (alreadyJoined) {
      this.showNotice("join-classroom-notice", "You are already a member of this classroom.", "success");
      if (refreshedJoinButton) {
        refreshedJoinButton.textContent = "Open Classroom";
        refreshedJoinButton.onclick = async () => {
          await ClassroomAPI.touchStudentClassroomAccess(classroom.id).catch(() => null);
          window.location.hash = `#classroom/student/${encodeURIComponent(classroom.id)}`;
        };
      }
      return;
    }

    if (refreshedJoinButton) {
      refreshedJoinButton.onclick = async () => {
        refreshedJoinButton.disabled = true;
        const displayName = studentProfile?.displayName || "Student";
        let student;
        try {
          student = await ClassroomAPI.joinClassroom(classroom.id, displayName);
        } catch (error) {
          refreshedJoinButton.disabled = false;
          this.showNotice("join-classroom-notice", "We could not join this classroom. Please try again.", "error");
          console.warn("[Digital Classroom] Join failed", error);
          return;
        }
        sessionStorage.setItem(`edtechra_student_${classroom.id}`, student.id);
        this.showNotice(
          "join-classroom-notice",
          student.alreadyEnrolled ? "You are already enrolled in this classroom." : `Welcome to ${classroom.name}.`,
          "success"
        );
        if (student.alreadyEnrolled) {
          this.showToast("You are already enrolled in this classroom.", "success");
        }
        refreshedJoinButton.textContent = "Open Classroom";
        refreshedJoinButton.disabled = false;
        refreshedJoinButton.onclick = async () => {
          await ClassroomAPI.touchStudentClassroomAccess(classroom.id).catch(() => null);
          window.location.hash = `#classroom/student/${encodeURIComponent(classroom.id)}`;
        };
        window.setTimeout(() => {
          window.location.hash = `#classroom/student/${encodeURIComponent(classroom.id)}`;
        }, 800);
      };
    }
  }

  static async renderMyClasses() {
    const container = document.getElementById("my-classes-container");
    if (!container) return;

    const classrooms = await ClassroomAPI.getJoinedClassrooms().catch(() => []);
    container.innerHTML = classrooms.length
      ? `
        <div class="student-class-list">
          ${classrooms.map((classroom) => {
            const taskCount = Number(classroom.taskCount || 0);
            const progress = Math.max(0, Math.min(100, Number(
              classroom.progressPercentage ?? classroom.progress ?? classroom.completionPercentage ?? classroom.overallCompletion ?? 0
            ) || 0));
            const route = this.getRouteHref("student", { classroomId: classroom.id });
            return `
              <article class="student-class-card premium-student-class-card">
                <div class="student-class-thumb">
                  <img src="assets/images/student-classroom-card.webp" alt="" loading="lazy" decoding="async" onerror="this.src='../../assets/images/student-classroom-card.webp'; this.onerror=null;">
                </div>
                <div class="student-class-details">
                  <span class="classroom-banner-badge">${this.escape(this.getClassroomLabel(classroom))}</span>
                  <h3>${this.escape(classroom.name || "Untitled classroom")}</h3>
                  <p class="student-class-teacher">Teacher: <strong>${this.escape(classroom.teacherName || "Teacher")}</strong></p>
                  <div class="student-class-divider" aria-hidden="true"></div>
                  <div class="student-class-meta-row">
                    <span>
                      <span class="meta-icon">${this.getIcon("assignment")}</span>
                      <strong>${taskCount}</strong>
                      <small>${taskCount === 1 ? "Task" : "Tasks"}</small>
                    </span>
                    <span>
                      <span class="meta-icon">${this.getIcon("calendar")}</span>
                      <strong>${this.formatDate(classroom.joinedAt)}</strong>
                      <small>Joined</small>
                    </span>
                    <span class="student-class-progress">
                      <span class="student-progress-ring" style="--progress: ${progress}%"><strong>${progress}%</strong></span>
                      <span>
                        <strong>Progress</strong>
                        <small>Overall completion</small>
                      </span>
                    </span>
                  </div>
                </div>
                <div class="student-class-actions">
                  <span class="soft-pill unread-pill"><i aria-hidden="true"></i>${Number(classroom.unreadCount || 0)} Unread</span>
                  <button class="student-class-menu" type="button" aria-label="Classroom options">${this.getIcon("dots")}</button>
                  <a class="btn btn-primary btn-small student-open-class-btn" href="${route}" data-open-student-class="${this.escape(classroom.id)}">
                    Open Classroom ${this.getIcon("arrow")}
                  </a>
                </div>
              </article>
            `;
          }).join("")}
        </div>
        <div class="student-motivation-strip">
          <span class="student-motivation-icon">${this.getIcon("trophy")}</span>
          <div>
            <strong>Keep going! Every lesson brings you one step closer to your goals.</strong>
            <span>Stay consistent, stay curious, and enjoy the learning journey.</span>
          </div>
          <a class="btn btn-secondary btn-small" href="#dashboard">View Dashboard ${this.getIcon("arrow")}</a>
        </div>
      `
      : `
        <div class="empty-state classroom-empty-state">
          <span class="empty-state-visual" data-dashboard-icon="classroomDefault" aria-hidden="true"></span>
          <strong>No classes joined yet.</strong>
          <span>Open an invitation link from your teacher to join a classroom.</span>
        </div>
      `;
    this.hydrateDashboardIcons(document.querySelector("main") || container);
    container.querySelectorAll("[data-open-student-class]").forEach((link) => {
      link.addEventListener("click", () => {
        ClassroomAPI.touchStudentClassroomAccess(link.dataset.openStudentClass).catch(() => null);
      });
    });
  }

  static async renderStudentDashboard(classroomId) {
    const joinedClassroom = await ClassroomAPI.getJoinedClassroomById(classroomId).catch(() => null);
    const main = document.querySelector("main");

    if (!main) {
      return;
    }

    if (!joinedClassroom) {
      main.innerHTML = `
        <section class="join-classroom-shell">
          <div class="glass-panel join-card">
            ${this.emptyState("You are not a member of this classroom.", "Please use your teacher's invitation link to join this classroom.")}
            <a class="btn btn-secondary" href="#my-classes">Back to My Classes</a>
          </div>
        </section>
      `;
      return;
    }

    const { classroom, membership } = joinedClassroom;
    await ClassroomAPI.touchStudentClassroomAccess(classroom.id).catch(() => null);
    main.innerHTML = this.renderStudentClassroomShell(classroom, membership);
    await this.renderStudentWorkspace(classroomId, membership, classroom);
  }

  static renderStudentAssetImage(src, alt, className = "") {
    return `
      <div class="student-asset-frame ${className}">
        <img src="${this.escape(src)}" alt="${this.escape(alt)}" loading="lazy" decoding="async" onerror="this.closest('.student-asset-frame')?.classList.add('is-missing'); this.remove();">
        <div class="student-asset-fallback" aria-hidden="true">
          <span>Image coming soon</span>
        </div>
      </div>
    `;
  }

  static getAssignmentDisplayMeta(assignment) {
    const type = assignment.assignmentType || "standard";
    let typeLabel = "Assignment";
    let summary = this.cleanAssignmentInstructions(assignment.instructions || "");
    let resourceUrl = this.getAssignmentRawLaunchUrl(assignment) || "";
    if (type === "learning_spree") {
      typeLabel = "Learning Spree";
      summary = summary || "Open the lessons below in order.";
    } else if (type === "quiz") {
      typeLabel = "Quiz";
    } else if (type === "discussion") {
      typeLabel = "Discussion";
    }
    if (assignment.resourceItems && assignment.resourceItems.length) {
      const first = assignment.resourceItems[0];
      resourceUrl = this.getAssignmentResourceItemUrl(first) || resourceUrl || first.resourceId || "";
    }
    return { typeLabel, summary, resourceUrl };
  }

  static cleanAssignmentInstructions(text = "") {
    let cleaned = String(text || "");
    cleaned = cleaned.replace(/\s*Resource:\s*[^.!?\n]*?https?:\/\/[^\s<>"']+/gi, " ");
    cleaned = cleaned.replace(/\s*Resource:\s*[^.!?\n]*(?=$|[.!?\n])/gi, " ");
    cleaned = cleaned.replace(/https?:\/\/[^\s<>"']+/gi, " ");
    cleaned = cleaned.replace(/\s+([.,!?;:])/g, "$1");
    cleaned = cleaned.replace(/(?:\s*[.]){2,}/g, ".");
    cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
    cleaned = cleaned.replace(/\s+[.,;:]$/g, "").trim();
    return cleaned;
  }

  static extractFirstUrl(text = "") {
    const match = String(text || "").match(/https?:\/\/[^\s<>"']+/i);
    return match ? match[0].replace(/[),.;\]]+$/, "") : "";
  }

  static parseMetadataObject(value) {
    if (!value) return {};
    if (typeof value === "object" && !Array.isArray(value)) return value;
    if (typeof value !== "string") return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  static isZipLaunchUrl(value = "") {
    try {
      const parsed = new URL(String(value || ""), window.location.href);
      return parsed.pathname.toLowerCase().endsWith(".zip");
    } catch (_) {
      return String(value || "").trim().toLowerCase().replace(/[?#].*$/, "").endsWith(".zip");
    }
  }

  static getAssignmentResourceItemUrl(item = {}) {
    const metadata = this.parseMetadataObject(item.metadata);
    return [
      item.projectUrl,
      item.project_url,
      item.previewUrl,
      item.preview_url,
      item.resourceUrl,
      item.resource_url,
      metadata.indexUrl,
      metadata.previewUrl,
      metadata.index_url,
      metadata.preview_url,
      item.fileUrl,
      item.file_url
    ].map((value) => String(value || "").trim()).find(Boolean) || "";
  }

  static getAssignmentLaunchCandidates(assignment = {}) {
    const metadata = this.parseMetadataObject(assignment.metadata);
    const firstResource = Array.isArray(assignment.resourceItems) ? assignment.resourceItems[0] : null;
    return [
      assignment.projectUrl,
      assignment.project_url,
      assignment.previewUrl,
      assignment.preview_url,
      assignment.resourceUrl,
      assignment.resource_url,
      metadata.indexUrl,
      metadata.previewUrl,
      metadata.index_url,
      metadata.preview_url,
      firstResource ? this.getAssignmentResourceItemUrl(firstResource) : "",
      this.extractFirstUrl(`${assignment.instructions || ""} ${assignment.description || ""}`)
    ].map((value) => String(value || "").trim()).filter(Boolean);
  }

  static getAssignmentRawLaunchUrl(assignment = {}) {
    return this.getAssignmentLaunchCandidates(assignment).find((value) => !this.isZipLaunchUrl(value))
      || this.getAssignmentLaunchCandidates(assignment)[0]
      || "";
  }

  static getAssignmentLaunchUrl(assignment = {}, context = {}) {
    const rawUrl = this.getAssignmentLaunchCandidates(assignment).find((value) => !this.isZipLaunchUrl(value)) || "";
    if (!rawUrl) return null;

    try {
      const url = new URL(rawUrl, window.location.href);
      if (!/^https?:$/.test(url.protocol)) return null;
      url.searchParams.set("course_id", context.courseId || "english-a1");
      url.searchParams.set("classroom_id", context.classroomId || assignment.classroomId || "");
      url.searchParams.set("assignment_id", context.assignmentId || assignment.id || "");
      url.searchParams.set("student_id", context.studentId || "");
      url.searchParams.set("score_sync_url", new URL("/api/classroom-activity-score", window.location.origin).toString());
      url.searchParams.set("parent_origin", window.location.origin);
      if (context.launchToken) {
        url.searchParams.set("launch_token", context.launchToken);
      }
      console.log("[Edtechra Assignment Launch]", {
        launchUrl: url.toString(),
        classroomId: context.classroomId || assignment.classroomId || "",
        assignmentId: context.assignmentId || assignment.id || "",
        studentId: context.studentId || "",
        courseId: context.courseId || "english-a1",
        hasLaunchToken: Boolean(context.launchToken)
      });
      return url.toString();
    } catch (_) {
      return null;
    }
  }

  static getAssignmentProgressKey(assignmentId = "", studentId = "") {
    return `edtechra_assignment_progress:${studentId || "student"}:${assignmentId || "assignment"}`;
  }

  static getActivityProgressKey(assignmentId = "", studentId = "") {
    return `edtechra_activity_days:${studentId || "student"}:${assignmentId || "assignment"}`;
  }

  static markAssignmentInProgress(assignmentId = "", studentId = "") {
    if (!assignmentId) return;
    try {
      localStorage.setItem(this.getAssignmentProgressKey(assignmentId, studentId), "in_progress");
    } catch (_) {
      // Ignore storage failures; the viewer still opens.
    }
  }

  static isAssignmentInProgress(assignmentId = "", studentId = "") {
    try {
      return localStorage.getItem(this.getAssignmentProgressKey(assignmentId, studentId)) === "in_progress";
    } catch (_) {
      return false;
    }
  }

  static getActivityCompletedDays(assignmentId = "", studentId = "") {
    try {
      const raw = localStorage.getItem(this.getActivityProgressKey(assignmentId, studentId));
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed.map(Number).filter((day) => Number.isFinite(day) && day > 0) : [];
    } catch (_) {
      return [];
    }
  }

  static markActivityDayComplete(assignmentId = "", studentId = "", dayNumber = 0) {
    const day = Number(dayNumber);
    if (!assignmentId || !Number.isFinite(day) || day <= 0) return [];
    const days = new Set(this.getActivityCompletedDays(assignmentId, studentId));
    days.add(day);
    const next = [...days].sort((a, b) => a - b);
    try {
      localStorage.setItem(this.getActivityProgressKey(assignmentId, studentId), JSON.stringify(next));
    } catch (_) {
      // Ignore storage failures; Supabase sync still carries the score.
    }
    return next;
  }

  static getAssignmentTotalDays(assignment = {}) {
    const metadata = this.parseMetadataObject(assignment.metadata);
    const fromMetadata = Number(metadata.totalDays || metadata.total_days || assignment.totalDays || assignment.total_days);
    if (Number.isFinite(fromMetadata) && fromMetadata > 0) return fromMetadata;
    const slug = String(metadata.activitySlug || metadata.activity_slug || assignment.activitySlug || assignment.activity_slug || assignment.title || "").toLowerCase();
    if (slug.includes("deep-ocean") || slug.includes("deep ocean") || slug.includes("nightmare")) return 7;
    return 0;
  }

  static calculateAssignmentProgress(assignment = {}, submission = null, studentId = "") {
    if (submission) {
      const status = String(submission.status || "").toLowerCase();
      const progressPercent = Number(submission.progressPercent || 0);
      if (status === "completed") return 100;
      if (progressPercent > 0) return Math.min(99, Math.round(progressPercent));
      if (Array.isArray(submission.completedDays) && submission.completedDays.length) {
        const totalDays = this.getAssignmentTotalDays(assignment);
        return totalDays ? Math.min(99, Math.round((submission.completedDays.length / totalDays) * 100)) : 1;
      }
      return status === "in_progress" ? 1 : 100;
    }
    const totalDays = this.getAssignmentTotalDays(assignment);
    if (totalDays > 0) {
      const completedDays = this.getActivityCompletedDays(assignment.id, studentId);
      return Math.min(100, Math.round((completedDays.length / totalDays) * 100));
    }
    return this.isAssignmentInProgress(assignment.id, studentId) ? 1 : 0;
  }

  static isAssignmentSubmissionComplete(assignment = {}, submission = null) {
    if (!submission) return false;
    const status = String(submission.status || "").toLowerCase();
    if (status === "completed") return true;

    const progressPercent = Number(submission.progressPercent || 0);
    const completedDays = Array.isArray(submission.completedDays) ? submission.completedDays : [];
    const hasActivityProgress = progressPercent > 0 || completedDays.length > 0 || this.getAssignmentTotalDays(assignment) > 0;
    if (hasActivityProgress) return progressPercent >= 100;

    return true;
  }

  static openActivityInsideApp(assignment = {}, launchUrl = "", context = {}) {
    if (!launchUrl) {
      const rawUrl = this.getAssignmentRawLaunchUrl(assignment);
      const message = rawUrl && this.isZipLaunchUrl(rawUrl)
        ? "This activity was uploaded but has not been processed into a playable preview yet."
        : "No lesson is available right now.";
      this.showToast(message, "error");
      return false;
    }

    this.markAssignmentInProgress(assignment.id, context.studentId);
    console.info("[Digital Classroom] Opening assignment activity iframe", {
      assignmentId: assignment.id || "",
      classroomId: context.classroomId || assignment.classroomId || "",
      studentId: context.studentId || "",
      activitySlug: this.getAssignmentActivitySlug(assignment),
      launchUrl
    });
    document.getElementById("assignment-activity-viewer")?.remove();

    const viewer = document.createElement("section");
    viewer.id = "assignment-activity-viewer";
    viewer.className = "assignment-activity-viewer assignment-activity-shell";
    viewer.innerHTML = `
      <div class="assignment-activity-header">
        <button class="assignment-activity-back-btn" type="button" data-close-activity-viewer>&larr; Back</button>
        <a class="assignment-activity-fallback assignment-activity-open-new-tab" href="${this.escape(launchUrl)}" target="_blank" rel="noopener noreferrer" hidden>Open in New Tab</a>
      </div>
      <main class="assignment-activity-body">
        <iframe
          src="${this.escape(launchUrl)}"
          title="Assignment Activity"
          class="assignment-activity-frame"
          scrolling="yes"
          allow="fullscreen; autoplay; clipboard-read; clipboard-write"
        ></iframe>
      </main>
    `;
    document.body.appendChild(viewer);
    document.body.classList.add("assignment-activity-open");
    document.body.classList.add("assignment-viewer-open");

    const closeViewer = () => {
      viewer.remove();
      document.body.classList.remove("assignment-activity-open");
      document.body.classList.remove("assignment-viewer-open");
    };
    viewer.querySelector("[data-close-activity-viewer]")?.addEventListener("click", closeViewer);

    const fallback = viewer.querySelector(".assignment-activity-fallback");
    const frame = viewer.querySelector("iframe");
    const fallbackTimer = window.setTimeout(() => {
      if (fallback) fallback.hidden = false;
    }, 6000);
    frame?.addEventListener("load", () => {
      window.clearTimeout(fallbackTimer);
    }, { once: true });
    frame?.addEventListener("error", () => {
      if (fallback) fallback.hidden = false;
      this.showToast("This activity could not be loaded inside Edtechra. Use Open in New Tab to continue.", "error");
    }, { once: true });

    return true;
  }

  static getAssignmentActivitySlug(assignment = {}) {
    const metadata = this.parseMetadataObject(assignment.metadata);
    const explicit = metadata.activitySlug || metadata.activity_slug || assignment.activitySlug || assignment.activity_slug;
    if (explicit) return String(explicit).trim();
    const title = String(assignment.title || "activity").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (title.includes("nightmare") || title.includes("deep-ocean")) return "deep-ocean-7-day";
    return title || "activity";
  }

  static getStudentIdentityValues(student = {}) {
    return [student.id, student.profileId, student.memberId]
      .filter(Boolean)
      .map((value) => String(value));
  }

  static findStudentByIdentity(students = [], student = {}) {
    const identityValues = new Set(this.getStudentIdentityValues(student));
    if (!identityValues.size) return null;
    return students.find((item) => (
      this.getStudentIdentityValues(item).some((value) => identityValues.has(value))
    )) || null;
  }

  static bindActivityScoreListener(classroomId = "", studentId = "", assignmentRecords = [], students = []) {
    if (this._activityScoreListener) {
      window.removeEventListener("message", this._activityScoreListener);
    }

    this._activityScoreListener = async (event) => {
      const message = event.data || {};
      if (message?.type === "EDTECHRA_ACTIVITY_SCORE_SYNCED") {
        console.log("[Edtechra Activity Message]", message);
        const assignmentId = String(message.assignmentId || "").trim();
        const record = assignmentRecords.find((item) => String(item.assignment.id) === assignmentId);
        const completedDays = Array.isArray(message.completedDays)
          ? message.completedDays.map(Number).filter((day) => Number.isFinite(day) && day > 0)
          : this.markActivityDayComplete(assignmentId, studentId, message.dayNumber);
        if (assignmentId && message.dayNumber) {
          this.markActivityDayComplete(assignmentId, studentId, message.dayNumber);
        }
        if (record) {
          const totalDays = this.getAssignmentTotalDays(record.assignment) || completedDays.length || 1;
          const progress = Math.min(100, Math.round((completedDays.length / totalDays) * 100));
          record.progressPercent = progress;
          console.log("[Edtechra Assignment Progress Refresh]", assignmentId);
          this.updateVisibleAssignmentProgress(assignmentId, progress, progress >= 100 ? "Completed" : "In Progress");
          const averageProgress = assignmentRecords.length
            ? Math.round(assignmentRecords.reduce((sum, item) => sum + Number(item.progressPercent || 0), 0) / assignmentRecords.length)
            : progress;
          this.setText("student-progress-rate", `${averageProgress}%`);
        }
        console.log("[Edtechra Leaderboard Refresh]", classroomId);
        let refreshedStudents = null;
        try {
          refreshedStudents = await ClassroomAPI.getStudentsByClassroom(classroomId);
        } catch (error) {
          console.warn("[Digital Classroom] Leaderboard refresh failed after score sync.", error);
        }
        const leaderboardContainer = document.getElementById("student-leaderboard");
        if (leaderboardContainer && Array.isArray(refreshedStudents)) {
          leaderboardContainer.innerHTML = this.renderStudentLeaderboard(refreshedStudents, studentId);
        }
        const refreshedStudent = Array.isArray(refreshedStudents)
          ? this.findStudentByIdentity(refreshedStudents, { id: studentId })
          : null;
        if (refreshedStudent) {
          this.setText("student-points", `${Number(refreshedStudent.points || 0)} pts`);
        }
        return;
      }
      if (!message || message.type !== "edtechra:activity-score") return;
      console.warn("[Digital Classroom] Ignored legacy activity score postMessage. Activities must POST scores to /api/classroom-activity-score before sending EDTECHRA_ACTIVITY_SCORE_SYNCED.");
    };

    window.addEventListener("message", this._activityScoreListener);
  }

  static updateVisibleAssignmentProgress(assignmentId = "", progress = 0, statusLabel = "In Progress") {
    const safeAssignmentId = window.CSS?.escape ? CSS.escape(String(assignmentId || "")) : String(assignmentId || "").replace(/"/g, '\\"');
    document.querySelectorAll(`[data-assignment-status="${safeAssignmentId}"]`).forEach((status) => {
      status.textContent = statusLabel;
      status.classList.remove("pending");
      status.classList.add(progress >= 100 ? "completed" : "active");
    });
    document.querySelectorAll(`[data-assignment-action="${safeAssignmentId}"]`).forEach((button) => {
      button.textContent = progress >= 100 ? "Review" : "Go to Lesson";
    });
    document.querySelectorAll(`[data-assignment-progress="${safeAssignmentId}"]`).forEach((label) => {
      label.textContent = `${progress}%`;
    });
    document.querySelectorAll(`[data-assignment-progress-bar="${safeAssignmentId}"]`).forEach((bar) => {
      bar.style.width = `${progress}%`;
    });
  }

  static formatDateShort(value) {
    if (!value) return "No date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return this.escape(String(value).slice(0, 10));
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  static getTodayInTimezone() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  static renderStudentClassroomShell(classroom, student) {
    const studentName = this.getStudentDisplayName(student);
    return `
      <div class="student-learning-shell">
        <div class="student-learning-main">
          <header class="student-learning-topbar">
            <label class="student-search-box">
              <span>${this.getIcon("search")}</span>
              <input type="search" placeholder="Search lessons, assignments, notes..." aria-label="Search lessons, assignments, notes">
            </label>
            <div class="student-topbar-actions">
              <button class="student-icon-button" type="button" aria-label="Notifications">
                ${this.getIcon("bell")}
                <span class="notification-badge">3</span>
              </button>
              <div class="student-profile-chip">
                <span class="student-avatar">${this.escape(studentName.charAt(0).toUpperCase())}</span>
                <div>
                  <strong id="student-name">${this.escape(studentName)}</strong>
                  <small>Student</small>
                </div>
                <span class="student-profile-chevron">${this.getDashboardIcon("chevron")}</span>
              </div>
            </div>
          </header>

          <section class="student-class-hero">
            <div class="student-class-hero-copy">
              <p>Welcome back, ${this.escape(studentName)}!</p>
              <h1>${this.escape(classroom.name)}</h1>
              <span>Keep up the great work! You're on track to achieve your learning goals.</span>
              <div class="student-hero-actions">
                <button class="btn btn-primary" type="button" data-go-current-lesson>${this.getIcon("book")} Go to Lesson</button>
                <button class="btn btn-secondary" type="button" data-view-class-resources>${this.getIcon("folder")} View Class Resources</button>
              </div>
            </div>
            <div class="student-class-hero-visual">
              <img class="student-hero-image" src="../../assets/images/classroom.webp" alt="" loading="eager" decoding="async">
            </div>
          </section>

          <section class="student-quick-actions" aria-label="Student quick actions">
            <article class="student-quick-action-card student-quick-action-card--quiz">
              <div class="student-quick-action-content">
                <h2 class="student-quick-action-title">Live Quiz</h2>
                <p class="student-quick-action-text">Join live quizzes created by your teachers.</p>
                <a class="student-quick-action-btn" href="${this.getLiveQuizUrl({
                  classroomId: classroom.id,
                  teacherId: classroom.teacherId || classroom.teacher_id || "",
                  studentId: student.id || student.profileId || student.profile_id || "",
                  profileId: student.profileId || student.profile_id || student.id || ""
                })}" data-future-route="live-quiz">Join Now ${this.getIcon("arrow")}</a>
              </div>
              <span class="student-quick-action-icon">${this.getIcon("broadcast")}</span>
            </article>
            <article class="student-quick-action-card student-quick-action-card--exams">
              <div class="student-quick-action-content">
                <h2 class="student-quick-action-title">Exams</h2>
                <p class="student-quick-action-text">Take exams and track your performance.</p>
                <button class="student-quick-action-btn" type="button" data-student-quick-action="exams">View Exams ${this.getIcon("arrow")}</button>
              </div>
              <span class="student-quick-action-icon">${this.getIcon("clipboard")}</span>
            </article>
            <article class="student-quick-action-card student-quick-action-card--competitions">
              <div class="student-quick-action-content">
                <h2 class="student-quick-action-title">Competitions</h2>
                <p class="student-quick-action-text">Participate and challenge yourself.</p>
                <button class="student-quick-action-btn" type="button" data-student-quick-action="competitions">Explore ${this.getIcon("arrow")}</button>
              </div>
              <span class="student-quick-action-icon">${this.getIcon("trophy")}</span>
            </article>
            <article class="student-quick-action-card student-quick-action-card--calendar">
              <div class="student-quick-action-content">
                <h2 class="student-quick-action-title">Calendar</h2>
                <p class="student-quick-action-text">Check important dates and events.</p>
                <button class="student-quick-action-btn" type="button" data-student-quick-action="calendar">Open Calendar ${this.getIcon("arrow")}</button>
              </div>
              <span class="student-quick-action-icon">${this.getIcon("calendar")}</span>
            </article>
          </section>

          <section class="student-dashboard-stats" aria-label="Classroom summary">
            <article class="student-stat-card">
              <div class="student-stat-card-left">
                <span class="student-stat-icon progress">${this.getIcon("trendingUp")}</span>
                <div>
                  <small>Progress</small>
                  <strong id="student-progress-rate">0%</strong>
                  <span>Overall Completion</span>
                </div>
              </div>
              <div class="student-stat-card-right trend-up">
                <span id="student-progress-context">0/0</span>
                <small>tasks complete</small>
              </div>
            </article>
            <article class="student-stat-card">
              <div class="student-stat-card-left">
                <span class="student-stat-icon active">${this.getIcon("check")}</span>
                <div>
                  <small>Active</small>
                  <strong id="student-active-task-count">0</strong>
                  <span>Tasks in Progress</span>
                </div>
              </div>
              <div class="student-stat-card-right count-badge">
                <strong id="student-resource-count">0</strong>
                <small>Lessons</small>
              </div>
            </article>
            <article class="student-stat-card">
              <div class="student-stat-card-left">
                <span class="student-stat-icon deadline">${this.getIcon("calendar")}</span>
                <div>
                  <small>Upcoming Deadline</small>
                  <strong id="student-next-deadline">No deadline</strong>
                  <span id="student-deadline-count">No deadline</span>
                </div>
              </div>
              <div class="student-stat-card-right deadline-badge" id="student-deadline-badge">
                <strong>-</strong>
                <small>remaining</small>
              </div>
            </article>
          </section>

          <section class="student-dashboard-grid student-classroom-main-grid" id="student-workspace">
            <div class="student-dashboard-left student-classroom-left-column">
              <section class="student-dashboard-panel student-panel-messages" id="student-messages-panel">
                <div class="student-panel-header">
                  <div>
                    <h2>Messages</h2>
                    <p>Latest updates from your teacher.</p>
                  </div>
                </div>
                <div class="student-message-list" id="student-teacher-messages"></div>
              </section>

              <section class="student-dashboard-panel student-panel-tasks" id="student-tasks-panel">
                <div class="student-panel-header">
                  <h2>Tasks</h2>
                  <a href="#student-content">View all</a>
                </div>
                <div class="student-task-list" id="student-assignments"></div>
              </section>

              <section class="student-dashboard-panel student-panel-assignment" id="student-assignment-detail"></section>

              <section class="student-dashboard-panel student-panel-events" id="student-events-panel">
                <div class="student-panel-header">
                  <h2>Upcoming Events</h2>
                  <a href="#student-workspace">View calendar</a>
                </div>
                <div class="student-event-list" id="student-upcoming-events"></div>
              </section>

              <section class="student-dashboard-panel student-panel-activity">
                <div class="student-panel-header">
                  <h2>Recent Activity</h2>
                  <a href="#student-workspace">View all activity</a>
                </div>
                <div class="student-activity-list" id="student-recent-activity"></div>
              </section>
            </div>

            <div class="student-dashboard-right student-classroom-right-column">
              <section class="student-dashboard-panel student-panel-leaderboard">
                <div class="student-panel-header">
                  <h2>Leaderboard</h2>
                  <span>This Week</span>
                </div>
                <div class="student-leaderboard" id="student-leaderboard"></div>
              </section>

              <section class="student-dashboard-panel student-panel-ai">
                <div class="student-panel-header">
                  <h2>AI Feedback</h2>
                </div>
                <div id="student-ai-feedback"></div>
              </section>
            </div>
          </section>

          <div class="sr-only" id="student-points">${Number(student.points || 0)} pts</div>
          <div class="sr-only" id="student-content"></div>
        </div>
      </div>
    `;
  }

  static async renderStudentWorkspace(classroomId, student, classroom = {}) {
    document.getElementById("student-join-panel")?.classList.add("hidden");
    document.getElementById("student-workspace")?.classList.remove("hidden");
    this.setText("student-name", this.getStudentDisplayName(student));
    this.setText("student-points", `${Number(student.points || 0)} pts`);

    const [assignments, bucketItems, students, classroomMessages] = await Promise.all([
      ClassroomAPI.getAssignmentsByClassroom(classroomId),
      ClassroomAPI.getClassroomContent(classroomId),
      ClassroomAPI.getStudentsByClassroom(classroomId).catch((error) => {
        console.warn("[Digital Classroom] Student leaderboard unavailable", error);
        return [];
      }),
      ClassroomAPI.getClassroomMessages(classroomId).catch((error) => {
        console.warn("[Digital Classroom] Student messages unavailable", error);
        return [];
      })
    ]);
    const currentStudent = this.findStudentByIdentity(students, student);
    if (currentStudent) {
      this.setText("student-points", `${Number(currentStudent.points || 0)} pts`);
    }

    const assignmentRecords = await Promise.all(assignments.map(async (assignment) => {
      const submission = await ClassroomAPI.getSubmission(assignment.id, student.id).catch(() => null);
      const isSpree = assignment.assignmentType === "learning_spree";
      const items = isSpree ? (assignment.resourceItems || []) : [];
      const progressRows = isSpree
        ? await ClassroomAPI.getSpreeItemProgress(assignment.id, student.id).catch(() => [])
        : [];
      const progressByItem = new Map(progressRows.map((row) => [String(row.spreeItemId), row]));
      const completedCount = items.filter((item) => progressByItem.get(String(item.id))?.status === "completed").length;
      const progressPercent = isSpree
        ? (items.length ? Math.round((completedCount / items.length) * 100) : 0)
        : this.calculateAssignmentProgress(assignment, submission, student.id);
      const displayMeta = this.getAssignmentDisplayMeta(assignment);
      return { assignment, submission, isSpree, items, progressByItem, completedCount, progressPercent, displayMeta };
    }));
    const taskModels = this.buildStudentTaskModels(assignmentRecords);
    const feedbackModel = this.getStudentFeedbackModel(assignmentRecords);

    const submittedCount = assignmentRecords.filter((record) => String(record.submission?.status || "").toLowerCase() === "completed").length;
    const progressRate = assignmentRecords.length
      ? Math.round(assignmentRecords.reduce((sum, record) => sum + Number(record.progressPercent || 0), 0) / assignmentRecords.length)
      : 0;
    const activeCount = assignmentRecords.filter((record) => !record.submission && record.progressPercent < 100).length;
    const upcomingAssignments = [...assignments]
      .filter((assignment) => assignment.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const nextDue = upcomingAssignments[0];

    this.setText("student-progress-rate", `${progressRate}%`);
    this.setText("student-progress-context", `${submittedCount}/${assignments.length}`);
    this.setText("student-active-task-count", String(activeCount));
    this.setText("student-resource-count", String(bucketItems.length));
    this.setText("student-next-deadline", nextDue ? this.formatDateShort(nextDue.dueDate) : "No deadline");
    this.setText("student-deadline-count", nextDue ? (nextDue.title || "No deadline") : "No active deadlines");

    const dueDistance = nextDue ? this.getDueDistanceLabel(nextDue.dueDate) : "No deadline";
    const daysMatch = dueDistance.match(/(\d+)\s+day/);
    const daysText = daysMatch ? `${daysMatch[1]} days` : dueDistance.includes("today") ? "Today" : dueDistance;
    const remainingText = dueDistance.includes("remaining") ? "remaining" : dueDistance.includes("overdue") ? "overdue" : "remaining";
    const deadlineBadge = document.getElementById("student-deadline-badge");
    if (deadlineBadge) {
      if (nextDue) {
        deadlineBadge.innerHTML = `<strong>${daysText}</strong><small>${remainingText}</small>`;
        deadlineBadge.style.display = "flex";
      } else {
        deadlineBadge.style.display = "none";
      }
    }

    const assignmentContainer = document.getElementById("student-assignments");
    if (assignmentContainer) {
      assignmentContainer.innerHTML = this.renderStudentTaskPanel(taskModels);
    }

    const messagesContainer = document.getElementById("student-teacher-messages");
    if (messagesContainer) {
      messagesContainer.innerHTML = this.renderStudentMessages(classroomMessages);
    }

    const assignmentDetail = document.getElementById("student-assignment-detail");
    if (assignmentDetail) {
      assignmentDetail.innerHTML = this.renderStudentAssignmentDetail(assignmentRecords);
    }

    const feedbackContainer = document.getElementById("student-ai-feedback");
    if (feedbackContainer) {
      feedbackContainer.innerHTML = this.renderStudentAiFeedbackPanel(feedbackModel);
      this.bindStudentAiFeedbackToggle(feedbackContainer, feedbackModel);
    }

    const eventsContainer = document.getElementById("student-upcoming-events");
    if (eventsContainer) {
      eventsContainer.innerHTML = upcomingAssignments.length
        ? upcomingAssignments.slice(0, 3).map((assignment, index) => `
          <div class="student-event-row event-accent-${index % 3}">
            <span class="student-event-icon">${this.getIcon("calendar")}</span>
            <div class="student-event-info">
              <strong>${this.escape(assignment.title)}</strong>
            </div>
            <time>${this.formatDateShort(assignment.dueDate)}</time>
            <small>11:59 PM</small>
          </div>
        `).join("")
        : this.emptyState("No upcoming events", "Scheduled classroom events will appear here.");
    }

    const contentContainer = document.getElementById("student-content");
    if (contentContainer) {
      contentContainer.innerHTML = bucketItems.length
        ? bucketItems.map((item) => `
          <div class="list-item compact">
            <div>
              <h4>${this.escape(item.title)}</h4>
              <span>${this.escape(item.type)} / ${this.escape(item.subject)} / ${item.minutes} min</span>
            </div>
          </div>
        `).join("")
        : this.emptyState("No content assigned", "Classroom bucket resources will appear here.");
    }

    const leaderboardContainer = document.getElementById("student-leaderboard");
    if (leaderboardContainer) {
      leaderboardContainer.innerHTML = this.renderStudentLeaderboard(students, student.id);
    }

    const recentActivity = document.getElementById("student-recent-activity");
    if (recentActivity) {
      const data = ClassroomState.getData();
      const activityItems = data.submissions
        .filter((submission) => submission.classroomId === classroomId && submission.studentId === student.id)
        .slice(0, 3)
        .map((submission) => {
          const assignment = assignments.find((item) => item.id === submission.assignmentId);
          return {
            title: `Submitted "${assignment?.title || "assignment"}"`,
            meta: this.formatDate(submission.submittedAt)
          };
        });
      recentActivity.innerHTML = activityItems.length
        ? activityItems.map((item, index) => `
          <div class="student-activity-row activity-type-${index % 3}">
            <span class="student-activity-icon">${this.getIcon(index % 3 === 0 ? "check" : index % 3 === 1 ? "book" : "star")}</span>
            <strong>${this.escape(item.title)}</strong>
            <time>${this.escape(item.meta)}</time>
          </div>
        `).join("")
        : this.emptyState("No recent activity", "Your submissions and classroom check-ins will appear here.");
    }

    this.bindActivityScoreListener(classroomId, student.id, assignmentRecords, students);

    const openAssignmentRecord = (record) => {
      if (!record) {
        this.showToast("No lesson is available right now.", "error");
        return false;
      }

      const launchUrl = this.getAssignmentLaunchUrl(record.assignment, {
        courseId: "english-a1",
        classroomId,
        assignmentId: record.assignment.id,
        studentId: student.id,
        launchToken: ""
      });
      const opened = this.openActivityInsideApp(record.assignment, launchUrl, {
        classroomId,
        studentId: student.id
      });

      if (opened) {
        this.updateVisibleAssignmentProgress(record.assignment.id, Number(record.progressPercent || 0), "In Progress");
      }

      return opened;
    };

    const openTask = (task) => {
      if (!task || task.locked) {
        this.showToast("No lesson is available right now.", "error");
        return false;
      }
      const record = assignmentRecords.find((item) => item.assignment.id === task.assignmentId);
      return openAssignmentRecord(record);
    };

    document.querySelector("[data-go-current-lesson]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentTask = this.selectCurrentStudentTask(taskModels);
      openTask(currentTask);
    });

    document.querySelector("[data-view-class-resources]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (bucketItems.length) {
        document.getElementById("student-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        this.showToast("No class resources are available right now.", "error");
      }
    });

    this.bindLiveQuizLaunch({
      classroomId,
      teacherId: classroom.teacherId || classroom.teacher_id || "",
      studentId: student.id || student.profileId || student.profile_id || "",
      profileId: student.profileId || student.profile_id || student.id || "",
      userId: student.profileId || student.profile_id || student.id || "",
      role: "student"
    });

    document.querySelectorAll("[data-student-quick-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const action = button.dataset.studentQuickAction;
        if (action === "calendar") {
          document.getElementById("student-events-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        if (action === "exams") {
          window.location.href = this.getRouteHref("studentExams", { classroomId });
          return;
        }
        const label = action === "exams" ? "Student exams" : "Student competitions";
        this.showToast(`${label} will appear here when your teacher shares one.`, "info");
      });
    });

    document.querySelectorAll("[data-open-student-task]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const task = taskModels.find((item) => item.key === button.dataset.openStudentTask);
        openTask(task);
      });
    });

    document.querySelectorAll("[data-open-assignment-resource]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const record = assignmentRecords.find((item) => item.assignment.id === button.dataset.openAssignmentResource);
        openAssignmentRecord(record);
      });
    });

    document.querySelectorAll("[data-submit-assignment]").forEach((button) => {
      button.addEventListener("click", async () => {
        await ClassroomAPI.submitAssignment(button.dataset.submitAssignment, student.id);
        const refreshed = (await ClassroomAPI.getStudentsByClassroom(classroomId)).find((item) => item.id === student.id);
        await this.renderStudentWorkspace(classroomId, refreshed);
      });
    });

    document.querySelectorAll("[data-open-spree-lesson], [data-complete-spree-lesson]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isComplete = Boolean(button.dataset.completeSpreeLesson);
        const spreeItemId = button.dataset.completeSpreeLesson || button.dataset.openSpreeLesson;
        if (!isComplete) {
          const assignment = assignments.find((item) => item.id === button.dataset.spreeAssignment);
          const item = (assignment?.resourceItems || []).find((resourceItem) => String(resourceItem.id) === String(spreeItemId));
          const launchUrl = this.getAssignmentLaunchUrl({
            ...(assignment || {}),
            resourceItems: item ? [item] : []
          }, {
            courseId: "english-a1",
            classroomId,
            assignmentId: button.dataset.spreeAssignment,
            studentId: student.id,
            launchToken: ""
          });
          this.openActivityInsideApp(assignment || { id: button.dataset.spreeAssignment, title: "Lesson" }, launchUrl, {
            classroomId,
            studentId: student.id
          });
          return;
        }

        const now = new Date().toISOString();
        await ClassroomAPI.upsertSpreeItemProgress({
          assignmentId: button.dataset.spreeAssignment,
          spreeItemId,
          resourceId: button.dataset.spreeResource,
          studentId: student.id,
          classroomId: button.dataset.spreeClassroom || classroomId,
          status: isComplete ? "completed" : "opened",
          openedAt: now,
          completedAt: isComplete ? now : ""
        });
        const refreshed = (await ClassroomAPI.getStudentsByClassroom(classroomId)).find((item) => item.id === student.id) || student;
        await this.renderStudentWorkspace(classroomId, refreshed);
      });
    });
  }

  static getStudentDisplayName(student = {}) {
    const preferred = [
      student.full_name,
      student.fullName,
      student.name,
      student.display_name,
      student.displayName,
      student.profile_name,
      student.profileName
    ].find((value) => {
      const text = String(value || "").trim();
      return text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
    });

    if (preferred) return String(preferred).trim();

    const fallback = [
      student.full_name,
      student.fullName,
      student.name,
      student.display_name,
      student.displayName,
      student.profile_name,
      student.profileName,
      student.email
    ].find((value) => String(value || "").trim());

    return this.cleanEmailName(fallback) || "Student";
  }

  static cleanEmailName(value = "") {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      return text.split("@")[0].replace(/[._-]+/g, " ").trim() || "";
    }
    return text;
  }

  static renderStudentAvatar(student = {}, className = "") {
    const name = this.getStudentDisplayName(student);
    const avatarUrl = student.avatarUrl || student.avatar_url || "";
    if (avatarUrl) {
      return `<img class="avatar student-avatar-img ${className}" src="${this.escape(avatarUrl)}" alt="" loading="lazy" decoding="async">`;
    }
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "S";
    return `<div class="avatar ${className}">${this.escape(initials)}</div>`;
  }

  static getStudentTaskDedupKey(task = {}) {
    return String(task.resourceId || task.title || task.assignmentId || "")
      .trim()
      .toLowerCase();
  }

  static buildStudentTaskModels(assignmentRecords = []) {
    const tasks = [];
    assignmentRecords.forEach((record) => {
      const { assignment, submission, isSpree, items, progressByItem, displayMeta, progressPercent } = record;
      if (isSpree && items.length) {
        items.forEach((item) => {
          const progress = progressByItem.get(String(item.id));
          const status = progress?.status || "not_started";
          const completed = status === "completed";
          const unlocked = this.isSpreeItemUnlocked(assignment, item);
          const unlockDate = this.getSpreeItemUnlockDate(assignment, item);
          tasks.push({
            key: `spree:${assignment.id}:${item.id}`,
            assignmentId: assignment.id,
            resourceId: item.resourceId || item.id,
            fileUrl: item.fileUrl || "",
            title: item.title || assignment.title,
            typeLabel: item.resourceType || "Learning Spree",
            dueDate: assignment.dueDate || "",
            completed,
            locked: !unlocked,
            statusClass: completed ? "completed" : unlocked ? "active" : "locked",
            statusLabel: completed ? "Completed" : unlocked ? "Available" : this.getUnlockText(unlockDate),
            actionLabel: completed ? "Review" : unlocked ? "Open Lesson" : "Locked",
            progressPercent,
            createdAt: assignment.createdAt || ""
          });
        });
        return;
      }

      const hasResource = Boolean(displayMeta.resourceUrl);
      const completed = this.isAssignmentSubmissionComplete(assignment, submission);
      const started = Number(progressPercent || 0) > 0;
      tasks.push({
        key: `assignment:${assignment.id}`,
        assignmentId: assignment.id,
        resourceId: displayMeta.resourceUrl || "",
        fileUrl: displayMeta.resourceUrl || "",
        title: assignment.title || "Assignment",
        typeLabel: displayMeta.typeLabel || "Assignment",
        dueDate: assignment.dueDate || "",
        completed,
        locked: false,
        statusClass: completed ? "completed" : started ? "active" : "pending",
        statusLabel: completed ? "Completed" : started ? "In Progress" : "Not Started",
        actionLabel: completed ? "Review" : started && hasResource ? "Go to Lesson" : "Start",
        progressPercent,
        createdAt: assignment.createdAt || ""
      });
    });

    const deduped = [];
    const seen = new Set();
    tasks.forEach((task) => {
      const dedupKey = this.getStudentTaskDedupKey(task);
      if (!dedupKey || seen.has(dedupKey)) return;
      seen.add(dedupKey);
      deduped.push(task);
    });
    return deduped.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.locked !== b.locked) return a.locked ? 1 : -1;
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return aDate - bDate || String(a.title).localeCompare(String(b.title));
    });
  }

  static selectCurrentStudentTask(tasks = []) {
    return tasks.find((task) => !task.completed && !task.locked)
      || tasks.find((task) => !task.completed)
      || tasks.find((task) => task.completed)
      || null;
  }

  static renderStudentTaskCard(task, featured = false) {
    if (!task) {
      return `
        <div class="student-dashboard-empty">
          <strong>${featured ? "No task for today." : "No pending tasks."}</strong>
          <span>${featured ? "Your teacher's assigned work will appear here." : "You're all caught up for now."}</span>
        </div>
      `;
    }
    const dueText = task.dueDate ? `Due ${this.formatDateShort(task.dueDate)}` : "No deadline";
    return `
      <article class="student-task-row ${featured ? "is-featured" : ""}">
        <div class="student-task-main">
          <span class="student-task-icon">${this.getIcon(task.completed ? "check" : "clipboard")}</span>
          <div class="student-task-copy">
            <strong>${this.escape(task.title)}</strong>
            <small>${this.escape(task.typeLabel)} &bull; ${this.escape(dueText)}</small>
          </div>
        </div>
        <span class="student-status-pill ${this.escape(task.statusClass)}" data-assignment-status="${this.escape(task.assignmentId || "")}">${this.escape(task.statusLabel)}</span>
        <button class="student-row-action" type="button" data-open-student-task="${this.escape(task.key)}" data-assignment-action="${this.escape(task.assignmentId || "")}" ${task.locked ? "disabled" : ""}>
          ${this.escape(task.actionLabel)}
        </button>
      </article>
    `;
  }

  static renderStudentTaskPanel(tasks = []) {
    const currentTask = this.selectCurrentStudentTask(tasks);
    const pending = tasks
      .filter((task) => task !== currentTask && !task.completed && !task.locked)
      .slice(0, 3);
    const fallbackCompleted = !pending.length
      ? tasks.filter((task) => task !== currentTask && task.completed).slice(0, 3)
      : [];
    const pendingRows = pending.length ? pending : fallbackCompleted;
    return `
      <div class="student-task-section">
        <div class="student-task-section-heading">
          <h3>Today's Task</h3>
        </div>
        ${this.renderStudentTaskCard(currentTask, true)}
      </div>
      <div class="student-task-section">
        <div class="student-task-section-heading">
          <h3>Pending Tasks</h3>
        </div>
        <div class="student-pending-task-list">
          ${pendingRows.length
            ? pendingRows.map((task) => this.renderStudentTaskCard(task)).join("")
            : this.renderStudentTaskCard(null)}
        </div>
      </div>
    `;
  }

  static renderStudentMessages(messages = []) {
    if (!messages.length) {
      return `
        <div class="student-dashboard-empty student-message-empty">
          <span class="student-message-empty-icon">${this.getIcon("message")}</span>
          <strong>No new messages from your teacher.</strong>
        </div>
      `;
    }

    return messages.map((message) => {
      const text = String(message.message || message.text || "").trim();
      const createdAt = message.createdAt || "";
      return `
        <article class="student-message-row">
          <span class="student-message-dot ${message.isPinned ? "is-unread" : ""}" aria-hidden="true"></span>
          <div class="student-message-copy">
            <strong>Teacher${message.isPinned ? " / pinned" : ""}</strong>
            <p>${this.escape(text)}</p>
            ${message.editedAt ? `<small>Edited</small>` : ""}
          </div>
          <time>${this.escape(createdAt ? this.formatDateShort(createdAt) : "Now")}</time>
        </article>
      `;
    }).join("");
  }

  static openResourceWork(resource = {}) {
    const fileUrl = String(resource.fileUrl || "").trim();
    const resourceId = String(resource.resourceId || resource.id || "").trim();
    if (/^https?:\/\//i.test(fileUrl)) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      return true;
    }
    if (/^https?:\/\//i.test(resourceId)) {
      window.open(resourceId, "_blank", "noopener,noreferrer");
      return true;
    }
    if (resource.fallbackHash) {
      window.location.hash = resource.fallbackHash;
      return true;
    }
    if (resourceId && !/^ass_/i.test(resourceId)) {
      window.location.hash = `#detail/${encodeURIComponent(resourceId)}`;
      return true;
    }
    this.showToast("No lesson is available right now.", "error");
    return false;
  }

  static renderStudentTaskRows(assignmentRecords = []) {
    const rows = [];
    assignmentRecords.forEach((record) => {
      const { assignment, submission, isSpree, items, progressByItem, displayMeta } = record;
      if (isSpree) {
        items.slice(0, 5 - rows.length).forEach((item) => {
          const progress = progressByItem.get(String(item.id));
          const status = progress?.status || "not_started";
          const unlocked = this.isSpreeItemUnlocked(assignment, item);
          const unlockDate = this.getSpreeItemUnlockDate(assignment, item);

          let pillClass = "active";
          let pillLabel = "In Progress";
          if (status === "completed") {
            pillClass = "completed";
            pillLabel = "Completed";
          } else if (status === "not_started" || !unlocked) {
            if (!unlocked) {
              pillClass = "locked";
              pillLabel = "Locked";
            } else {
              pillClass = "pending";
              pillLabel = "Not Started";
            }
          } else {
            const title = String(item.title || "").toLowerCase();
            const resType = String(item.resourceType || "").toLowerCase();
            if (title.includes("read") || resType.includes("read")) {
              pillClass = "active-green";
              pillLabel = "In Progress";
            } else {
              pillClass = "active";
              pillLabel = "In Progress";
            }
          }

          const buttonLabel = status === "completed" ? "Review" : !unlocked ? "Locked" : "Open Lesson";
          rows.push(`
            <article class="student-task-row">
              <div style="display: flex; align-items: center; gap: 14px; min-width: 0; flex-grow: 1;">
                <span class="student-task-icon">${this.getIcon(status === "completed" ? "check" : "book")}</span>
                <div class="student-task-copy">
                  <strong>${this.escape(item.title || assignment.title)}</strong>
                  <small>${this.escape(item.resourceType || "Learning Spree")} &bull; Due ${this.formatDateShort(assignment.dueDate)}</small>
                </div>
              </div>
              <span class="student-status-pill ${pillClass}">${pillLabel}</span>
              <button class="student-row-action ${unlocked ? "" : "disabled"}" type="button"
                data-spree-assignment="${this.escape(assignment.id)}"
                data-spree-resource="${this.escape(item.resourceId)}"
                data-spree-classroom="${this.escape(assignment.classroomId)}"
                data-open-spree-lesson="${this.escape(item.id)}"
                data-spree-file-url="${this.escape(item.fileUrl || "")}"
                ${!unlocked ? "disabled" : ""}>${this.escape(unlocked ? buttonLabel : this.getUnlockText(unlockDate))}</button>
            </article>
          `);
        });
        return;
      }

      const hasResource = Boolean(displayMeta.resourceUrl);
      const completed = this.isAssignmentSubmissionComplete(assignment, submission);
      const pillClass = completed ? "completed" : "active";
      const pillLabel = completed ? "Completed" : "In Progress";
      rows.push(`
        <article class="student-task-row">
          <div style="display: flex; align-items: center; gap: 14px; min-width: 0; flex-grow: 1;">
            <span class="student-task-icon">${this.getIcon(completed ? "check" : "clipboard")}</span>
            <div class="student-task-copy">
              <strong>${this.escape(assignment.title)}</strong>
              <small>${this.escape(displayMeta.typeLabel)} &bull; Due ${this.formatDateShort(assignment.dueDate)}</small>
            </div>
          </div>
          <span class="student-status-pill ${pillClass}">${pillLabel}</span>
          ${hasResource ? `
            <button class="student-row-action" type="button" data-open-assignment-resource="${this.escape(assignment.id)}" data-assignment-action="${this.escape(assignment.id)}">${completed ? "Review" : "Open Lesson"}</button>
          ` : `
            <button class="student-row-action ${completed ? "disabled" : ""}" type="button"
              data-submit-assignment="${this.escape(assignment.id)}"
              ${completed ? "disabled" : ""}>${completed ? "Submitted" : `Submit (${Number(assignment.points || 0)} pts)`}</button>
          `}
        </article>
      `);
    });

    if (!rows.length) {
      return `
        <div class="student-dashboard-empty">
          <strong>No assignments yet</strong>
          <span>Your teacher's assigned work will appear here.</span>
        </div>
      `;
    }

    return rows.slice(0, 5).join("");
  }

  static renderStudentAssignmentDetail(assignmentRecords = []) {
    const record = assignmentRecords.find((item) => !item.submission) || assignmentRecords[0];
    if (!record) {
      return `
        <div class="student-panel-header">
          <h2>Your Assignment Details</h2>
        </div>
        <div class="student-dashboard-empty">
          <strong>No assignment details</strong>
          <span>Current assignment details will appear here.</span>
        </div>
      `;
    }

    const { assignment, submission, displayMeta, progressPercent } = record;
    const completed = this.isAssignmentSubmissionComplete(assignment, submission);
    const statusLabel = completed ? "Completed" : progressPercent > 0 ? "In Progress" : "Not Started";
    const statusClass = completed ? "completed" : progressPercent > 0 ? "active" : "pending";

    const displayPercent = progressPercent;

    return `
      <div class="student-panel-header">
        <h2>Your Assignment Details</h2>
        <a href="#student-tasks-panel">View all</a>
      </div>
      <article class="student-assignment-detail-card">
        <div class="student-assignment-detail-card-main">
          <span class="student-assignment-detail-icon">${this.getIcon("clipboard")}</span>
          <div class="student-assignment-detail-copy">
            <h3>${this.escape(assignment.title)}</h3>
            <p>${this.escape(displayMeta.summary || assignment.instructions || "Use evidence and reasoning to support your opinion.")}</p>
            <div class="student-assignment-meta">
              <span class="student-assignment-due-row">
                ${this.getIcon("calendar")} Due ${this.formatDate(assignment.dueDate)} &bull; 11:59 PM
              </span>
              <span class="student-status-pill ${statusClass}" data-assignment-status="${this.escape(assignment.id || "")}">${statusLabel}</span>
            </div>
          </div>
        </div>
        <div class="student-assignment-progress">
          <div class="student-assignment-progress-label">
            <strong data-assignment-progress="${this.escape(assignment.id || "")}">${displayPercent}%</strong>
            <span>Complete</span>
          </div>
          <div class="student-progress-bar" aria-hidden="true">
            <span data-assignment-progress-bar="${this.escape(assignment.id || "")}" style="width: ${displayPercent}%"></span>
          </div>
        </div>
      </article>
    `;
  }

  static getStudentFeedbackModel(assignmentRecords = []) {
    const records = [...assignmentRecords].sort((a, b) => {
      const aTime = new Date(a.submission?.updatedAt || a.submission?.submittedAt || 0).getTime();
      const bTime = new Date(b.submission?.updatedAt || b.submission?.submittedAt || 0).getTime();
      return bTime - aTime;
    });
    const submittedRecord = records.find((record) => record.submission || Number(record.progressPercent || 0) > 0);
    const readyRecord = records.find((record) => {
      const submission = record.submission || {};
      return Boolean(this.getSubmissionFeedbackText(submission) || this.getSubmissionNoteFeedback(submission));
    });

    if (readyRecord) {
      const submission = readyRecord.submission || {};
      return {
        state: "ready",
        title: readyRecord.assignment?.title || "Recent activity",
        body: "Your AI feedback is ready.",
        buttonText: "View AI Feedback",
        disabled: false,
        feedbackText: this.getSubmissionFeedbackText(submission) || this.getSubmissionNoteFeedback(submission),
        open: false
      };
    }

    if (submittedRecord) {
      return {
        state: "generating",
        title: submittedRecord.assignment?.title || "Recent activity",
        body: "Your activity has been submitted. AI feedback is being prepared.",
        buttonText: "Preparing feedback...",
        disabled: true,
        feedbackText: "",
        open: false
      };
    }

    return {
      state: "empty",
      title: "",
      body: "Complete an activity to receive personalised feedback.",
      buttonText: "Feedback not ready",
      disabled: true,
      feedbackText: "",
      open: false
    };
  }

  static getSubmissionFeedbackText(submission = {}) {
    return [
      submission.feedback,
      submission.feedbackSummary,
      submission.aiFeedback,
      submission.teacherFeedback
    ].map((value) => String(value || "").trim()).find(Boolean) || "";
  }

  static getSubmissionNoteFeedback(submission = {}) {
    const note = String(submission.note || "").trim();
    if (!note || /^placeholder submission$/i.test(note)) return "";
    return note;
  }

  static renderStudentAiFeedbackPanel(model = {}) {
    const isReady = model.state === "ready";
    const isOpen = isReady && model.open;
    const cardClass = `student-ai-feedback-card is-${this.escape(model.state || "empty")}${isReady ? " is-ready" : ""}${isOpen ? " is-open" : ""}`;
    const body = isOpen ? "Review your assignment feedback below." : (model.body || "Feedback will appear here after your teacher or AI review is ready.");
    const feedbackHtml = isOpen ? `<div class="student-ai-feedback-content">${this.formatFeedbackText(model.feedbackText)}</div>` : "";
    const contextHtml = model.title ? `<span class="student-ai-feedback-context">${this.escape(model.title)}</span>` : "";

    return `
      <div class="${cardClass}">
        <div class="student-ai-feedback-icon" aria-hidden="true">${this.getIcon("sparkles")}</div>
        <div class="student-ai-feedback-copy">
          ${contextHtml}
          <p>${this.escape(body)}</p>
          ${feedbackHtml}
          <button
            type="button"
            class="student-ai-feedback-button"
            data-ai-feedback-toggle
            ${model.disabled ? "disabled" : ""}
          >${this.escape(isOpen ? "Hide Feedback" : model.buttonText || "Feedback not ready")}</button>
          ${!isReady ? `<small>Feedback will appear here after your teacher or AI review is ready.</small>` : ""}
        </div>
      </div>
    `;
  }

  static formatFeedbackText(text = "") {
    const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return "";
    return lines.map((line) => `<p>${this.escape(line)}</p>`).join("");
  }

  static bindStudentAiFeedbackToggle(container, model) {
    container.querySelector("[data-ai-feedback-toggle]")?.addEventListener("click", () => {
      model.open = !model.open;
      container.innerHTML = this.renderStudentAiFeedbackPanel(model);
      this.bindStudentAiFeedbackToggle(container, model);
    });
  }

  static renderStudentLeaderboard(students = [], currentStudentId = "") {
    const sortedStudents = [...students].sort((a, b) => Number(b.points || 0) - Number(a.points || 0)).slice(0, 10);
    if (!sortedStudents.length) {
      return `
        <div class="student-dashboard-empty">
          <strong>No leaderboard data yet.</strong>
          <span>Student points will appear after classroom activity.</span>
        </div>
      `;
    }

    const rowsHtml = sortedStudents.map((student, index) => {
      const isCurrent = this.getStudentIdentityValues(student).includes(String(currentStudentId));
      const rank = index + 1;
      const displayName = this.getStudentDisplayName(student);
      let rankContent = `<span class="student-rank-num">${rank}</span>`;
      if (rank === 1) rankContent = `<span class="student-medal">🥇</span>`;
      else if (rank === 2) rankContent = `<span class="student-medal">🥈</span>`;
      else if (rank === 3) rankContent = `<span class="student-medal">🥉</span>`;

      const badgeLabel = index === 0 ? "Top Performer" : index === 1 ? "Consistent Learner" : index === 2 ? "Great Effort" : "";
      const badgeClass = index === 0 ? "badge-purple" : index === 1 ? "badge-blue" : index === 2 ? "badge-green" : "";
      const badgeHtml = "";
      rankContent = rank <= 3
        ? `<span class="student-medal rank-${rank}">${rank}</span>`
        : `<span class="student-rank-num">${rank}</span>`;

      return `
        <div class="student-leaderboard-row ${isCurrent ? "is-current" : ""}">
          <div class="student-leaderboard-row-left">
            ${rankContent}
            <span class="student-avatar">${this.escape(displayName.charAt(0).toUpperCase())}</span>
            <div class="student-leaderboard-name-sec">
              <strong>${this.escape(displayName)}${isCurrent ? " (You)" : ""}</strong>
              <small>${rank === 1 ? "Leading the class" : isCurrent ? "Your position" : "Class member"}</small>
            </div>
          </div>
          <span class="student-leaderboard-pts">${Number(student.points || 0).toLocaleString()} pts</span>
        </div>
      `;
    }).join("");

    return `
      ${rowsHtml}
      <div class="student-leaderboard-footer">
        <a href="#student-workspace" class="view-full-leaderboard-link">View full leaderboard ${this.getDashboardIcon("chevron")}</a>
      </div>
    `;
  }

  static getDueDistanceLabel(value) {
    if (!value) return "No deadline";
    const today = new Date(`${this.getTodayInTimezone()}T00:00:00`);
    const due = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(due.getTime())) return "Due date set";
    const days = Math.round((due - today) / 86400000);
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "1 day remaining";
    return `${days} days remaining`;
  }

  static getInviteLink(inviteCodeOrId) {
    if (window.App) {
      return `${window.location.origin}/join/${encodeURIComponent(inviteCodeOrId)}`;
    }

    const basePath = window.location.pathname.replace(/[^/]+$/, "join-classroom.html");
    return `${window.location.origin}${basePath}?classroomId=${encodeURIComponent(inviteCodeOrId)}`;
  }

  static showNotice(id, message, type = "success") {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = message;
    element.className = `notice ${type}`;
  }

  static showToast(message, type = "success") {
    if (window.UI?.showToast) {
      window.UI.showToast(message, type);
      return;
    }
    const toast = document.createElement("div");
    toast.className = `classroom-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.classList.add("is-visible"), 20);
    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 220);
    }, 2600);
    console.info(`[Digital Classroom] ${message}`);
  }
}

window.ClassroomUI = ClassroomUI;
