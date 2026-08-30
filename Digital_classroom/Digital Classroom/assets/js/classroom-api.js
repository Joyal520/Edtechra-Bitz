const ClassroomLocalStore = {
  getClassrooms() {
    return ClassroomState.getData().classrooms;
  },

  getClassroomById(id) {
    return ClassroomState.getData().classrooms.find((classroom) => classroom.id === id) || null;
  },

  createClassroom(classroomData) {
    return ClassroomState.update((data) => {
      const classroom = {
        id: ClassroomState.createId("class"),
        name: classroomData.name.trim(),
        subject: classroomData.subject.trim(),
        grade: classroomData.grade.trim(),
        description: classroomData.description.trim(),
        theme: classroomData.theme || "theme-blue",
        bucketItems: [],
        createdAt: new Date().toISOString()
      };

      data.classrooms.unshift(classroom);
      return classroom;
    });
  },

  getStudentsByClassroom(classroomId) {
    const data = ClassroomState.getData();
    return data.students
      .filter((student) => student.classroomId === classroomId)
      .map((student) => ({
        ...student,
        completedAssignments: data.submissions.filter((submission) => submission.studentId === student.id).length
      }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  },

  removeStudentFromClassroom(classroomId, studentId) {
    return ClassroomState.update((data) => {
      data.students = data.students.filter((student) => (
        student.classroomId !== classroomId ||
        ![student.id, student.profileId, student.memberId].filter(Boolean).includes(studentId)
      ));
      return { success: true };
    });
  },

  joinClassroom(classroomId, studentName) {
    return ClassroomState.update((data) => {
      const classroom = data.classrooms.find((item) => item.id === classroomId);
      if (!classroom) {
        throw new Error("Classroom not found.");
      }

      const normalizedName = studentName.trim();
      const existing = data.students.find(
        (student) => student.classroomId === classroomId && student.name.toLowerCase() === normalizedName.toLowerCase()
      );

      if (existing) {
        return existing;
      }

      const student = {
        id: ClassroomState.createId("stu"),
        classroomId,
        name: normalizedName,
        points: 0,
        avatar: normalizedName.charAt(0).toUpperCase(),
        joinedAt: new Date().toISOString()
      };

      data.students.push(student);
      return student;
    });
  },

  getAssignmentsByClassroom(classroomId) {
    return ClassroomState.getData()
      .assignments.filter((assignment) => (
        assignment.classroomId === classroomId &&
        !assignment.isDeleted &&
        !assignment.deletedAt &&
        !["deleted", "archived"].includes(String(assignment.status || "").toLowerCase())
      ))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  },

  deleteAssignment(classroomId, assignmentId) {
    return ClassroomState.update((data) => {
      const assignment = data.assignments.find((item) => item.classroomId === classroomId && item.id === assignmentId);
      if (!assignment) return { success: false };
      assignment.status = "deleted";
      assignment.isDeleted = true;
      assignment.deletedAt = new Date().toISOString();
      assignment.updatedAt = assignment.deletedAt;
      return { success: true, mode: "soft-delete", row: assignment };
    });
  },

  createAssignment(assignmentData) {
    return ClassroomState.update((data) => {
      const assignment = {
        id: ClassroomState.createId("ass"),
        classroomId: assignmentData.classroomId,
        title: assignmentData.title.trim(),
        instructions: (assignmentData.instructions || "").trim(),
        dueDate: assignmentData.dueDate,
        points: Number(assignmentData.points),
        assignmentType: assignmentData.assignmentType || "assignment",
        resourceItems: Array.isArray(assignmentData.resourceItems) ? assignmentData.resourceItems : [],
        resourceId: assignmentData.resourceId || (assignmentData.resourceItems?.[0]?.resourceId) || null,
        resourceTitle: assignmentData.resourceTitle || (assignmentData.resourceItems?.[0]?.title) || "",
        resourceUrl: assignmentData.resourceUrl || (assignmentData.resourceItems?.[0]?.resourceUrl) || "",
        fileUrl: assignmentData.fileUrl || (assignmentData.resourceItems?.[0]?.fileUrl) || "",
        unlockMode: assignmentData.unlockMode || "open_access",
        startDate: assignmentData.startDate || "",
        timezone: assignmentData.timezone || "Asia/Colombo",
        status: assignmentData.status || "published",
        createdAt: new Date().toISOString()
      };

      data.assignments.unshift(assignment);
      return assignment;
    });
  },

  getSubmissionsByClassroom(classroomId) {
    return ClassroomState.getData().submissions.filter((submission) => submission.classroomId === classroomId);
  },

  getSubmission(assignmentId, studentId) {
    return (
      ClassroomState.getData().submissions.find(
        (submission) => submission.assignmentId === assignmentId && submission.studentId === studentId
      ) || null
    );
  },

  getSpreeItemProgress(assignmentId, studentId) {
    return ClassroomState.getData().spreeItemProgress.filter(
      (row) => row.assignmentId === assignmentId && row.studentId === studentId
    );
  },

  upsertSpreeItemProgress(progressData) {
    return ClassroomState.update((data) => {
      const now = new Date().toISOString();
      const existing = data.spreeItemProgress.find((row) => (
        row.assignmentId === progressData.assignmentId &&
        row.spreeItemId === progressData.spreeItemId &&
        row.studentId === progressData.studentId
      ));

      if (existing) {
        existing.status = progressData.status || existing.status;
        existing.openedAt = progressData.openedAt || existing.openedAt || "";
        existing.completedAt = progressData.completedAt || existing.completedAt || "";
        existing.updatedAt = now;
        return existing;
      }

      const row = {
        id: ClassroomState.createId("spree_prog"),
        assignmentId: progressData.assignmentId,
        spreeItemId: progressData.spreeItemId,
        resourceId: progressData.resourceId,
        studentId: progressData.studentId,
        classroomId: progressData.classroomId,
        status: progressData.status || "not_started",
        openedAt: progressData.openedAt || "",
        completedAt: progressData.completedAt || "",
        updatedAt: now,
        createdAt: now
      };
      data.spreeItemProgress.push(row);
      return row;
    });
  },

  submitAssignment(assignmentId, studentId) {
    return ClassroomState.update((data) => {
      const assignment = data.assignments.find((item) => item.id === assignmentId);
      const student = data.students.find((item) => item.id === studentId);

      if (!assignment || !student) {
        throw new Error("Assignment or student not found.");
      }

      const existing = data.submissions.find(
        (submission) => submission.assignmentId === assignmentId && submission.studentId === studentId
      );

      if (existing) {
        return existing;
      }

      const submission = {
        id: ClassroomState.createId("sub"),
        assignmentId,
        classroomId: assignment.classroomId,
        studentId,
        status: "submitted",
        pointsAwarded: Number(assignment.points) || 0,
        submittedAt: new Date().toISOString(),
        note: "Placeholder submission"
      };

      data.submissions.push(submission);
      student.points = Number(student.points || 0) + submission.pointsAwarded;
      return submission;
    });
  },

  getContentItems() {
    return ClassroomState.getData().contentItems;
  },

  addContentToClassroom(classroomId, contentId) {
    return ClassroomState.update((data) => {
      const classroom = data.classrooms.find((item) => item.id === classroomId);
      if (!classroom) {
        throw new Error("Classroom not found.");
      }

      classroom.bucketItems = Array.isArray(classroom.bucketItems) ? classroom.bucketItems : [];
      if (!classroom.bucketItems.includes(contentId)) {
        classroom.bucketItems.push(contentId);
      }

      return classroom;
    });
  },

  removeContentFromClassroom(classroomId, contentId) {
    return ClassroomState.update((data) => {
      const classroom = data.classrooms.find((item) => item.id === classroomId);
      if (!classroom) {
        throw new Error("Classroom not found.");
      }

      classroom.bucketItems = (classroom.bucketItems || []).filter((item) => item !== contentId);
      return classroom;
    });
  },

  getClassroomContent(classroomId) {
    const data = ClassroomState.getData();
    const classroom = data.classrooms.find((item) => item.id === classroomId);
    const bucketIds = classroom?.bucketItems || [];
    return data.contentItems.filter((item) => bucketIds.includes(item.id));
  },

  generateAiFeedback(classroomId) {
    return ClassroomState.update((data) => {
      const classroom = data.classrooms.find((item) => item.id === classroomId);
      if (!classroom) {
        throw new Error("Classroom not found.");
      }

      const students = data.students.filter((student) => student.classroomId === classroomId);
      const assignments = data.assignments.filter((assignment) => assignment.classroomId === classroomId);
      const submissions = data.submissions.filter((submission) => submission.classroomId === classroomId);
      const possibleSubmissions = Math.max(students.length * assignments.length, 1);
      const completionRate = Math.round((submissions.length / possibleSubmissions) * 100);
      const totalPoints = students.reduce((sum, student) => sum + Number(student.points || 0), 0);
      const averagePoints = students.length ? Math.round(totalPoints / students.length) : 0;

      const feedback = {
        id: ClassroomState.createId("ai"),
        classroomId,
        generatedAt: new Date().toISOString(),
        summary: `Mock AI feedback: ${classroom.name} has ${students.length} joined student(s), ${completionRate}% assignment completion, and an average of ${averagePoints} points.`,
        recommendations: [
          completionRate < 50
            ? "Send a reminder and consider breaking the next task into smaller checkpoints."
            : "Completion is moving well. Add one extension activity for high-scoring students.",
          students.length === 0
            ? "Share the WhatsApp invite link before assigning graded work."
            : "Review the leaderboard for students who may need encouragement.",
          assignments.length === 0
            ? "Create the first assignment to activate student progress tracking."
            : "Use bucket content as revision material before the next due date."
        ]
      };

      data.aiFeedbackLogs.unshift(feedback);
      return feedback;
    });
  },

  getLatestAiFeedback(classroomId) {
    return (
      ClassroomState.getData().aiFeedbackLogs.find((feedback) => feedback.classroomId === classroomId) || null
    );
  },

  getJoinedClassrooms() {
    const data = ClassroomState.getData();
    const joinedIds = new Set(data.students.map((student) => student.classroomId));
    return data.classrooms
      .filter((classroom) => joinedIds.has(classroom.id))
      .map((classroom) => ({
        ...classroom,
        teacherName: "Teacher",
        joinedAt: data.students.find((student) => student.classroomId === classroom.id)?.joinedAt || classroom.createdAt,
        taskCount: data.assignments.filter((assignment) => assignment.classroomId === classroom.id).length,
        unreadCount: 0
      }));
  },

  getStudentMembership(classroomId) {
    return null;
  },

  getClassroomInvite(inviteCodeOrId) {
    const classroom = this.getClassroomById(inviteCodeOrId) ||
      this.getClassrooms().find((item) => item.inviteCode === inviteCodeOrId);
    return classroom ? { classroom, alreadyJoined: false, membership: null, studentProfile: null } : null;
  },

  getStudentMembership(classroomId) {
    const studentId = sessionStorage.getItem(`edtechra_student_${classroomId}`);
    if (!studentId) return null;
    return this.getStudentsByClassroom(classroomId).find((student) => student.id === studentId) || null;
  },

  getTeacherDashboardData() {
    const classrooms = this.getClassrooms();
    const data = ClassroomState.getData();
    const studentIds = new Set();
    let totalAssignments = 0;
    let totalSubmissions = 0;
    const leaderboardRows = [];
    const assignmentRows = [];

    const enrichedClassrooms = classrooms.map((classroom) => {
      const students = this.getStudentsByClassroom(classroom.id);
      const assignments = this.getAssignmentsByClassroom(classroom.id);
      const submissions = this.getSubmissionsByClassroom(classroom.id);

      students.forEach((student) => {
        if (student.profileId || student.id) {
          studentIds.add(student.profileId || student.id);
        }
      });
      totalAssignments += assignments.length;
      totalSubmissions += submissions.length;
      leaderboardRows.push(...students.map((student) => ({ ...student, classroomName: classroom.name })));
      assignmentRows.push(...assignments.map((assignment) => ({ ...assignment, classroomName: classroom.name })));

      return {
        ...classroom,
        studentCount: students.length,
        assignmentCount: assignments.length
      };
    });

    return {
      source: "local",
      classrooms,
      enrichedClassrooms,
      contentItems: data.contentItems || [],
      leaderboardRows,
      assignmentRows,
      teacherProfile: null,
      stats: {
        classroomCount: classrooms.length,
        studentCount: studentIds.size,
        assignmentCount: totalAssignments,
        submissionCount: totalSubmissions
      }
    };
  },

  getMessagesByClassroom(classroomId) {
    const now = new Date();
    return ClassroomState.getData().classroomMessages
      .filter((message) => (
        message.classroomId === classroomId &&
        message.isDeleted !== true &&
        (!message.expiresAt || new Date(message.expiresAt) > now)
      ))
      .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) || new Date(b.createdAt) - new Date(a.createdAt));
  },

  createMessage(classroomId, messageText, teacherId = "local-teacher") {
    return ClassroomState.update((data) => {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      const message = {
        id: ClassroomState.createId("msg"),
        classroomId,
        teacherId,
        message: messageText.trim(),
        isPinned: false,
        isDeleted: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        editedAt: "",
        deletedAt: "",
        expiresAt: expiresAt.toISOString()
      };
      data.classroomMessages.unshift(message);
      return message;
    });
  },

  updateMessage(messageId, messageText) {
    return ClassroomState.update((data) => {
      const message = data.classroomMessages.find((item) => item.id === messageId);
      if (!message || message.isDeleted) return null;
      const now = new Date().toISOString();
      message.message = messageText.trim();
      message.updatedAt = now;
      message.editedAt = now;
      return message;
    });
  },

  deleteMessage(messageId) {
    return ClassroomState.update((data) => {
      const message = data.classroomMessages.find((item) => item.id === messageId);
      if (!message || message.isDeleted) return null;
      const now = new Date().toISOString();
      message.isDeleted = true;
      message.deletedAt = now;
      message.updatedAt = now;
      return message;
    });
  },

  getTeachingResources() {
    const data = ClassroomState.getData();
    return (data.teachingResources || []).map((res) => ({
      ...res,
      formattedSize: ClassroomAPI.formatFileSize(res.fileSize || 0)
    }));
  },

  createTeachingResource(resourceData) {
    return ClassroomState.update((data) => {
      const resource = {
        id: ClassroomState.createId("res"),
        title: (resourceData.title || resourceData.name || "Untitled Resource").trim(),
        originalFilename: resourceData.originalFilename || resourceData.filename || `${(resourceData.title || "resource").toLowerCase().replace(/\s+/g, "_")}.pdf`,
        fileUrl: resourceData.fileUrl || "",
        filePath: resourceData.filePath || "",
        fileSize: Number(resourceData.fileSize || resourceData.size || 0),
        fileType: resourceData.fileType || "pdf",
        mimeType: resourceData.mimeType || resourceData.contentType || "application/pdf",
        category: resourceData.category || "General",
        resourceType: resourceData.resourceType || "PDF",
        description: (resourceData.description || "").trim(),
        createdAt: new Date().toISOString()
      };
      if (!Array.isArray(data.teachingResources)) {
        data.teachingResources = [];
      }
      data.teachingResources.unshift(resource);
      return resource;
    });
  },

  getTeacherCloudMaterials(classroomId = "") {
    const data = ClassroomState.getData();
    const resources = data.teachingResources || [];
    const assignments = classroomId
      ? data.assignments.filter((a) => a.classroomId === classroomId && !a.isDeleted && !a.deletedAt)
      : [];

    return resources.map((resource) => {
      const isAssigned = assignments.some((a) => {
        if (a.resourceId === resource.id) return true;
        if (Array.isArray(a.resourceItems)) {
          return a.resourceItems.some((item) => item.resourceId === resource.id || item.id === resource.id);
        }
        return false;
      });

      return {
        ...resource,
        formattedSize: ClassroomAPI.formatFileSize(resource.fileSize || 0),
        isAssigned
      };
    });
  },

  getTeacherStorageUsage() {
    const data = ClassroomState.getData();
    const resources = data.teachingResources || [];
    const usedBytes = resources.reduce((sum, item) => sum + Number(item.fileSize || 0), 0);
    const maxBytes = 500 * 1024 * 1024;
    const remainingBytes = Math.max(0, maxBytes - usedBytes);
    const usedMb = Number((usedBytes / (1024 * 1024)).toFixed(1));
    const maxMb = 500;
    const remainingMb = Number((remainingBytes / (1024 * 1024)).toFixed(1));
    const percentage = Math.min(100, Math.round((usedBytes / maxBytes) * 100));

    return {
      usedBytes,
      maxBytes,
      usedMb,
      maxMb,
      remainingBytes,
      remainingMb,
      percentage,
      fileCount: resources.length
    };
  },

  findMatchingCloudMaterial({ filename, size }) {
    const data = ClassroomState.getData();
    const resources = data.teachingResources || [];
    const targetName = String(filename || "").trim().toLowerCase();
    const targetSize = Number(size) || 0;

    return resources.find((res) => {
      const resFilename = String(res.originalFilename || "").trim().toLowerCase();
      const resTitle = String(res.title || "").trim().toLowerCase();
      if (targetName && (resFilename === targetName || `${resTitle}.pdf` === targetName)) {
        return true;
      }
      if (targetSize > 0 && res.fileSize === targetSize && targetName && resFilename.endsWith(targetName.split(".").pop() || "")) {
        return true;
      }
      return false;
    }) || null;
  },

  isMaterialAssignedToClass(resourceId, classroomId) {
    if (!resourceId || !classroomId) return false;
    const data = ClassroomState.getData();
    const assignments = data.assignments.filter((a) => a.classroomId === classroomId && !a.isDeleted && !a.deletedAt);
    return assignments.some((a) => {
      if (a.resourceId === resourceId) return true;
      if (Array.isArray(a.resourceItems)) {
        return a.resourceItems.some((item) => item.resourceId === resourceId || item.id === resourceId);
      }
      return false;
    });
  },

  assignCloudMaterialsToClassroom({ classroomId, resourceIds = [], title, instructions = "", dueDate, points = 100 }) {
    const data = ClassroomState.getData();
    const resources = data.teachingResources || [];
    const selected = resourceIds.map((id) => resources.find((r) => r.id === id)).filter(Boolean);

    if (!selected.length) {
      throw new Error("No materials selected to assign.");
    }

    const createdAssignments = [];
    selected.forEach((res, index) => {
      const assignmentTitle = selected.length === 1 ? (title || res.title) : (title ? `${title}: ${res.title}` : res.title);
      const resUrl = res.fileUrl || "";
      const assignment = ClassroomLocalStore.createAssignment({
        classroomId,
        title: assignmentTitle,
        instructions: instructions || res.description || "",
        dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        points: Number(points) || 100,
        assignmentType: "assignment",
        resourceItems: [{
          id: `${res.id}:${index + 1}`,
          resourceId: res.id,
          title: res.title,
          resourceType: res.resourceType || "PDF",
          fileUrl: resUrl,
          resourceUrl: resUrl,
          previewUrl: res.previewUrl || resUrl,
          fileSize: res.fileSize || 0,
          originalFilename: res.originalFilename || ""
        }],
        resourceId: res.id,
        resourceTitle: res.title,
        resourceUrl: resUrl,
        fileUrl: resUrl,
        status: "published"
      });
      createdAssignments.push(assignment);
    });

    return createdAssignments;
  }
};

const ClassroomSupabaseStore = {
  // TODO: The Creator Hub already owns public.submissions. Classroom work uses assignment_submissions instead.
  TABLES: {
    classrooms: "classrooms",
    classroomMembers: "classroom_members",
    classroomInvites: "classroom_invites",
    assignments: "assignments",
    assignmentSubmissions: "assignment_submissions",
    spreeItemProgress: "learning_spree_item_progress",
    submissions: "submissions",
    bookmarks: "bookmarks",
    contentBuckets: "content_buckets",
    bucketItems: "bucket_items",
    activitySubmissions: "activity_submissions",
    classroomPoints: "classroom_points",
    aiFeedbackLogs: "ai_feedback_logs",
    classroomMessages: "classroom_messages",
    exams: "exams",
    examResults: "exam_results"
  },

  featureCache: {},
  schemaCache: {},
  MODE_KEY: "edtechra_dc_mode",
  RETURN_URL_KEY: "edtechra_dc_return_url",
  DEBUG: true,

  debug(message, payload) {
    if (!this.DEBUG) return;
    if (payload === undefined) {
      console.info(`[Digital Classroom] ${message}`);
      return;
    }
    console.info(`[Digital Classroom] ${message}`, payload);
  },

  getConnectionStatus() {
    const status = window.DigitalClassroomSupabase?.getStatus?.() || {
      configured: false,
      available: false,
      reason: "Supabase client helper is not loaded."
    };
    return {
      ...status,
      selectedMode: this.getMode()
    };
  },

  getMode() {
    return sessionStorage.getItem(this.MODE_KEY) === "demo" ? "demo" : "supabase";
  },

  useDemoMode() {
    sessionStorage.setItem(this.MODE_KEY, "demo");
    this.debug("Selected mode", "demo");
  },

  useSupabaseMode() {
    sessionStorage.removeItem(this.MODE_KEY);
    this.debug("Selected mode", "supabase");
  },

  isDemoMode() {
    return this.getMode() === "demo";
  },

  storeReturnUrl(url = window.location.href) {
    localStorage.setItem(this.RETURN_URL_KEY, url);
  },

  getLoginUrl(returnUrl = window.location.href) {
    const configuredUrl = String(
      window.EDTECHRA_DC_ENV?.LOGIN_URL ||
      window.__DIGITAL_CLASSROOM_ENV__?.LOGIN_URL ||
      window.EDTECHRA_ENV?.LOGIN_URL ||
      window.__EDTECHRA_ENV__?.LOGIN_URL ||
      ""
    ).trim();

    if (configuredUrl) {
      const separator = configuredUrl.includes("?") ? "&" : "?";
      return `${configuredUrl}${separator}returnTo=${encodeURIComponent(returnUrl)}`;
    }

    return `${window.location.origin}/?returnTo=${encodeURIComponent(returnUrl)}#login`;
  },

  async getContext({ requireAuth = false } = {}) {
    if (this.isDemoMode()) {
      this.debug("Selected mode", "demo");
      return {
        enabled: false,
        fallbackAllowed: true,
        reason: "Demo mode selected."
      };
    }

    const status = this.getConnectionStatus();
    this.debug("Supabase connection state", status);
    if (!status.available) {
      this.debug("Fallback activation reason", status.reason || "Supabase is not configured.");
      return {
        enabled: false,
        fallbackAllowed: true,
        reason: status.reason || "Supabase is not configured."
      };
    }

    const client = window.DigitalClassroomSupabase.getClient();
    const user = await window.DigitalClassroomSupabase.getUser().catch(() => null);
    const profile = user
      ? await window.DigitalClassroomSupabase.getProfile(user.id).catch(() => null)
      : null;

    if (requireAuth && !user) {
      this.debug("Auth state", { authenticated: false, reason: "No active Edtechra session." });
      return {
        enabled: false,
        fallbackAllowed: false,
        reason: "No active Edtechra session."
      };
    }

    this.debug("Auth state", {
      authenticated: Boolean(user),
      userId: user?.id || null,
      role: profile?.role || null
    });

    return {
      enabled: true,
      client,
      user,
      profile,
      status
    };
  },

  shouldFallback(error) {
    const message = this.getErrorMessage(error).toLowerCase();
    const code = String(error?.code || "").toLowerCase();

    return (
      code === "42p01" ||
      code === "pgrst205" ||
      message.includes("does not exist") ||
      message.includes("could not find the table")
    );
  },

  getErrorMessage(error) {
    if (!error) return "Unknown Supabase error";
    return error.message || error.details || error.hint || String(error);
  },

  getMissingColumn(error) {
    const message = this.getErrorMessage(error);
    const patterns = [
      /Could not find the '([^']+)' column/i,
      /column submissions\.([a-zA-Z0-9_]+) does not exist/i,
      /column [a-zA-Z0-9_]+\.([a-zA-Z0-9_]+) does not exist/i,
      /column "([^"]+)" of relation "submissions" does not exist/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match?.[1]) return match[1];
    }

    return "";
  },

  createUnavailableFeatureError(feature, error = null) {
    const table = this.TABLES[feature] || feature;
    const message = error
      ? `Supabase table "${table}" is unavailable: ${this.getErrorMessage(error)}`
      : `Supabase table "${table}" is unavailable.`;
    const nextError = new Error(message);
    nextError.code = "DIGITAL_CLASSROOM_SCHEMA_MISSING";
    nextError.feature = feature;
    nextError.table = table;
    nextError.cause = error || null;
    return nextError;
  },

  isSchemaMissingError(error) {
    return error?.code === "DIGITAL_CLASSROOM_SCHEMA_MISSING" || this.shouldFallback(error);
  },

  isRlsError(error) {
    const message = this.getErrorMessage(error).toLowerCase();
    const code = String(error?.code || "").toLowerCase();
    return code === "42501" || message.includes("row-level security") || message.includes("permission denied");
  },

  async withFallback(feature, remoteWork, localWork, options = {}) {
    const context = await this.getContext({ requireAuth: options.requireAuth });
    if (!context.enabled) {
      if (context.fallbackAllowed === false) {
        throw new Error(context.reason || "Supabase authentication is required.");
      }
      this.debug(`Using local fallback for ${feature}`, { reason: context.reason || "Supabase unavailable." });
      return localWork();
    }

    try {
      if (!(await this.isFeatureReady(context.client, feature))) {
        throw this.createUnavailableFeatureError(feature);
      }

      this.debug(`Running Supabase path for ${feature}`);
      return await remoteWork(context);
    } catch (error) {
      if (this.isSchemaMissingError(error)) {
        console.warn(`[Digital Classroom] Supabase schema issue for ${feature}. Local mock fallback was not used because Supabase is available.`, this.getErrorMessage(error));
        throw error;
      }

      if (this.isRlsError(error)) {
        console.warn(`[Digital Classroom] Supabase RLS/permission issue for ${feature}.`, this.getErrorMessage(error));
      }

      throw error;
    }
  },

  async isFeatureReady(client, feature) {
    if (this.featureCache[feature] !== undefined) {
      return this.featureCache[feature];
    }

    const table = this.TABLES[feature];
    if (!table) {
      this.featureCache[feature] = false;
      return false;
    }

    const { error } = await client.from(table).select("id").limit(1);
    if (error) {
      if (this.shouldFallback(error)) {
        this.featureCache[feature] = false;
        return false;
      }
      throw error;
    }

    this.featureCache[feature] = true;
    return true;
  },

  async assertFeaturesReady(client, features) {
    const missing = [];

    for (const feature of features) {
      if (!(await this.isFeatureReady(client, feature))) {
        missing.push(this.TABLES[feature] || feature);
      }
    }

    if (missing.length) {
      const error = new Error(`Missing Digital Classroom Supabase table(s): ${missing.join(", ")}`);
      error.code = "DIGITAL_CLASSROOM_SCHEMA_MISSING";
      error.tables = missing;
      throw error;
    }
  },

  async detectClassroomTitleColumn(client) {
    if (this.schemaCache.classroomTitleColumn) {
      return this.schemaCache.classroomTitleColumn;
    }

    const checks = [
      { column: "title", query: () => client.from(this.TABLES.classrooms).select("id, title").limit(1) },
      { column: "name", query: () => client.from(this.TABLES.classrooms).select("id, name").limit(1) }
    ];

    for (const check of checks) {
      const { error } = await check.query();
      if (!error) {
        this.schemaCache.classroomTitleColumn = check.column;
        this.debug("Detected classroom title column", check.column);
        return check.column;
      }

      if (!this.shouldFallback(error) && !String(error?.message || "").toLowerCase().includes("column")) {
        throw error;
      }
    }

    this.schemaCache.classroomTitleColumn = "title";
    return this.schemaCache.classroomTitleColumn;
  },

  async detectInviteCodeColumn(client) {
    if (this.schemaCache.inviteCodeColumn !== undefined) {
      return this.schemaCache.inviteCodeColumn;
    }

    const candidates = ["invite_code", "invite_token"];
    for (const column of candidates) {
      const { error } = await client
        .from(this.TABLES.classrooms)
        .select(`id, ${column}`)
        .limit(1);
      if (!error) {
        this.schemaCache.inviteCodeColumn = column;
        this.debug("Detected invite code column on classrooms table", column);
        return column;
      }
    }

    this.schemaCache.inviteCodeColumn = null;
    this.debug("No invite code column found on classrooms table");
    return null;
  },

  async insertClassroomRow(client, payload) {
    const titleColumn = await this.detectClassroomTitleColumn(client);
    const insertPayload = {
      teacher_id: payload.teacher_id,
      subject: payload.subject,
      grade: payload.grade,
      description: payload.description,
      updated_at: new Date().toISOString()
    };

    insertPayload[titleColumn] = payload.title;

    let result = await client
      .from(this.TABLES.classrooms)
      .insert(insertPayload)
      .select("*")
      .single();

    if (!result.error) {
      return result;
    }

    const missingUpdatedAt = String(result.error?.message || "").toLowerCase().includes("updated_at");
    if (missingUpdatedAt) {
      const retryPayload = { ...insertPayload };
      delete retryPayload.updated_at;
      result = await client
        .from(this.TABLES.classrooms)
        .insert(retryPayload)
        .select("*")
        .single();
      if (!result.error) {
        return result;
      }
    }

    if (titleColumn === "title" && String(result.error?.message || "").toLowerCase().includes("title")) {
      this.schemaCache.classroomTitleColumn = "name";
      const legacyPayload = {
        teacher_id: payload.teacher_id,
        name: payload.title,
        subject: payload.subject,
        grade: payload.grade,
        description: payload.description
      };

      return client
        .from(this.TABLES.classrooms)
        .insert(legacyPayload)
        .select("*")
        .single();
    }

    return result;
  },

  normalizeClassroom(row) {
    return {
      id: row.id,
      name: row.title || row.name || "",
      subject: row.subject || "",
      grade: row.grade || row.grade_level || "",
      description: row.description || "",
      theme: row.theme || "theme-blue",
      inviteCode: row.invite_code || row.invite_token || row.id,
      teacherId: row.teacher_id || row.teacherId || null,
      teacherName: row.teacher_name || row.teacherName || "",
      bucketItems: [],
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || row.created_at || row.createdAt || new Date().toISOString()
    };
  },

  cleanEmailName(value = "") {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      return text.split("@")[0].replace(/[._-]+/g, " ").trim() || "";
    }
    return text;
  },

  getStudentDisplayName(student = {}) {
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
  },

  normalizeAssignment(row) {
    const metadata = this.parseAssignmentMetadata(row.instructions || "");
    const rawResourceItems = Array.isArray(row.resource_items)
      ? row.resource_items
      : Array.isArray(row.resourceItems)
        ? row.resourceItems
        : metadata.resourceItems || [];
    const assignmentMetadata = this.parseJsonObject(row.metadata);
    return {
      id: row.id,
      classroomId: row.classroom_id || row.classroomId,
      title: row.title || "",
      instructions: metadata.instructions || row.instructions || "",
      dueDate: row.due_date || row.dueDate || "",
      points: Number(row.points || 0),
      assignmentType: row.assignment_type || row.assignmentType || metadata.assignmentType || "assignment",
      resourceItems: rawResourceItems
        .map((item, index) => ({
          id: item.id || `${row.id || "assignment"}_${index + 1}`,
          resourceId: item.resource_id || item.resourceId || item.id || "",
          title: item.title_snapshot || item.title || "Saved material",
          resourceType: item.resource_type || item.resourceType || item.type || "saved work",
          savedAt: item.saved_at || item.savedAt || "",
          authorName: item.author_name || item.authorName || "",
          fileUrl: item.file_url || item.fileUrl || item.resource_url || item.resourceUrl || "",
          resourceUrl: item.resource_url || item.resourceUrl || item.file_url || item.fileUrl || "",
          projectUrl: item.project_url || item.projectUrl || "",
          previewUrl: item.preview_url || item.previewUrl || item.metadata?.previewUrl || item.metadata?.indexUrl || "",
          metadata: this.parseJsonObject(item.metadata),
          position: Number(item.position || index + 1)
        }))
        .sort((a, b) => a.position - b.position),
      resourceId: row.resource_id || row.resourceId || metadata.resourceId || assignmentMetadata.resourceId || "",
      resourceTitle: row.resource_title || row.resourceTitle || metadata.resourceTitle || assignmentMetadata.resourceTitle || "",
      resourceUrl: row.resource_url || row.resourceUrl || metadata.resourceUrl || assignmentMetadata.resourceUrl || "",
      projectUrl: row.project_url || row.projectUrl || metadata.projectUrl || assignmentMetadata.projectUrl || "",
      previewUrl: row.preview_url || row.previewUrl || metadata.previewUrl || assignmentMetadata.previewUrl || "",
      fileUrl: row.file_url || row.fileUrl || metadata.fileUrl || assignmentMetadata.fileUrl || "",
      metadata: assignmentMetadata,
      unlockMode: row.unlock_mode || row.unlockMode || metadata.unlockMode || "open_access",
      startDate: row.start_date || row.startDate || metadata.startDate || "",
      timezone: row.timezone || metadata.timezone || "Asia/Colombo",
      status: row.status || row.assignmentStatus || "published",
      isDeleted: row.is_deleted === true || row.isDeleted === true,
      deletedAt: row.deleted_at || row.deletedAt || "",
      sourceType: row.source_type || row.sourceType || "assignment",
      sourceTable: row.source_table || row.sourceTable || this.TABLES.assignments,
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || row.created_at || row.createdAt || new Date().toISOString()
    };
  },

  normalizeClassroomMessage(row) {
    return {
      id: row.id,
      classroomId: row.classroom_id || row.classroomId,
      teacherId: row.teacher_id || row.teacherId,
      message: row.message || row.text || "",
      isPinned: row.is_pinned === true || row.isPinned === true,
      isDeleted: row.is_deleted === true || row.isDeleted === true,
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || row.created_at || row.createdAt || new Date().toISOString(),
      editedAt: row.edited_at || row.editedAt || "",
      deletedAt: row.deleted_at || row.deletedAt || "",
      expiresAt: row.expires_at || row.expiresAt || ""
    };
  },

  normalizeAssignmentSubmission(row = {}) {
    return {
      id: row.id,
      assignmentId: row.assignment_id || row.assignmentId,
      classroomId: row.classroom_id || row.classroomId,
      studentId: row.student_id || row.studentId,
      status: row.status || "submitted",
      pointsAwarded: Number(row.points_awarded || row.pointsAwarded || 0),
      progressPercent: Number(row.progress_percent || row.progressPercent || 0),
      score: Number(row.score || row.points_awarded || row.pointsAwarded || 0),
      completedDays: Array.isArray(row.completed_days) ? row.completed_days : [],
      submittedAt: row.submitted_at || row.submittedAt || "",
      updatedAt: row.updated_at || row.updatedAt || "",
      note: row.note || "",
      feedback: row.feedback || row.ai_feedback || row.teacher_feedback || row.feedback_text || "",
      feedbackSummary: row.feedback_summary || row.ai_feedback_summary || "",
      feedbackStatus: row.feedback_status || row.ai_feedback_status || ""
    };
  },

  isAssignmentVisible(assignment = {}) {
    return (
      assignment.isDeleted !== true &&
      !assignment.deletedAt &&
      !["deleted", "archived"].includes(String(assignment.status || "").toLowerCase())
    );
  },

  parseAssignmentMetadata(instructions = "") {
    const start = "[EDTECHRA_LEARNING_SPREE]";
    const end = "[/EDTECHRA_LEARNING_SPREE]";
    const text = String(instructions || "");
    const startIndex = text.indexOf(start);
    const endIndex = text.indexOf(end);
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      return { instructions: text };
    }

    const before = text.slice(0, startIndex).trim();
    const jsonText = text.slice(startIndex + start.length, endIndex).trim();
    try {
      const parsed = JSON.parse(jsonText);
      return {
        instructions: before,
        assignmentType: parsed.assignmentType || parsed.assignment_type,
        resourceItems: Array.isArray(parsed.resourceItems) ? parsed.resourceItems : [],
        resourceId: parsed.resourceId || parsed.resource_id || "",
        resourceTitle: parsed.resourceTitle || parsed.resource_title || "",
        resourceUrl: parsed.resourceUrl || parsed.resource_url || "",
        projectUrl: parsed.projectUrl || parsed.project_url || "",
        previewUrl: parsed.previewUrl || parsed.preview_url || "",
        fileUrl: parsed.fileUrl || parsed.file_url || "",
        unlockMode: parsed.unlockMode || parsed.unlock_mode,
        startDate: parsed.startDate || parsed.start_date,
        timezone: parsed.timezone
      };
    } catch (error) {
      console.warn("[Digital Classroom] Could not parse assignment metadata.", error);
      return { instructions: before || text };
    }
  },

  serializeAssignmentInstructions(assignmentData) {
    const instructions = String(assignmentData.instructions || "").trim();
    const hasStructuredMetadata = assignmentData.assignmentType === "learning_spree" || Array.isArray(assignmentData.resourceItems) && assignmentData.resourceItems.length;
    if (!hasStructuredMetadata) return instructions;

    const metadata = {
      assignmentType: assignmentData.assignmentType || "assignment",
      resourceItems: Array.isArray(assignmentData.resourceItems) ? assignmentData.resourceItems : [],
      resourceId: assignmentData.resourceId || "",
      resourceTitle: assignmentData.resourceTitle || "",
      resourceUrl: assignmentData.resourceUrl || "",
      projectUrl: assignmentData.projectUrl || "",
      previewUrl: assignmentData.previewUrl || "",
      fileUrl: assignmentData.fileUrl || "",
      unlockMode: assignmentData.unlockMode || "open_access",
      startDate: assignmentData.startDate || "",
      timezone: assignmentData.timezone || "Asia/Colombo"
    };
    return `${instructions}\n\n[EDTECHRA_LEARNING_SPREE]\n${JSON.stringify(metadata)}\n[/EDTECHRA_LEARNING_SPREE]`.trim();
  },

  normalizeTeachingResource(row) {
    const resourceType = row.resource_type || row.category || row.content_type || "PDF";
    const metadata = this.parseJsonObject(row.metadata);
    const downloadUrl = row.file_url || row.image_url || row.thumbnail_url || "";
    const previewUrl = this.resolveTeachingResourcePreviewUrl(row, metadata) || downloadUrl;
    const isWebProject = this.isWebProjectResource(row);
    const rawPath = String(row.file_path || "").trim();
    const originalFilename = metadata.originalFilename || metadata.original_filename || metadata.filename ||
      (rawPath ? rawPath.split("/").pop() : "") ||
      (downloadUrl ? downloadUrl.split("/").pop()?.split("?")[0] : "") ||
      `${row.title || "resource"}.pdf`;
    const fileSize = Number(row.file_size || metadata.file_size || metadata.size || 0);

    return {
      id: row.id,
      ownerId: row.owner_id || row.author_id || row.teacher_id || null,
      title: row.title || "Untitled resource",
      description: row.description || "",
      resourceType,
      category: row.category || resourceType,
      originalFilename,
      fileSize,
      formattedSize: ClassroomAPI.formatFileSize(fileSize),
      fileType: row.file_type || "pdf",
      mimeType: row.mime_type || metadata.contentType || "application/pdf",
      fileUrl: downloadUrl,
      downloadUrl,
      previewUrl,
      projectUrl: row.project_url || previewUrl || "",
      thumbnailUrl: row.thumbnail_url || row.image_url || "",
      isWebProject,
      visibility: row.visibility === "public" ? "public" : "private",
      status: row.status || "",
      isDeleted: row.is_deleted === true || row.isDeleted === true,
      deletedAt: row.deleted_at || row.deletedAt || "",
      sharedToPremium: row.shared_to_premium === true || row.sharedToPremium === true,
      premiumSharedAt: row.premium_shared_at || row.premiumSharedAt || "",
      premiumStatus: row.premium_status || row.premiumStatus || "",
      premiumLibraryCategory: row.premium_library_category || row.premiumLibraryCategory || "",
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString()
    };
  },

  parseJsonObject(value) {
    if (!value) return {};
    if (typeof value === "object" && !Array.isArray(value)) return value;
    if (typeof value !== "string") return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  },

  isWebProjectResource(row = {}) {
    const labels = [
      row.resource_type,
      row.resourceType,
      row.content_type,
      row.contentType,
      row.category
    ].map((value) => String(value || "").trim().toLowerCase());
    const fileType = String(row.file_type || row.mime_type || "").trim().toLowerCase();
    const fileRef = String(row.file_path || row.file_url || "").trim().toLowerCase();

    return (
      labels.some((label) => ["web_zip", "html", "website_project", "interactive_content", "project"].includes(label)) ||
      fileType.includes("zip") ||
      fileRef.endsWith(".zip") ||
      fileRef.includes("/uploads/web-zips/")
    );
  },

  deriveR2PublicBaseUrl(row = {}) {
    const fileUrl = String(row.file_url || "").trim();
    const filePath = String(row.file_path || "").trim().replace(/^\/+/, "");
    if (!/^https?:\/\//i.test(fileUrl) || !filePath) return "";

    try {
      const parsedUrl = new URL(fileUrl);
      const normalizedPath = `/${filePath.split("/").map(encodeURIComponent).join("/")}`;
      if (parsedUrl.pathname.endsWith(normalizedPath)) {
        parsedUrl.pathname = parsedUrl.pathname.slice(0, -normalizedPath.length).replace(/\/+$/, "");
        parsedUrl.search = "";
        parsedUrl.hash = "";
        return parsedUrl.toString().replace(/\/+$/, "");
      }
    } catch (_) {
      return "";
    }

    return "";
  },

  resolveTeachingResourcePreviewUrl(row = {}, metadata = {}) {
    const explicitCandidates = [
      row.project_url,
      row.preview_url,
      metadata.previewUrl,
      metadata.indexUrl,
      metadata.preview_url,
      metadata.index_url
    ].map((value) => String(value || "").trim()).filter(Boolean);

    for (const candidate of explicitCandidates) {
      if (/^https?:\/\//i.test(candidate)) return candidate;
    }

    if (!this.isWebProjectResource(row)) {
      return "";
    }

    const publicBaseUrl = this.deriveR2PublicBaseUrl(row);
    const authorId = String(row.author_id || "").trim();
    const submissionId = String(row.id || "").trim();
    if (!publicBaseUrl || !authorId || !submissionId) return "";

    return `${publicBaseUrl}/web-projects/${encodeURIComponent(authorId)}/${encodeURIComponent(submissionId)}/index.html`;
  },

  normalizeSavedCollection(row, bookmark = {}) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const resourceType = row.resource_type || row.content_type || row.category || "saved work";
    return {
      id: row.id,
      ownerId: row.author_id || row.user_id || row.created_by || null,
      title: row.title || "Untitled saved work",
      description: row.description || "",
      resourceType,
      category: row.category || resourceType,
      fileUrl: row.file_url || row.image_url || row.thumbnail_url || "",
      thumbnailUrl: row.thumbnail_url || row.image_url || "",
      authorName: profile?.display_name || row.author_name || "Creator",
      status: row.status || "",
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      savedAt: bookmark.created_at || row.created_at || new Date().toISOString()
    };
  },

  buildFeedback(classroom, students, assignments, submissions) {
    const possibleSubmissions = Math.max(students.length * assignments.length, 1);
    const completionRate = Math.round((submissions.length / possibleSubmissions) * 100);
    const totalPoints = students.reduce((sum, student) => sum + Number(student.points || 0), 0);
    const averagePoints = students.length ? Math.round(totalPoints / students.length) : 0;

    return {
      id: ClassroomState.createId("ai"),
      classroomId: classroom.id,
      generatedAt: new Date().toISOString(),
      summary: `Mock AI feedback: ${classroom.name} has ${students.length} joined student(s), ${completionRate}% assignment completion, and an average of ${averagePoints} points.`,
      recommendations: [
        completionRate < 50
          ? "Send a reminder and consider breaking the next task into smaller checkpoints."
          : "Completion is moving well. Add one extension activity for high-scoring students.",
        students.length === 0
          ? "Share the WhatsApp invite link before assigning graded work."
          : "Review the leaderboard for students who may need encouragement.",
        assignments.length === 0
          ? "Create the first assignment to activate student progress tracking."
          : "Use bucket content as revision material before the next due date."
      ]
    };
  },

  async loadProfileMap(client, profileIds) {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const ids = [...new Set(
      (profileIds || [])
        .map((id) => String(id || "").trim())
        .filter((id) => id && uuidPattern.test(id))
    )];
    if (!ids.length) {
      return new Map();
    }

    const { data, error } = await client
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);

    if (error) throw error;
    return new Map((data || []).map((row) => [row.id, row]));
  },

  async loadPointSummary(client, classroomId) {
    if (!(await this.isFeatureReady(client, "classroomPoints"))) {
      return new Map();
    }

    const { data, error } = await client
      .from(this.TABLES.classroomPoints)
      .select("student_id, profile_id, points")
      .eq("classroom_id", classroomId);

    if (error) throw error;

    const pointMap = new Map();
    (data || []).forEach((row) => {
      const points = Number(row.points || 0);
      const studentKeys = [...new Set([row.profile_id, row.student_id].filter(Boolean).map(String))];
      studentKeys.forEach((studentKey) => {
        pointMap.set(studentKey, (pointMap.get(studentKey) || 0) + points);
      });
    });
    return pointMap;
  },

  async loadPointSummaryForClassrooms(client, classroomIds) {
    if (!classroomIds.length || !(await this.isFeatureReady(client, "classroomPoints"))) {
      return new Map();
    }

    const { data, error } = await client
      .from(this.TABLES.classroomPoints)
      .select("classroom_id, student_id, profile_id, points")
      .in("classroom_id", classroomIds);

    if (error) throw error;

    const pointMap = new Map();
    (data || []).forEach((row) => {
      if (!row.classroom_id) return;
      const points = Number(row.points || 0);
      const studentKeys = [...new Set([row.profile_id, row.student_id].filter(Boolean).map(String))];
      studentKeys.forEach((studentKey) => {
        const key = `${row.classroom_id}:${studentKey}`;
        pointMap.set(key, (pointMap.get(key) || 0) + points);
      });
    });
    return pointMap;
  },

  async loadSubmissionSummary(client, classroomId) {
    if (!(await this.isFeatureReady(client, "assignmentSubmissions"))) {
      return {
        submissionCount: 0,
        submissionByAssignmentAndStudent: new Map(),
        completedByStudent: new Map()
      };
    }

    const { data, error } = await client
      .from(this.TABLES.assignmentSubmissions)
      .select("*")
      .eq("classroom_id", classroomId);

    if (error) throw error;

    const submissionByAssignmentAndStudent = new Map();
    const completedByStudent = new Map();

    (data || []).forEach((row) => {
      submissionByAssignmentAndStudent.set(`${row.assignment_id}:${row.student_id}`, row);
      if (String(row.status || "").toLowerCase() === "completed") {
        completedByStudent.set(row.student_id, (completedByStudent.get(row.student_id) || 0) + 1);
      }
    });

    return {
      rows: data || [],
      submissionCount: (data || []).length,
      submissionByAssignmentAndStudent,
      completedByStudent
    };
  },

  async loadTeacherNameMap(client, teacherIds) {
    const ids = [...new Set((teacherIds || []).filter(Boolean))];
    if (!ids.length) return new Map();

    const { data, error } = await client
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);

    if (error) throw error;
    return new Map((data || []).map((row) => [row.id, row.display_name || "Teacher"]));
  },

  async ensureBucket(context, classroomId) {
    const { client, user, profile } = context;
    if (!(await this.isFeatureReady(client, "contentBuckets"))) {
      return null;
    }

    const { data: existing, error: existingError } = await client
      .from(this.TABLES.contentBuckets)
      .select("id, classroom_id, title")
      .eq("classroom_id", classroomId)
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return existing;

    if (!user || profile?.role === "student") {
      return null;
    }

    const { data, error } = await client
      .from(this.TABLES.contentBuckets)
      .insert({
        classroom_id: classroomId,
        title: "Classroom Content",
        created_by: user.id
      })
      .select("id, classroom_id, title")
      .single();

    if (error) throw error;
    return data;
  }
};

const ClassroomAPI = {
  useDemoMode() {
    ClassroomSupabaseStore.useDemoMode();
  },

  useSupabaseMode() {
    ClassroomSupabaseStore.useSupabaseMode();
  },

  getSelectedMode() {
    return ClassroomSupabaseStore.getMode();
  },

  storeReturnUrl(url) {
    ClassroomSupabaseStore.storeReturnUrl(url);
  },

  getLoginUrl(returnUrl) {
    return ClassroomSupabaseStore.getLoginUrl(returnUrl);
  },

  async getAuthGateState() {
    const status = ClassroomSupabaseStore.getConnectionStatus();
    const session = status.available
      ? await window.DigitalClassroomSupabase.getSession().catch(() => null)
      : null;

    const state = {
      supabaseConfigured: Boolean(status.configured),
      supabaseAvailable: Boolean(status.available),
      sessionExists: Boolean(session),
      selectedMode: ClassroomSupabaseStore.getMode(),
      loginRequired: Boolean(status.configured && status.available && !session && !ClassroomSupabaseStore.isDemoMode()),
      status
    };

    console.info("[Digital Classroom] Auth gate", {
      supabaseConfigured: state.supabaseConfigured,
      sessionExists: state.sessionExists,
      selectedMode: state.selectedMode
    });

    return state;
  },

  async getConnectionStatus() {
    const status = ClassroomSupabaseStore.getConnectionStatus();
    const context = await ClassroomSupabaseStore.getContext({ requireAuth: false });

    return {
      ...status,
      authenticated: Boolean(context.user),
      profileId: context.profile?.id || null,
      role: context.profile?.role || null
    };
  },

  async getTeacherDashboardData() {
    const context = await ClassroomSupabaseStore.getContext({ requireAuth: true });
    if (!context.enabled) {
      if (context.fallbackAllowed === false) {
        throw new Error(context.reason || "Supabase authentication is required.");
      }
      ClassroomSupabaseStore.debug("Using local dashboard fallback", {
        reason: context.reason || "Supabase unavailable."
      });
      return ClassroomLocalStore.getTeacherDashboardData();
    }

    await ClassroomSupabaseStore.assertFeaturesReady(context.client, ["classrooms"]);

    const { client, user, profile } = context;
    if (profile?.role && profile.role !== "teacher") {
      const error = new Error("Teacher role is required to load the Digital Classroom teacher dashboard.");
      error.code = "DIGITAL_CLASSROOM_TEACHER_REQUIRED";
      throw error;
    }

    ClassroomSupabaseStore.debug("Teacher dashboard fetch state", {
      teacherId: user.id,
      role: profile?.role || null
    });

    const { data: classroomRows, error: classroomError } = await client
      .from(ClassroomSupabaseStore.TABLES.classrooms)
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (classroomError) throw classroomError;

    const classrooms = (classroomRows || []).map((row) => ClassroomSupabaseStore.normalizeClassroom(row));
    const classroomIds = classrooms.map((classroom) => classroom.id);
    if (!classroomIds.length) {
      return {
        source: "supabase",
        classrooms,
        enrichedClassrooms: [],
        contentItems: [],
        leaderboardRows: [],
        assignmentRows: [],
        teacherProfile: profile || null,
        stats: {
          classroomCount: 0,
          studentCount: 0,
          assignmentCount: 0,
          submissionCount: 0
        }
      };
    }

    const safeDashboardRows = async (label, loader) => {
      try {
        const result = await loader();
        if (result?.error) throw result.error;
        return result?.data || [];
      } catch (error) {
        console.warn(`[Digital Classroom] Teacher dashboard ${label} unavailable:`, error);
        return [];
      }
    };

    const [memberRowsRaw, assignmentRowsRaw, submissionRowsRaw, pointMap] = await Promise.all([
      safeDashboardRows("members", () => client
        .from(ClassroomSupabaseStore.TABLES.classroomMembers)
        .select("id, classroom_id, profile_id, role, display_name, joined_at")
        .in("classroom_id", classroomIds)),
      safeDashboardRows("assignments", () => client
        .from(ClassroomSupabaseStore.TABLES.assignments)
        .select("*")
        .in("classroom_id", classroomIds)
        .or("is_deleted.is.false,is_deleted.is.null")
        .order("due_date", { ascending: true })),
      safeDashboardRows("submissions", () => client
        .from(ClassroomSupabaseStore.TABLES.assignmentSubmissions)
        .select("*")
        .in("classroom_id", classroomIds)),
      ClassroomSupabaseStore.loadPointSummaryForClassrooms(client, classroomIds).catch((error) => {
        console.warn("[Digital Classroom] Teacher dashboard points unavailable:", error);
        return new Map();
      })
    ]);

    const memberRows = (memberRowsRaw || []).filter((row) => row.role !== "teacher");
    const uniqueStudentIds = new Set(memberRows.map((row) => row.profile_id).filter(Boolean));
    const profileMap = await ClassroomSupabaseStore.loadProfileMap(client, [...uniqueStudentIds]).catch((error) => {
      console.warn("[Digital Classroom] Teacher dashboard profiles unavailable:", error);
      return new Map();
    });

    const completedByClassroomAndStudent = new Map();
    submissionRowsRaw.forEach((row) => {
      const key = `${row.classroom_id}:${row.student_id}`;
      if (String(row.status || "").toLowerCase() === "completed") {
        completedByClassroomAndStudent.set(key, (completedByClassroomAndStudent.get(key) || 0) + 1);
      }
    });

    const studentsByClassroom = new Map();
    memberRows.forEach((row) => {
      const profile = profileMap.get(row.profile_id) || {};
      const name = ClassroomSupabaseStore.getStudentDisplayName({
        ...profile,
        display_name: row.display_name || profile.display_name
      });
      const pointsKey = `${row.classroom_id}:${row.profile_id}`;
      const completedKey = `${row.classroom_id}:${row.profile_id}`;
      const student = {
        id: row.profile_id || row.id,
        classroomId: row.classroom_id,
        memberId: row.id,
        profileId: row.profile_id,
        name,
        displayName: name,
        email: profile.email || "",
        avatar: (name || "S").charAt(0).toUpperCase(),
        avatarUrl: profile.avatar_url || "",
        points: pointMap.get(pointsKey) || 0,
        completedAssignments: completedByClassroomAndStudent.get(completedKey) || 0,
        joinedAt: row.joined_at || new Date().toISOString()
      };

      if (!studentsByClassroom.has(row.classroom_id)) {
        studentsByClassroom.set(row.classroom_id, []);
      }
      studentsByClassroom.get(row.classroom_id).push(student);
    });

    const assignments = assignmentRowsRaw
      .map((row) => ClassroomSupabaseStore.normalizeAssignment(row))
      .filter((assignment) => ClassroomSupabaseStore.isAssignmentVisible(assignment));
    const assignmentsByClassroom = new Map();
    assignments.forEach((assignment) => {
      if (!assignmentsByClassroom.has(assignment.classroomId)) {
        assignmentsByClassroom.set(assignment.classroomId, []);
      }
      assignmentsByClassroom.get(assignment.classroomId).push(assignment);
    });

    const submissions = submissionRowsRaw.map((row) => ClassroomSupabaseStore.normalizeAssignmentSubmission(row));
    const submissionsByClassroom = new Map();
    submissions.forEach((submission) => {
      if (!submissionsByClassroom.has(submission.classroomId)) {
        submissionsByClassroom.set(submission.classroomId, []);
      }
      submissionsByClassroom.get(submission.classroomId).push(submission);
    });

    const leaderboardRows = [];
    const assignmentRows = [];
    const enrichedClassrooms = classrooms.map((classroom) => {
      const students = (studentsByClassroom.get(classroom.id) || [])
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
      const classroomAssignments = assignmentsByClassroom.get(classroom.id) || [];

      leaderboardRows.push(...students.map((student) => ({ ...student, classroomName: classroom.name })));
      assignmentRows.push(...classroomAssignments.map((assignment) => ({ ...assignment, classroomName: classroom.name })));

      return {
        ...classroom,
        studentCount: students.length,
        assignmentCount: classroomAssignments.length,
        submissionCount: (submissionsByClassroom.get(classroom.id) || []).length
      };
    });

    ClassroomSupabaseStore.debug("Teacher dashboard fetch success", {
      teacherId: user.id,
      classroomCount: classrooms.length,
      studentCount: uniqueStudentIds.size,
      assignmentCount: assignments.length,
      submissionCount: submissions.length
    });

    return {
      source: "supabase",
      classrooms,
      enrichedClassrooms,
      contentItems: [],
      leaderboardRows,
      assignmentRows,
      teacherProfile: profile || null,
      stats: {
        classroomCount: classrooms.length,
        studentCount: uniqueStudentIds.size,
        assignmentCount: assignments.length,
        submissionCount: submissions.length
      }
    };
  },

  async getClassrooms() {
    return ClassroomSupabaseStore.withFallback(
      "classrooms",
      async ({ client, user, profile }) => {
        ClassroomSupabaseStore.debug("Classroom fetch state", {
          teacherId: user.id,
          role: profile?.role || null
        });
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.classrooms)
          .select("*")
          .eq("teacher_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        ClassroomSupabaseStore.debug("Classroom fetch success", {
          teacherId: user.id,
          count: (data || []).length
        });
        return (data || []).map((row) => ClassroomSupabaseStore.normalizeClassroom(row));
      },
      () => ClassroomLocalStore.getClassrooms(),
      { requireAuth: true }
    );
  },

  async getClassroomById(id) {
    return ClassroomSupabaseStore.withFallback(
      "classrooms",
      async ({ client }) => {
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.classrooms)
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        return data ? ClassroomSupabaseStore.normalizeClassroom(data) : null;
      },
      () => ClassroomLocalStore.getClassroomById(id),
      { requireAuth: true }
    );
  },

  async getCurrentStudentProfile() {
    const context = await ClassroomSupabaseStore.getContext({ requireAuth: true });
    if (!context.enabled) {
      if (context.fallbackAllowed === false) {
        throw new Error(context.reason || "Sign in to continue.");
      }
      return null;
    }

    return {
      id: context.user.id,
      email: context.user.email || "",
      displayName: ClassroomSupabaseStore.getStudentDisplayName({
        ...context.profile,
        email: context.user.email
      }),
      role: context.profile?.role || context.user.user_metadata?.role || "student"
    };
  },

  async getStudentMembership(classroomId) {
    return ClassroomSupabaseStore.withFallback(
      "classroomMembers",
      async ({ client, user }) => {
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMembers)
          .select("id, classroom_id, profile_id, role, display_name, joined_at, last_accessed_at")
          .eq("classroom_id", classroomId)
          .eq("profile_id", user.id)
          .eq("role", "student")
          .maybeSingle();

        if (error) throw error;
        return data ? {
          id: data.profile_id || data.id,
          classroomId: data.classroom_id,
          memberId: data.id,
          profileId: data.profile_id,
          name: data.display_name || "Student",
          avatar: (data.display_name || "S").charAt(0).toUpperCase(),
          joinedAt: data.joined_at || new Date().toISOString()
        } : null;
      },
      () => ClassroomLocalStore.getStudentMembership(classroomId),
      { requireAuth: true }
    );
  },

  async getClassroomInvite(inviteCodeOrId) {
    const context = await ClassroomSupabaseStore.getContext({ requireAuth: true });
    if (!context.enabled) {
      if (context.fallbackAllowed === false) {
        throw new Error(context.reason || "Sign in to view this classroom invitation.");
      }
      return ClassroomLocalStore.getClassroomInvite(inviteCodeOrId);
    }

    const { client, user, profile } = context;
    const code = String(inviteCodeOrId || "").trim();
    if (!code) return null;

    let classroomRow = null;
    let inviteExpired = false;
    let inviteInactive = false;

    // --- Step 1: If it looks like a full UUID, query classrooms.id ---
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);
    if (isUUID) {
      const { data, error } = await client
        .from(ClassroomSupabaseStore.TABLES.classrooms)
        .select("*")
        .eq("id", code)
        .maybeSingle();
      if (!error && data) classroomRow = data;
    }

    // --- Step 2: Detect invite column on classrooms table, then query it ---
    //     Uses cached column detection to avoid 400 errors from missing columns.
    //     Covers both invite_code and invite_token on the classrooms table.
    if (!classroomRow) {
      const inviteColumn = await ClassroomSupabaseStore.detectInviteCodeColumn(client);
      if (inviteColumn) {
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.classrooms)
          .select("*")
          .eq(inviteColumn, code)
          .limit(1)
          .maybeSingle();
        if (!error && data) classroomRow = data;
      }
    }

    // --- Step 3: Try classroom_invites table if it exists ---
    if (!classroomRow) {
      const invitesReady = await ClassroomSupabaseStore.isFeatureReady(client, "classroomInvites");
      if (invitesReady) {
        const { data: inviteRow, error: inviteError } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomInvites)
          .select("id, classroom_id, invite_token, is_active, expires_at, created_at")
          .eq("invite_token", code)
          .maybeSingle();

        if (!inviteError && inviteRow) {
          if (inviteRow.is_active === false) inviteInactive = true;
          if (inviteRow.expires_at && new Date(inviteRow.expires_at) < new Date()) inviteExpired = true;

          const { data: classData, error: classError } = await client
            .from(ClassroomSupabaseStore.TABLES.classrooms)
            .select("*")
            .eq("id", inviteRow.classroom_id)
            .maybeSingle();
          if (!classError && classData) classroomRow = classData;
        }
      }
    }

    if (!classroomRow) return null;

    const classroom = ClassroomSupabaseStore.normalizeClassroom(classroomRow);

    // Load teacher name
    const teacherMap = await ClassroomSupabaseStore.loadTeacherNameMap(client, [classroom.teacherId]).catch(() => new Map());
    classroom.teacherName = teacherMap.get(classroom.teacherId) || classroom.teacherName || "Teacher";

    const isTeacher = Boolean(user && classroom.teacherId === user.id);
    const membership = await this.getStudentMembership(classroom.id).catch(() => null);

    return {
      classroom,
      alreadyJoined: Boolean(membership),
      membership,
      isTeacher,
      inviteExpired,
      inviteInactive,
      studentProfile: {
        id: user.id,
        email: user.email || "",
        displayName: ClassroomSupabaseStore.getStudentDisplayName({
          ...profile,
          email: user.email
        }),
        role: profile?.role || user.user_metadata?.role || "student"
      }
    };
  },

  async getJoinedClassroomById(classroomId) {
    return ClassroomSupabaseStore.withFallback(
      "classroomMembers",
      async ({ client, user }) => {
        const { data: member, error: memberError } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMembers)
          .select("id, classroom_id, profile_id, role, display_name, joined_at, last_accessed_at")
          .eq("classroom_id", classroomId)
          .eq("profile_id", user.id)
          .eq("role", "student")
          .maybeSingle();

        if (memberError) throw memberError;
        if (!member) return null;

        const { data: classroomRow, error: classroomError } = await client
          .from(ClassroomSupabaseStore.TABLES.classrooms)
          .select("*")
          .eq("id", member.classroom_id)
          .maybeSingle();

        if (classroomError) throw classroomError;
        if (!classroomRow) return null;

        const classroom = ClassroomSupabaseStore.normalizeClassroom(classroomRow);
        const teacherMap = await ClassroomSupabaseStore.loadTeacherNameMap(client, [classroom.teacherId]).catch(() => new Map());
        const name = member.display_name || "Student";

        return {
          classroom: {
            ...classroom,
            teacherName: teacherMap.get(classroom.teacherId) || classroom.teacherName || "Teacher"
          },
          membership: {
            id: member.profile_id || member.id,
            classroomId: member.classroom_id,
            memberId: member.id,
            profileId: member.profile_id,
            name,
            avatar: name.charAt(0).toUpperCase(),
            joinedAt: member.joined_at || new Date().toISOString(),
            lastAccessedAt: member.last_accessed_at || null
          }
        };
      },
      () => {
        const classroom = ClassroomLocalStore.getClassroomById(classroomId);
        const membership = ClassroomLocalStore.getStudentMembership(classroomId);
        return classroom && membership ? { classroom, membership } : null;
      },
      { requireAuth: true }
    );
  },

  async touchStudentClassroomAccess(classroomId) {
    return ClassroomSupabaseStore.withFallback(
      "classroomMembers",
      async ({ client, user }) => {
        const { error } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMembers)
          .update({ last_accessed_at: new Date().toISOString() })
          .eq("classroom_id", classroomId)
          .eq("profile_id", user.id)
          .eq("role", "student");

        if (error) throw error;
        return { success: true };
      },
      () => ({ success: true }),
      { requireAuth: true }
    );
  },

  async createClassroom(classroomData) {
    return ClassroomSupabaseStore.withFallback(
      "classrooms",
      async ({ client, user, profile }) => {
        const payload = {
          teacher_id: user.id,
          title: classroomData.name.trim(),
          subject: classroomData.subject.trim(),
          grade: classroomData.grade.trim(),
          description: classroomData.description.trim()
        };
        ClassroomSupabaseStore.debug("Classroom insert state", payload);

        const { data, error } = await ClassroomSupabaseStore.insertClassroomRow(client, payload);

        if (error) throw error;
        ClassroomSupabaseStore.debug("Classroom insert success", {
          classroomId: data.id,
          teacherId: user.id
        });

        if (await ClassroomSupabaseStore.isFeatureReady(client, "classroomMembers")) {
          const { error: membershipError } = await client
            .from(ClassroomSupabaseStore.TABLES.classroomMembers)
            .upsert(
              {
                classroom_id: data.id,
                profile_id: user.id,
                role: "teacher",
                display_name: profile?.display_name || user.email || "Teacher"
              },
              { onConflict: "classroom_id,profile_id" }
            );

          if (membershipError && !ClassroomSupabaseStore.shouldFallback(membershipError)) {
            throw membershipError;
          }
        }

        return ClassroomSupabaseStore.normalizeClassroom(data);
      },
      () => ClassroomLocalStore.createClassroom(classroomData),
      { requireAuth: true }
    );
  },

  async getStudentsByClassroom(classroomId) {
    return ClassroomSupabaseStore.withFallback(
      "classroomMembers",
      async ({ client }) => {
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMembers)
          .select("id, classroom_id, profile_id, role, display_name, joined_at")
          .eq("classroom_id", classroomId);

        if (error) throw error;

        const studentRows = (data || []).filter((row) => row.role !== "teacher");
        const profileMap = await ClassroomSupabaseStore.loadProfileMap(
          client,
          studentRows.map((row) => row.profile_id)
        );
        const pointMap = await ClassroomSupabaseStore.loadPointSummary(client, classroomId);
        const submissionSummary = await ClassroomSupabaseStore.loadSubmissionSummary(client, classroomId);
        const skillBreakdownByStudent = new Map();
        const skillBreakdownsByStudent = new Map();

        try {
          if (await ClassroomSupabaseStore.isFeatureReady(client, "activitySubmissions")) {
            const { data: activityRows, error: activityError } = await client
              .from(ClassroomSupabaseStore.TABLES.activitySubmissions)
              .select("assignment_id, student_id, reading_score, listening_score, vocabulary_score")
              .eq("classroom_id", classroomId);

            if (activityError) throw activityError;

            (activityRows || []).forEach((row) => {
              if (!row.student_id) return;
              const totals = skillBreakdownByStudent.get(row.student_id) || {
                reading_score: 0,
                listening_score: 0,
                vocabulary_score: 0
              };
              totals.reading_score += Number(row.reading_score || 0);
              totals.listening_score += Number(row.listening_score || 0);
              totals.vocabulary_score += Number(row.vocabulary_score || 0);
              skillBreakdownByStudent.set(row.student_id, totals);

              if (row.assignment_id) {
                const byAssignment = skillBreakdownsByStudent.get(row.student_id) || {};
                const assignmentTotals = byAssignment[row.assignment_id] || {
                  reading_score: 0,
                  listening_score: 0,
                  vocabulary_score: 0
                };
                assignmentTotals.reading_score += Number(row.reading_score || 0);
                assignmentTotals.listening_score += Number(row.listening_score || 0);
                assignmentTotals.vocabulary_score += Number(row.vocabulary_score || 0);
                byAssignment[row.assignment_id] = assignmentTotals;
                skillBreakdownsByStudent.set(row.student_id, byAssignment);
              }
            });
          }
        } catch (skillError) {
          if (ClassroomSupabaseStore.shouldFallback(skillError) || ClassroomSupabaseStore.getMissingColumn(skillError)) {
            console.warn(
              "[Digital Classroom] Activity skill breakdown is not available yet.",
              ClassroomSupabaseStore.getErrorMessage(skillError)
            );
          } else {
            throw skillError;
          }
        }

        return studentRows
          .map((row) => {
            const profile = profileMap.get(row.profile_id) || {};
            const name = ClassroomSupabaseStore.getStudentDisplayName({
              ...profile,
              display_name: row.display_name || profile.display_name
            });
            const classroomSkillBreakdown = skillBreakdownByStudent.get(row.profile_id) || null;
            const assignmentSkillBreakdowns = skillBreakdownsByStudent.get(row.profile_id) || null;
            return {
              id: row.profile_id || row.id,
              classroomId: row.classroom_id,
              memberId: row.id,
              profileId: row.profile_id,
              name,
              displayName: name,
              email: profile.email || "",
              avatar: (name || "S").charAt(0).toUpperCase(),
              avatarUrl: profile.avatar_url || "",
              points: pointMap.get(row.profile_id) || 0,
              completedAssignments: submissionSummary.completedByStudent.get(row.profile_id) || 0,
              joinedAt: row.joined_at || new Date().toISOString(),
              ...(classroomSkillBreakdown ? { classroomSkillBreakdown } : {}),
              ...(assignmentSkillBreakdowns ? { assignmentSkillBreakdowns } : {})
            };
          })
          .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
      },
      () => ClassroomLocalStore.getStudentsByClassroom(classroomId),
      { requireAuth: true }
    );
  },

  async removeStudentFromClassroom(classroomId, studentId) {
    return ClassroomSupabaseStore.withFallback(
      "classroomMembers",
      async ({ client }) => {
        const { data: member, error: memberError } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMembers)
          .select("id, profile_id, classroom_id, role")
          .eq("classroom_id", classroomId)
          .or(`id.eq.${studentId},profile_id.eq.${studentId}`)
          .neq("role", "teacher")
          .maybeSingle();

        if (memberError) throw memberError;
        if (!member) return { success: false };

        const { error } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMembers)
          .update({ status: "removed" })
          .eq("id", member.id);

        if (error) {
          const missingStatusColumn = String(ClassroomSupabaseStore.getErrorMessage(error)).toLowerCase().includes("status");
          if (!missingStatusColumn) throw error;

          const { error: deleteError } = await client
            .from(ClassroomSupabaseStore.TABLES.classroomMembers)
            .delete()
            .eq("id", member.id);

          if (deleteError) throw deleteError;
        }
        return { success: true };
      },
      () => ClassroomLocalStore.removeStudentFromClassroom(classroomId, studentId),
      { requireAuth: true }
    );
  },

  async joinClassroom(classroomId, studentName) {
    return ClassroomSupabaseStore.withFallback(
      "classroomMembers",
      async ({ client, user, profile }) => {
        if (!profile) {
          throw new Error("Your Edtechra profile could not be loaded. Please sign in again before joining this classroom.");
        }

        const { data: existing, error: existingError } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMembers)
          .select("id, classroom_id, profile_id, role, display_name, joined_at")
          .eq("classroom_id", classroomId)
          .eq("profile_id", user.id)
          .eq("role", "student")
          .maybeSingle();

        if (existingError) throw existingError;
        if (existing) {
          const name = existing.display_name || profile?.display_name || studentName.trim();
          return {
            id: existing.profile_id || existing.id,
            classroomId: existing.classroom_id,
            memberId: existing.id,
            profileId: existing.profile_id,
            name,
            avatar: name.charAt(0).toUpperCase(),
            points: 0,
            completedAssignments: 0,
            joinedAt: existing.joined_at || new Date().toISOString(),
            alreadyEnrolled: true
          };
        }

        const normalizedName = studentName.trim();
        let { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMembers)
          .insert({
            classroom_id: classroomId,
            profile_id: user.id,
            role: "student",
            status: "active",
            display_name: normalizedName,
            last_accessed_at: new Date().toISOString()
          })
          .select("id, classroom_id, profile_id, role, display_name, joined_at")
          .single();

        if (error) {
          const missingStatusColumn = String(ClassroomSupabaseStore.getErrorMessage(error)).toLowerCase().includes("status");
          if (missingStatusColumn) {
            const retry = await client
              .from(ClassroomSupabaseStore.TABLES.classroomMembers)
              .insert({
                classroom_id: classroomId,
                profile_id: user.id,
                role: "student",
                display_name: normalizedName,
                last_accessed_at: new Date().toISOString()
              })
              .select("id, classroom_id, profile_id, role, display_name, joined_at")
              .single();
            data = retry.data;
            error = retry.error;
          }
        }

        if (error) {
          const isDuplicate = error.code === "23505" || /duplicate|unique/i.test(ClassroomSupabaseStore.getErrorMessage(error));
          if (isDuplicate) {
            return {
              id: user.id,
              classroomId,
              memberId: null,
              profileId: user.id,
              name: profile?.display_name || normalizedName,
              avatar: (profile?.display_name || normalizedName || "S").charAt(0).toUpperCase(),
              points: 0,
              completedAssignments: 0,
              joinedAt: new Date().toISOString(),
              alreadyEnrolled: true
            };
          }
          throw error;
        }

        return {
          id: data.profile_id || data.id,
          classroomId: data.classroom_id,
          memberId: data.id,
          profileId: data.profile_id,
          name: data.display_name || profile?.display_name || normalizedName,
          avatar: (data.display_name || profile?.display_name || normalizedName).charAt(0).toUpperCase(),
          points: 0,
          completedAssignments: 0,
          joinedAt: data.joined_at || new Date().toISOString(),
          alreadyEnrolled: false
        };
      },
      () => ClassroomLocalStore.joinClassroom(classroomId, studentName),
      { requireAuth: true }
    );
  },

  async getJoinedClassrooms() {
    return ClassroomSupabaseStore.withFallback(
      "classroomMembers",
      async ({ client, user }) => {
        const { data: memberRows, error: memberError } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMembers)
          .select("id, classroom_id, profile_id, role, display_name, joined_at, last_accessed_at")
          .eq("profile_id", user.id)
          .eq("role", "student")
          .order("last_accessed_at", { ascending: false, nullsFirst: false })
          .order("joined_at", { ascending: false });

        if (memberError) throw memberError;
        const classroomIds = [...new Set((memberRows || []).map((row) => row.classroom_id).filter(Boolean))];
        if (!classroomIds.length) return [];

        const { data: classroomRows, error: classroomError } = await client
          .from(ClassroomSupabaseStore.TABLES.classrooms)
          .select("*")
          .in("id", classroomIds);

        if (classroomError) throw classroomError;

        const classrooms = (classroomRows || []).map((row) => ClassroomSupabaseStore.normalizeClassroom(row));
        const teacherMap = await ClassroomSupabaseStore.loadTeacherNameMap(
          client,
          classrooms.map((classroom) => classroom.teacherId)
        ).catch(() => new Map());

        const assignmentsByClassroom = new Map();
        if (await ClassroomSupabaseStore.isFeatureReady(client, "assignments")) {
          const { data: assignments } = await client
            .from(ClassroomSupabaseStore.TABLES.assignments)
            .select("id, classroom_id, due_date")
            .in("classroom_id", classroomIds)
            .or("is_deleted.is.false,is_deleted.is.null");
          (assignments || []).forEach((row) => {
            assignmentsByClassroom.set(row.classroom_id, (assignmentsByClassroom.get(row.classroom_id) || 0) + 1);
          });
        }

        const memberByClassroom = new Map((memberRows || []).map((row) => [row.classroom_id, row]));
        return classrooms.map((classroom) => {
          const member = memberByClassroom.get(classroom.id) || {};
          return {
            ...classroom,
            teacherName: teacherMap.get(classroom.teacherId) || classroom.teacherName || "Teacher",
            joinedAt: member.joined_at || classroom.createdAt,
            lastAccessedAt: member.last_accessed_at || null,
            taskCount: assignmentsByClassroom.get(classroom.id) || 0,
            unreadCount: 0
          };
        }).sort((a, b) => new Date(b.lastAccessedAt || b.joinedAt) - new Date(a.lastAccessedAt || a.joinedAt));
      },
      () => ClassroomLocalStore.getJoinedClassrooms(),
      { requireAuth: true }
    );
  },

  async getAssignmentsByClassroom(classroomId) {
    return ClassroomSupabaseStore.withFallback(
      "assignments",
      async ({ client }) => {
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.assignments)
          .select("*")
          .eq("classroom_id", classroomId)
          .or("is_deleted.is.false,is_deleted.is.null")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (data || [])
          .map((row) => ClassroomSupabaseStore.normalizeAssignment(row))
          .filter((assignment) => ClassroomSupabaseStore.isAssignmentVisible(assignment));
      },
      () => ClassroomLocalStore.getAssignmentsByClassroom(classroomId),
      { requireAuth: true }
    );
  },

  async createAssignment(assignmentData) {
    return ClassroomSupabaseStore.withFallback(
      "assignments",
      async ({ client, user }) => {
        const basePayload = {
          classroom_id: assignmentData.classroomId,
          created_by: user.id,
          title: assignmentData.title.trim(),
          instructions: assignmentData.instructions.trim(),
          due_date: assignmentData.dueDate,
          points: Number(assignmentData.points)
        };
        const structuredResourceItems = Array.isArray(assignmentData.resourceItems) ? assignmentData.resourceItems : [];
        const extendedPayload = {
            ...basePayload,
            assignment_type: assignmentData.assignmentType || "assignment",
            resource_items: structuredResourceItems,
            unlock_mode: assignmentData.unlockMode || "open_access",
            start_date: assignmentData.startDate || null,
            timezone: assignmentData.timezone || "Asia/Colombo",
            status: assignmentData.status || "published"
          };

        let result = await client
          .from(ClassroomSupabaseStore.TABLES.assignments)
          .insert(extendedPayload)
          .select("*")
          .single();

        const missingExtendedColumns = result.error && (
          ["42703", "PGRST204"].includes(result.error.code) ||
          /assignment_type|resource_items|unlock_mode|start_date|timezone|status/i.test(`${result.error.message || ""} ${result.error.details || ""} ${result.error.hint || ""}`)
        );
        if (missingExtendedColumns) {
          result = await client
            .from(ClassroomSupabaseStore.TABLES.assignments)
            .insert({
              ...basePayload,
              instructions: ClassroomSupabaseStore.serializeAssignmentInstructions(assignmentData)
            })
            .select("*")
            .single();
        }

        if (result.error) throw result.error;
        return ClassroomSupabaseStore.normalizeAssignment(result.data);
      },
      () => ClassroomLocalStore.createAssignment(assignmentData),
      { requireAuth: true }
    );
  },

  async deleteAssignment(classroomId, assignmentId) {
    if (!assignmentId) {
      throw new Error("Invalid assignment. Please refresh and try again.");
    }

    return ClassroomSupabaseStore.withFallback(
      "assignments",
      async ({ client }) => {
        const now = new Date().toISOString();
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.assignments)
          .update({
            is_deleted: true,
            deleted_at: now,
            updated_at: now
          })
          .eq("id", assignmentId)
          .eq("classroom_id", classroomId)
          .select("id, title, classroom_id, is_deleted, deleted_at, updated_at")
          .single();

        if (error) {
          if (ClassroomSupabaseStore.isRlsError(error)) {
            throw new Error("You do not have permission to delete this assignment.");
          }
          throw error;
        }

        if (!data || data.is_deleted !== true) {
          throw new Error("Assignment could not be deleted. Please check permissions or RLS policy.");
        }

        return {
          success: true,
          mode: "soft-delete",
          sourceType: "assignment",
          sourceTable: ClassroomSupabaseStore.TABLES.assignments,
          row: ClassroomSupabaseStore.normalizeAssignment(data)
        };
      },
      () => ClassroomLocalStore.deleteAssignment(classroomId, assignmentId),
      { requireAuth: true }
    );
  },

  async getClassroomMessages(classroomId) {
    return ClassroomSupabaseStore.withFallback(
      "classroomMessages",
      async ({ client }) => {
        const now = new Date().toISOString();
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMessages)
          .select("id, classroom_id, teacher_id, message, is_pinned, is_deleted, created_at, updated_at, edited_at, deleted_at, expires_at")
          .eq("classroom_id", classroomId)
          .eq("is_deleted", false)
          .gt("expires_at", now)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        return (data || []).map((row) => ClassroomSupabaseStore.normalizeClassroomMessage(row));
      },
      () => ClassroomLocalStore.getMessagesByClassroom(classroomId),
      { requireAuth: true }
    );
  },

  async createClassroomMessage(classroomId, messageText) {
    return ClassroomSupabaseStore.withFallback(
      "classroomMessages",
      async ({ client, user }) => {
        const text = String(messageText || "").trim();
        if (!text) throw new Error("Message cannot be empty.");

        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMessages)
          .insert({
            classroom_id: classroomId,
            teacher_id: user.id,
            message: text,
            expires_at: expiresAt.toISOString()
          })
          .select("id, classroom_id, teacher_id, message, is_pinned, is_deleted, created_at, updated_at, edited_at, deleted_at, expires_at")
          .single();

        if (error) throw error;
        if (!data) throw new Error("Message was not saved. Supabase returned no row.");
        return ClassroomSupabaseStore.normalizeClassroomMessage(data);
      },
      async ({ user } = {}) => ClassroomLocalStore.createMessage(classroomId, messageText, user?.id || "local-teacher"),
      { requireAuth: true }
    );
  },

  async updateClassroomMessage(messageId, newMessage) {
    return ClassroomSupabaseStore.withFallback(
      "classroomMessages",
      async ({ client }) => {
        const text = String(newMessage || "").trim();
        if (!text) throw new Error("Message cannot be empty.");

        const now = new Date().toISOString();
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMessages)
          .update({
            message: text,
            updated_at: now,
            edited_at: now
          })
          .eq("id", messageId)
          .eq("is_deleted", false)
          .select("id, classroom_id, teacher_id, message, is_pinned, is_deleted, created_at, updated_at, edited_at, deleted_at, expires_at");

        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : null;
        if (!row) {
          throw new Error("Message update was not confirmed. It may be expired, deleted, or blocked by RLS.");
        }
        return ClassroomSupabaseStore.normalizeClassroomMessage(row);
      },
      () => ClassroomLocalStore.updateMessage(messageId, newMessage),
      { requireAuth: true }
    );
  },

  async deleteClassroomMessage(messageId) {
    return ClassroomSupabaseStore.withFallback(
      "classroomMessages",
      async ({ client }) => {
        const now = new Date().toISOString();
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMessages)
          .update({
            is_deleted: true,
            deleted_at: now,
            updated_at: now
          })
          .eq("id", messageId)
          .eq("is_deleted", false)
          .select("id, classroom_id, teacher_id, message, is_pinned, is_deleted, created_at, updated_at, edited_at, deleted_at, expires_at");

        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : null;
        if (!row) {
          throw new Error("Message delete was not confirmed. It may already be deleted or blocked by RLS.");
        }
        return ClassroomSupabaseStore.normalizeClassroomMessage(row);
      },
      () => ClassroomLocalStore.deleteMessage(messageId),
      { requireAuth: true }
    );
  },

  async cleanupExpiredClassroomMessages() {
    return ClassroomSupabaseStore.withFallback(
      "classroomMessages",
      async ({ client }) => {
        const now = new Date().toISOString();
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.classroomMessages)
          .update({
            is_deleted: true,
            deleted_at: now,
            updated_at: now
          })
          .eq("is_deleted", false)
          .lte("expires_at", now)
          .select("id");

        if (error) throw error;
        return { success: true, count: Array.isArray(data) ? data.length : 0 };
      },
      () => ({ success: true, count: 0 }),
      { requireAuth: true }
    );
  },

  async getSubmissionsByClassroom(classroomId) {
    return ClassroomSupabaseStore.withFallback(
      "assignmentSubmissions",
      async ({ client }) => {
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.assignmentSubmissions)
          .select("*")
          .eq("classroom_id", classroomId);

        if (error) throw error;

        return (data || []).map((row) => ClassroomSupabaseStore.normalizeAssignmentSubmission(row));
      },
      () => ClassroomLocalStore.getSubmissionsByClassroom(classroomId),
      { requireAuth: true }
    );
  },

  async getSubmission(assignmentId, studentId) {
    return ClassroomSupabaseStore.withFallback(
      "assignmentSubmissions",
      async ({ client }) => {
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.assignmentSubmissions)
          .select("*")
          .eq("assignment_id", assignmentId)
          .eq("student_id", studentId)
          .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return ClassroomSupabaseStore.normalizeAssignmentSubmission(data);
      },
      () => ClassroomLocalStore.getSubmission(assignmentId, studentId),
      { requireAuth: true }
    );
  },

  async syncActivityScore(payload = {}) {
    const session = await window.DigitalClassroomSupabase?.getSession?.().catch(() => null);
    const response = await fetch("/api/classroom-activity-score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token || ""}`
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Activity score sync failed.");
    }
    return result;
  },

  normalizeSpreeProgress(row) {
    return {
      id: row.id,
      assignmentId: row.assignment_id || row.assignmentId,
      spreeItemId: row.spree_item_id || row.spreeItemId,
      resourceId: row.resource_id || row.resourceId,
      studentId: row.student_id || row.studentId,
      classroomId: row.classroom_id || row.classroomId,
      status: row.status || "not_started",
      openedAt: row.opened_at || row.openedAt || "",
      completedAt: row.completed_at || row.completedAt || "",
      updatedAt: row.updated_at || row.updatedAt || "",
      createdAt: row.created_at || row.createdAt || ""
    };
  },

  async getSpreeItemProgress(assignmentId, studentId) {
    const context = await ClassroomSupabaseStore.getContext({ requireAuth: true });
    if (!context.enabled && context.fallbackAllowed === false) {
      throw new Error(context.reason || "Supabase authentication is required.");
    }
    if (!context.enabled || !(await ClassroomSupabaseStore.isFeatureReady(context.client, "spreeItemProgress"))) {
      return ClassroomLocalStore.getSpreeItemProgress(assignmentId, studentId);
    }

    const { data, error } = await context.client
      .from(ClassroomSupabaseStore.TABLES.spreeItemProgress)
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId);

    if (error) throw error;
    return (data || []).map((row) => this.normalizeSpreeProgress(row));
  },

  async upsertSpreeItemProgress(progressData) {
    const now = new Date().toISOString();
    const context = await ClassroomSupabaseStore.getContext({ requireAuth: true });
    if (!context.enabled && context.fallbackAllowed === false) {
      throw new Error(context.reason || "Supabase authentication is required.");
    }
    if (!context.enabled || !(await ClassroomSupabaseStore.isFeatureReady(context.client, "spreeItemProgress"))) {
      return ClassroomLocalStore.upsertSpreeItemProgress(progressData);
    }

    const payload = {
      assignment_id: progressData.assignmentId,
      spree_item_id: progressData.spreeItemId,
      resource_id: progressData.resourceId,
      student_id: progressData.studentId,
      classroom_id: progressData.classroomId,
      status: progressData.status || "not_started",
      opened_at: progressData.openedAt || null,
      completed_at: progressData.completedAt || null,
      updated_at: now
    };

    const { data, error } = await context.client
      .from(ClassroomSupabaseStore.TABLES.spreeItemProgress)
      .upsert(payload, { onConflict: "assignment_id,spree_item_id,student_id" })
      .select("*")
      .single();

    if (error) throw error;
    return this.normalizeSpreeProgress(data);
  },

  async submitAssignment(assignmentId, studentId) {
    return ClassroomSupabaseStore.withFallback(
      "assignmentSubmissions",
      async ({ client, user }) => {
        if (!user || user.id !== studentId) {
          throw new Error("No active Edtechra session.");
        }

        const { data: assignmentRow, error: assignmentError } = await client
          .from(ClassroomSupabaseStore.TABLES.assignments)
          .select("id, classroom_id, points")
          .eq("id", assignmentId)
          .single();

        if (assignmentError) throw assignmentError;

        const { data: existing, error: existingError } = await client
          .from(ClassroomSupabaseStore.TABLES.assignmentSubmissions)
          .select("id, assignment_id, classroom_id, student_id, status, points_awarded, submitted_at, note")
          .eq("assignment_id", assignmentId)
          .eq("student_id", studentId)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existing) {
          return {
            id: existing.id,
            assignmentId: existing.assignment_id,
            classroomId: existing.classroom_id,
            studentId: existing.student_id,
            status: existing.status,
            pointsAwarded: Number(existing.points_awarded || 0),
            submittedAt: existing.submitted_at,
            note: existing.note || ""
          };
        }

        const submissionPayload = {
          assignment_id: assignmentId,
          classroom_id: assignmentRow.classroom_id,
          student_id: studentId,
          status: "submitted",
          note: "Placeholder submission",
          points_awarded: Number(assignmentRow.points || 0)
        };

        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.assignmentSubmissions)
          .insert(submissionPayload)
          .select("id, assignment_id, classroom_id, student_id, status, points_awarded, submitted_at, note")
          .single();

        if (error) throw error;

        if (await ClassroomSupabaseStore.isFeatureReady(client, "classroomPoints")) {
          const { error: pointsError } = await client
            .from(ClassroomSupabaseStore.TABLES.classroomPoints)
            .insert({
              classroom_id: assignmentRow.classroom_id,
              profile_id: studentId,
              assignment_submission_id: data.id,
              points: Number(assignmentRow.points || 0),
              metadata: { reason: "Assignment submission" }
            });

          if (pointsError && !ClassroomSupabaseStore.shouldFallback(pointsError)) {
            throw pointsError;
          }
        }

        return {
          id: data.id,
          assignmentId: data.assignment_id,
          classroomId: data.classroom_id,
          studentId: data.student_id,
          status: data.status,
          pointsAwarded: Number(data.points_awarded || 0),
          submittedAt: data.submitted_at,
          note: data.note || ""
        };
      },
      () => ClassroomLocalStore.submitAssignment(assignmentId, studentId),
      { requireAuth: true }
    );
  },

  async getContentItems() {
    return ClassroomLocalStore.getContentItems();
  },

  async getTeachingResources(classroomId = "") {
    return ClassroomSupabaseStore.withFallback(
      "submissions",
      async ({ client, user }) => {
        if (!user?.id) return [];

        const baseColumns = [
          "id",
          "author_id",
          "owner_role",
          "teacher_id",
          "upload_context",
          "source",
          "classroom_id",
          "resource_purpose",
          "title",
          "description",
          "category",
          "content_type",
          "resource_type",
          "file_url",
          "file_path",
          "file_type",
          "mime_type",
          "thumbnail_url",
          "image_url",
          "visibility",
          "status",
          "created_at",
          "updated_at"
        ];
        const optionalColumns = [
          "file_size",
          "storage_provider",
          "project_url",
          "preview_url",
          "metadata",
          "is_deleted",
          "deleted_at",
          "shared_to_premium",
          "premium_shared_at",
          "premium_status",
          "premium_library_category"
        ];
        let data = null;
        let error = null;

        for (let attempt = 0; attempt <= baseColumns.length + optionalColumns.length; attempt += 1) {
          const selectColumns = [...baseColumns, ...optionalColumns].join(", ");
          let query = client
            .from(ClassroomSupabaseStore.TABLES.submissions)
            .select(selectColumns)
            .eq("author_id", user.id)
            .eq("teacher_id", user.id)
            .eq("owner_role", "teacher")
            .eq("resource_purpose", "teaching_resource")
            .eq("upload_context", "classroom")
            .eq("source", "digital_classroom");

          if (classroomId) {
            query = query.eq("classroom_id", classroomId);
          }
          if (optionalColumns.includes("is_deleted")) {
            query = query.or("is_deleted.is.false,is_deleted.is.null");
          }

          const result = await query.order("created_at", { ascending: false });
          data = result.data;
          error = result.error;

          if (!error) break;

          const missingColumn = ClassroomSupabaseStore.getMissingColumn(error);
          const optionalIndex = optionalColumns.indexOf(missingColumn);
          if (optionalIndex === -1) break;

          optionalColumns.splice(optionalIndex, 1);
        }

        if (error) {
          if (ClassroomSupabaseStore.shouldFallback(error) || String(error?.message || "").toLowerCase().includes("column")) {
            console.warn(
              "[Digital Classroom] My Teaching Resources requires classroom upload metadata columns. Returning an empty resource list to avoid showing global uploads.",
              ClassroomSupabaseStore.getErrorMessage(error)
            );
            return [];
          }
          throw error;
        }

        return (data || [])
          .filter((row) => (
            row.author_id === user.id &&
            row.teacher_id === user.id &&
            row.owner_role === "teacher" &&
            row.resource_purpose === "teaching_resource" &&
            row.upload_context === "classroom" &&
            row.source === "digital_classroom" &&
            row.is_deleted !== true &&
            !row.deleted_at &&
            !["deleted", "archived"].includes(String(row.status || "").toLowerCase()) &&
            (!classroomId || row.classroom_id === classroomId)
          ))
          .map((row) => ClassroomSupabaseStore.normalizeTeachingResource(row));
      },
      () => [],
      { requireAuth: true }
    );
  },

  async shareResourceToPremiumLibrary(resourceId) {
    if (!resourceId) {
      throw new Error("Invalid resource. Please refresh and try again.");
    }

    return ClassroomSupabaseStore.withFallback(
      "submissions",
      async ({ client, user }) => {
        const now = new Date().toISOString();
        const payload = {
          shared_to_premium: true,
          premium_shared_at: now,
          premium_status: "published",
          updated_at: now
        };

        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.submissions)
          .update(payload)
          .eq("id", resourceId)
          .eq("author_id", user.id)
          .eq("teacher_id", user.id)
          .eq("owner_role", "teacher")
          .eq("resource_purpose", "teaching_resource")
          .eq("upload_context", "classroom")
          .eq("source", "digital_classroom")
          .select("id, author_id, teacher_id, owner_role, resource_purpose, upload_context, source, visibility, shared_to_premium, premium_shared_at, premium_status, updated_at")
          .maybeSingle();

        if (error && ClassroomSupabaseStore.getMissingColumn(error)) {
          throw new Error("Premium sharing requires the submissions premium-sharing columns. Apply the teacher-resource-premium-sharing migration and try again.");
        }

        if (error) {
          if (ClassroomSupabaseStore.isRlsError(error)) {
            throw new Error("You do not have permission to share this resource.");
          }
          throw error;
        }

        if (!data) {
          throw new Error("Resource share was not confirmed. It may not exist or you may not own it.");
        }

        return {
          success: true,
          mode: "metadata-update",
          fields: payload,
          row: data
        };
      },
      () => {
        throw new Error("Premium library sharing requires Supabase.");
      },
      { requireAuth: true }
    );
  },

  async shiftResourceToPremium(resourceId) {
    return this.shareResourceToPremiumLibrary(resourceId);
  },

  async getPremiumLibraryResources() {
    return ClassroomSupabaseStore.withFallback(
      "submissions",
      async ({ client }) => {
        const baseColumns = [
          "id",
          "author_id",
          "owner_role",
          "teacher_id",
          "upload_context",
          "source",
          "classroom_id",
          "resource_purpose",
          "title",
          "description",
          "category",
          "content_type",
          "resource_type",
          "file_url",
          "file_path",
          "file_type",
          "mime_type",
          "thumbnail_url",
          "image_url",
          "visibility",
          "status",
          "created_at",
          "updated_at"
        ];
        const optionalColumns = [
          "project_url",
          "preview_url",
          "metadata",
          "is_deleted",
          "deleted_at",
          "shared_to_premium",
          "premium_shared_at",
          "premium_status",
          "premium_library_category"
        ];
        let data = null;
        let error = null;
        const requiredPremiumColumns = new Set(["shared_to_premium", "premium_status", "premium_shared_at"]);

        for (let attempt = 0; attempt <= optionalColumns.length; attempt += 1) {
          const selectColumns = [...baseColumns, ...optionalColumns].join(", ");
          const result = await client
            .from(ClassroomSupabaseStore.TABLES.submissions)
            .select(selectColumns)
            .eq("shared_to_premium", true)
            .eq("premium_status", "published")
            .or("is_deleted.is.false,is_deleted.is.null")
            .order("premium_shared_at", { ascending: false });

          data = result.data;
          error = result.error;
          if (!error) break;

          const missingColumn = ClassroomSupabaseStore.getMissingColumn(error);
          if (requiredPremiumColumns.has(missingColumn)) {
            console.warn(
              "[Digital Classroom] Premium Learning Library requires premium-sharing metadata columns.",
              ClassroomSupabaseStore.getErrorMessage(error)
            );
            return [];
          }

          const optionalIndex = optionalColumns.indexOf(missingColumn);
          if (optionalIndex === -1) break;
          optionalColumns.splice(optionalIndex, 1);
        }

        if (error) throw error;

        return (data || [])
          .filter((row) => (
            row.shared_to_premium === true &&
            row.is_deleted !== true &&
            !row.deleted_at
          ))
          .map((row) => ClassroomSupabaseStore.normalizeTeachingResource(row));
      },
      () => [],
      { requireAuth: true }
    );
  },

  async deleteTeacherResource(resourceId) {
    if (!resourceId) {
      throw new Error("Invalid resource. Please refresh and try again.");
    }

    return ClassroomSupabaseStore.withFallback(
      "submissions",
      async ({ client, user }) => {
        const now = new Date().toISOString();
        const result = await client
          .from(ClassroomSupabaseStore.TABLES.submissions)
          .update({
            is_deleted: true,
            deleted_at: now,
            updated_at: now
          })
          .eq("id", resourceId)
          .eq("author_id", user.id)
          .eq("teacher_id", user.id)
          .eq("owner_role", "teacher")
          .eq("resource_purpose", "teaching_resource")
          .eq("upload_context", "classroom")
          .eq("source", "digital_classroom")
          .select("id, is_deleted, deleted_at, updated_at")
          .maybeSingle();

        if (result.error && ClassroomSupabaseStore.getMissingColumn(result.error)) {
          throw new Error("Resource deletion requires the submissions soft-delete columns. Apply the teacher-resource-soft-delete migration and try again.");
        }

        if (result.error) {
          if (ClassroomSupabaseStore.isRlsError(result.error)) {
            throw new Error("You do not have permission to delete this resource.");
          }
          throw result.error;
        }

        if (!result.data) {
          throw new Error("Resource delete was not confirmed. It may already be deleted or you may not own it.");
        }

        return {
          success: true,
          mode: "soft-delete",
          row: result.data
        };
      },
      () => {
        throw new Error("Resource deletion requires Supabase.");
      },
      { requireAuth: true }
    );
  },

  async getSavedCollections() {
    return ClassroomSupabaseStore.withFallback(
      "bookmarks",
      async ({ client, user }) => {
        if (!user?.id) return [];

        const { data: bookmarks, error: bookmarkError } = await client
          .from(ClassroomSupabaseStore.TABLES.bookmarks)
          .select("id, submission_id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (bookmarkError) throw bookmarkError;
        if (!bookmarks?.length) return [];

        const bookmarkBySubmissionId = new Map(bookmarks.map((bookmark) => [String(bookmark.submission_id), bookmark]));
        const submissionIds = bookmarks.map((bookmark) => bookmark.submission_id).filter(Boolean);
        if (!submissionIds.length) return [];

        const { data: submissions, error: submissionError } = await client
          .from(ClassroomSupabaseStore.TABLES.submissions)
          .select(`
            id,
            title,
            description,
            category,
            content_type,
            author_id,
            thumbnail_path,
            thumbnail_url,
            image_url,
            file_url,
            status,
            created_at,
            updated_at,
            profiles!author_id(display_name)
          `)
          .in("id", submissionIds);

        if (submissionError) throw submissionError;

        const submissionById = new Map((submissions || []).map((submission) => [String(submission.id), submission]));
        return submissionIds
          .map((submissionId) => {
            const submission = submissionById.get(String(submissionId));
            if (!submission) return null;
            return ClassroomSupabaseStore.normalizeSavedCollection(
              submission,
              bookmarkBySubmissionId.get(String(submissionId))
            );
          })
          .filter(Boolean);
      },
      () => [],
      { requireAuth: true }
    );
  },

  async addContentToClassroom(classroomId, contentId) {
    return ClassroomSupabaseStore.withFallback(
      "bucketItems",
      async (context) => {
        if (!(await ClassroomSupabaseStore.isFeatureReady(context.client, "contentBuckets"))) {
          return ClassroomLocalStore.addContentToClassroom(classroomId, contentId);
        }

        const bucket = await ClassroomSupabaseStore.ensureBucket(context, classroomId);
        if (!bucket) {
          return ClassroomLocalStore.addContentToClassroom(classroomId, contentId);
        }

        const { data: existing, error: existingError } = await context.client
          .from(ClassroomSupabaseStore.TABLES.bucketItems)
          .select("id")
          .eq("bucket_id", bucket.id)
          .eq("content_id", contentId)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existing) return existing;

        const contentItem = ClassroomLocalStore.getContentItems().find((item) => item.id === contentId);
        const { data, error } = await context.client
          .from(ClassroomSupabaseStore.TABLES.bucketItems)
          .insert({
            bucket_id: bucket.id,
            content_id: contentId,
            title: contentItem?.title || contentId,
            item_type: contentItem?.type || null,
            subject: contentItem?.subject || null,
            grade_level: contentItem?.level || null,
            minutes: contentItem?.minutes || null
          })
          .select("id")
          .single();

        if (error) throw error;
        return data;
      },
      () => ClassroomLocalStore.addContentToClassroom(classroomId, contentId),
      { requireAuth: true }
    );
  },

  async removeContentFromClassroom(classroomId, contentId) {
    return ClassroomSupabaseStore.withFallback(
      "bucketItems",
      async (context) => {
        const bucket = await ClassroomSupabaseStore.ensureBucket(context, classroomId);
        if (!bucket) {
          return ClassroomLocalStore.removeContentFromClassroom(classroomId, contentId);
        }

        const { error } = await context.client
          .from(ClassroomSupabaseStore.TABLES.bucketItems)
          .delete()
          .eq("bucket_id", bucket.id)
          .eq("content_id", contentId);

        if (error) throw error;
        return { success: true };
      },
      () => ClassroomLocalStore.removeContentFromClassroom(classroomId, contentId),
      { requireAuth: true }
    );
  },

  async getClassroomContent(classroomId) {
    return ClassroomSupabaseStore.withFallback(
      "bucketItems",
      async (context) => {
        const bucket = await ClassroomSupabaseStore.ensureBucket(context, classroomId);
        if (!bucket) {
          return [];
        }

        const { data, error } = await context.client
          .from(ClassroomSupabaseStore.TABLES.bucketItems)
          .select("content_id, title, item_type, subject, grade_level, minutes")
          .eq("bucket_id", bucket.id)
          .order("created_at", { ascending: true });

        if (error) throw error;

        return (data || []).map((row) => ({
          id: row.content_id,
          title: row.title,
          type: row.item_type || "Content",
          subject: row.subject || "",
          level: row.grade_level || "",
          minutes: Number(row.minutes || 0)
        }));
      },
      () => ClassroomLocalStore.getClassroomContent(classroomId),
      { requireAuth: true }
    );
  },

  async generateAiFeedback(classroomId) {
    const classroom = await this.getClassroomById(classroomId);
    if (!classroom) {
      throw new Error("Classroom not found.");
    }

    const [students, assignments, submissions] = await Promise.all([
      this.getStudentsByClassroom(classroomId),
      this.getAssignmentsByClassroom(classroomId),
      this.getSubmissionsByClassroom(classroomId)
    ]);
    const feedback = ClassroomSupabaseStore.buildFeedback(classroom, students, assignments, submissions);

    return ClassroomSupabaseStore.withFallback(
      "aiFeedbackLogs",
      async ({ client, user }) => {
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.aiFeedbackLogs)
          .insert({
            classroom_id: classroomId,
            created_by: user.id,
            summary: feedback.summary,
            payload: {
              recommendations: feedback.recommendations,
              generatedAt: feedback.generatedAt,
              source: "mock"
            }
          })
          .select("id, classroom_id, created_at, summary, payload")
          .single();

        if (error) throw error;

        return {
          id: data.id,
          classroomId: data.classroom_id,
          generatedAt: data.created_at,
          summary: data.summary,
          recommendations: Array.isArray(data.payload?.recommendations) ? data.payload.recommendations : feedback.recommendations
        };
      },
      () => ClassroomLocalStore.generateAiFeedback(classroomId),
      { requireAuth: true }
    );
  },

  async getLatestAiFeedback(classroomId) {
    return ClassroomSupabaseStore.withFallback(
      "aiFeedbackLogs",
      async ({ client }) => {
        const { data, error } = await client
          .from(ClassroomSupabaseStore.TABLES.aiFeedbackLogs)
          .select("id, classroom_id, created_at, summary, payload")
          .eq("classroom_id", classroomId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
          id: data.id,
          classroomId: data.classroom_id,
          generatedAt: data.created_at,
          summary: data.summary,
          recommendations: Array.isArray(data.payload?.recommendations) ? data.payload.recommendations : []
        };
      },
      () => ClassroomLocalStore.getLatestAiFeedback(classroomId),
      { requireAuth: true }
    );
  },

  async getClassroomMetrics(classroomId) {
    const [students, assignments, submissions] = await Promise.all([
      this.getStudentsByClassroom(classroomId),
      this.getAssignmentsByClassroom(classroomId),
      this.getSubmissionsByClassroom(classroomId)
    ]);
    const possibleSubmissions = Math.max(students.length * assignments.length, 1);
    const totalPoints = students.reduce((sum, student) => sum + Number(student.points || 0), 0);

    return {
      studentCount: students.length,
      assignmentCount: assignments.length,
      submissionCount: submissions.length,
      completionRate: Math.round((submissions.length / possibleSubmissions) * 100),
      classAverage: students.length ? Math.round(totalPoints / students.length) : 0,
      activeStudents: students.filter((student) =>
        submissions.some((submission) => submission.studentId === student.id)
      ).length,
      totalPoints
    };
  },

  formatFileSize(bytes = 0) {
    const num = Number(bytes) || 0;
    if (num <= 0) return "0 B";
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  },

  async getTeacherCloudMaterials(classroomId = "") {
    return ClassroomSupabaseStore.withFallback(
      "submissions",
      async (context) => {
        const [materials, assignments] = await Promise.all([
          ClassroomAPI.getTeachingResources(""),
          classroomId ? ClassroomAPI.getAssignmentsByClassroom(classroomId) : Promise.resolve([])
        ]);

        return materials.map((material) => {
          const isAssigned = assignments.some((a) => {
            if (String(a.resourceId || "") === String(material.id)) return true;
            if (Array.isArray(a.resourceItems)) {
              return a.resourceItems.some((item) => String(item.resourceId || item.id) === String(material.id));
            }
            return false;
          });

          return {
            ...material,
            isAssigned
          };
        });
      },
      () => ClassroomLocalStore.getTeacherCloudMaterials(classroomId),
      { requireAuth: true }
    );
  },

  async getTeacherStorageUsage() {
    return ClassroomSupabaseStore.withFallback(
      "submissions",
      async (context) => {
        try {
          const stats = await ClassroomSupabaseStore.callServerApi("/api/teacher/storage-usage", { method: "GET" });
          if (stats && stats.data && typeof stats.data.usedBytes === "number") {
            return stats.data;
          }
          if (stats && typeof stats.usedBytes === "number") {
            return stats;
          }
        } catch (apiErr) {
          // Fallback to calculating from submissions
        }

        const resources = await ClassroomAPI.getTeachingResources("");
        const usedBytes = resources.reduce((sum, item) => sum + Number(item.fileSize || 0), 0);
        const maxBytes = 500 * 1024 * 1024;
        const remainingBytes = Math.max(0, maxBytes - usedBytes);
        const usedMb = Number((usedBytes / (1024 * 1024)).toFixed(1));
        const maxMb = 500;
        const remainingMb = Number((remainingBytes / (1024 * 1024)).toFixed(1));
        const percentage = Math.min(100, Math.round((usedBytes / maxBytes) * 100));

        return {
          usedBytes,
          maxBytes,
          usedMb,
          maxMb,
          remainingBytes,
          remainingMb,
          percentage,
          fileCount: resources.length
        };
      },
      () => ClassroomLocalStore.getTeacherStorageUsage(),
      { requireAuth: true }
    );
  },

  async findMatchingCloudMaterial({ filename, size }) {
    const materials = await this.getTeacherCloudMaterials();
    const targetName = String(filename || "").trim().toLowerCase();
    const targetSize = Number(size) || 0;

    return materials.find((res) => {
      const resFilename = String(res.originalFilename || "").trim().toLowerCase();
      const resTitle = String(res.title || "").trim().toLowerCase();
      if (targetName && (resFilename === targetName || `${resTitle}.pdf` === targetName || resTitle === targetName)) {
        return true;
      }
      if (targetSize > 0 && res.fileSize === targetSize && targetName && resFilename.endsWith(targetName.split(".").pop() || "")) {
        return true;
      }
      return false;
    }) || null;
  },

  async isMaterialAssignedToClass(resourceId, classroomId) {
    if (!resourceId || !classroomId) return false;
    const assignments = await this.getAssignmentsByClassroom(classroomId);
    return assignments.some((a) => {
      if (String(a.resourceId || "") === String(resourceId)) return true;
      if (Array.isArray(a.resourceItems)) {
        return a.resourceItems.some((item) => String(item.resourceId || item.id) === String(resourceId));
      }
      return false;
    });
  },

  async assignCloudMaterialsToClassroom({ classroomId, resourceIds = [], title, instructions = "", dueDate, points = 100 }) {
    return ClassroomSupabaseStore.withFallback(
      "assignments",
      async (context) => {
        const allMaterials = await ClassroomAPI.getTeachingResources("");
        const selected = resourceIds.map((id) => allMaterials.find((r) => String(r.id) === String(id))).filter(Boolean);

        if (!selected.length) {
          throw new Error("No materials selected to assign.");
        }

        const createdAssignments = [];
        for (let index = 0; index < selected.length; index++) {
          const res = selected[index];
          const assignmentTitle = selected.length === 1 ? (title || res.title) : (title ? `${title}: ${res.title}` : res.title);
          const resUrl = res.previewUrl || res.fileUrl || "";

          const assignment = await ClassroomAPI.createAssignment({
            classroomId,
            title: assignmentTitle,
            instructions: instructions || res.description || "",
            dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
            points: Number(points) || 100,
            assignmentType: "assignment",
            resourceItems: [{
              id: `${res.id}:${index + 1}`,
              resourceId: res.id,
              title: res.title,
              resourceType: res.resourceType || "PDF",
              fileUrl: res.fileUrl || "",
              resourceUrl: resUrl,
              previewUrl: res.previewUrl || resUrl,
              fileSize: res.fileSize || 0,
              originalFilename: res.originalFilename || ""
            }],
            resourceId: res.id,
            resourceTitle: res.title,
            resourceUrl: resUrl,
            fileUrl: res.fileUrl || "",
            status: "published"
          });
          createdAssignments.push(assignment);
        }

        return createdAssignments;
      },
      () => ClassroomLocalStore.assignCloudMaterialsToClassroom({ classroomId, resourceIds, title, instructions, dueDate, points }),
      { requireAuth: true }
    );
  },

  async createTeachingResource(resourceData) {
    return ClassroomLocalStore.createTeachingResource(resourceData);
  }
};

window.ClassroomAPI = ClassroomAPI;
