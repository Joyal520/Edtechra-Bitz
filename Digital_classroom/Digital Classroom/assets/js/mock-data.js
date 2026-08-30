const MOCK_DATA = {
  version: 2,
  classrooms: [
    {
      id: "class_1",
      name: "Advanced Physics 101",
      subject: "Science",
      grade: "High School",
      description: "Quantum mechanics and relativity foundations for advanced learners.",
      theme: "theme-blue",
      createdAt: "2026-05-08T05:45:00.000Z",
      bucketItems: ["content_1", "content_3"]
    },
    {
      id: "class_2",
      name: "Creative Writing Studio",
      subject: "English",
      grade: "Middle School",
      description: "Structured storytelling, peer review, and expressive writing practice.",
      theme: "theme-purple",
      createdAt: "2026-05-08T05:50:00.000Z",
      bucketItems: ["content_2"]
    }
  ],
  students: [
    { id: "stu_1", name: "Alex Johnson", classroomId: "class_1", points: 150, avatar: "A", joinedAt: "2026-05-08T06:00:00.000Z" },
    { id: "stu_2", name: "Sarah Connor", classroomId: "class_1", points: 220, avatar: "S", joinedAt: "2026-05-08T06:05:00.000Z" },
    { id: "stu_3", name: "Marcus Cole", classroomId: "class_2", points: 80, avatar: "M", joinedAt: "2026-05-08T06:10:00.000Z" },
    { id: "stu_4", name: "Elena Rodriguez", classroomId: "class_2", points: 120, avatar: "E", joinedAt: "2026-05-08T06:15:00.000Z" }
  ],
  assignments: [
    {
      id: "ass_1",
      classroomId: "class_1",
      title: "Quantum Mechanics Quiz",
      instructions: "Answer the short response questions about wave-particle duality.",
      points: 100,
      dueDate: "2026-05-15",
      createdAt: "2026-05-08T06:20:00.000Z"
    },
    {
      id: "ass_2",
      classroomId: "class_1",
      title: "Relativity Reflection",
      instructions: "Write one page explaining time dilation with a real-world example.",
      points: 120,
      dueDate: "2026-05-20",
      createdAt: "2026-05-08T06:25:00.000Z"
    },
    {
      id: "ass_3",
      classroomId: "class_2",
      title: "Short Story Draft",
      instructions: "Submit the first draft of a 600-word short story.",
      points: 90,
      dueDate: "2026-05-12",
      createdAt: "2026-05-08T06:30:00.000Z"
    }
  ],
  spreeItemProgress: [],
  classroomMessages: [],
  submissions: [
    {
      id: "sub_1",
      assignmentId: "ass_1",
      classroomId: "class_1",
      studentId: "stu_2",
      status: "submitted",
      pointsAwarded: 100,
      submittedAt: "2026-05-08T06:45:00.000Z",
      note: "Placeholder submission"
    },
    {
      id: "sub_2",
      assignmentId: "ass_3",
      classroomId: "class_2",
      studentId: "stu_3",
      status: "submitted",
      pointsAwarded: 90,
      submittedAt: "2026-05-08T06:50:00.000Z",
      note: "Placeholder submission"
    },
    {
      id: "sub_3",
      assignmentId: "ass_3",
      classroomId: "class_2",
      studentId: "stu_4",
      status: "submitted",
      pointsAwarded: 90,
      submittedAt: "2026-05-08T06:55:00.000Z",
      note: "Placeholder submission"
    }
  ],
  contentItems: [
    {
      id: "content_1",
      title: "Interactive Physics Primer",
      type: "Lesson",
      subject: "Science",
      level: "High School",
      minutes: 18
    },
    {
      id: "content_2",
      title: "Narrative Arc Builder",
      type: "Worksheet",
      subject: "English",
      level: "Middle School",
      minutes: 25
    },
    {
      id: "content_3",
      title: "Relativity Visual Notes",
      type: "Video",
      subject: "Science",
      level: "High School",
      minutes: 12
    },
    {
      id: "content_4",
      title: "Algebra Fluency Pack",
      type: "Practice",
      subject: "Mathematics",
      level: "Grade 8",
      minutes: 20
    }
  ],
  teachingResources: [
    {
      id: "res_1",
      title: "Present Simple Grammar",
      originalFilename: "grammar_unit_01.pdf",
      fileUrl: "https://pub-sample.r2.dev/projects/teacher/grammar_unit_01.pdf",
      filePath: "projects/teacher/grammar_unit_01.pdf",
      fileSize: 4404019,
      fileType: "pdf",
      mimeType: "application/pdf",
      category: "Grammar",
      resourceType: "PDF",
      description: "Comprehensive guide and exercises for Present Simple tense.",
      createdAt: "2026-08-28T10:30:00.000Z"
    },
    {
      id: "res_2",
      title: "Reading Practice Unit 2",
      originalFilename: "reading_unit_02.pdf",
      fileUrl: "https://pub-sample.r2.dev/projects/teacher/reading_unit_02.pdf",
      filePath: "projects/teacher/reading_unit_02.pdf",
      fileSize: 9122611,
      fileType: "pdf",
      mimeType: "application/pdf",
      category: "Reading",
      resourceType: "PDF",
      description: "Reading comprehension passages with questions.",
      createdAt: "2026-08-25T14:15:00.000Z"
    },
    {
      id: "res_3",
      title: "Vocabulary Worksheet",
      originalFilename: "vocabulary.pdf",
      fileUrl: "https://pub-sample.r2.dev/projects/teacher/vocabulary.pdf",
      filePath: "projects/teacher/vocabulary.pdf",
      fileSize: 2202009,
      fileType: "pdf",
      mimeType: "application/pdf",
      category: "Vocabulary",
      resourceType: "PDF",
      description: "Weekly vocabulary building worksheet.",
      createdAt: "2026-08-20T09:00:00.000Z"
    }
  ],
  aiFeedbackLogs: []
};

window.MOCK_DATA = MOCK_DATA;
