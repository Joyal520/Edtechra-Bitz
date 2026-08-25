class ClassroomState {
  static STORAGE_KEY = "edtechra_dc_data";

  static requiredCollections = [
    "classrooms",
    "students",
    "assignments",
    "submissions",
    "spreeItemProgress",
    "contentItems",
    "classroomMessages",
    "aiFeedbackLogs"
  ];

  static init() {
    const existing = localStorage.getItem(this.STORAGE_KEY);

    if (!existing) {
      this.saveData(this.clone(MOCK_DATA));
      return;
    }

    try {
      const parsed = JSON.parse(existing);
      this.saveData(this.migrate(parsed));
    } catch (error) {
      console.warn("Digital Classroom localStorage was reset because saved data was invalid.", error);
      this.saveData(this.clone(MOCK_DATA));
    }
  }

  static getData() {
    this.init();
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY));
  }

  static saveData(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  static update(mutator) {
    const data = this.getData();
    const result = mutator(data);
    this.saveData(data);
    return result;
  }

  static migrate(data) {
    const next = { ...this.clone(MOCK_DATA), ...data, version: MOCK_DATA.version };

    this.requiredCollections.forEach((collection) => {
      if (!Array.isArray(next[collection])) {
        next[collection] = this.clone(MOCK_DATA[collection] || []);
      }
    });

    next.classrooms = next.classrooms.map((classroom) => ({
      bucketItems: [],
      createdAt: new Date().toISOString(),
      ...classroom
    }));

    next.assignments = next.assignments.map((assignment) => {
      const completedBy = Array.isArray(assignment.completedBy) ? assignment.completedBy : [];
      const migrated = {
        instructions: "",
        createdAt: new Date().toISOString(),
        ...assignment
      };
      delete migrated.completedBy;

      completedBy.forEach((studentId) => {
        const hasSubmission = next.submissions.some(
          (submission) => submission.assignmentId === assignment.id && submission.studentId === studentId
        );

        if (!hasSubmission) {
          next.submissions.push({
            id: this.createId("sub"),
            assignmentId: assignment.id,
            classroomId: assignment.classroomId,
            studentId,
            status: "submitted",
            pointsAwarded: Number(assignment.points) || 0,
            submittedAt: new Date().toISOString(),
            note: "Migrated placeholder submission"
          });
        }
      });

      return migrated;
    });

    return next;
  }

  static createId(prefix) {
    if (window.crypto && crypto.randomUUID) {
      return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
    }

    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  static clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
}

window.ClassroomState = ClassroomState;
