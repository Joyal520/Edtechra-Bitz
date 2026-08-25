// mock-data.js — Sample data for Digital Classroom
const MOCK_TEACHER = {
  id: 'teacher_001',
  name: 'Mrs. Kavindi',
  email: 'kavindi@edtechra.com',
  avatar: null,
  role: 'teacher'
};

const MOCK_CLASSROOMS = [
  {
    id: 'cls_001',
    name: 'English Language',
    subject: 'English',
    grade: 'Grade 10',
    description: 'Comprehensive English language course covering grammar, composition and literature.',
    banner: 'gradient-1',
    teacherId: 'teacher_001',
    createdAt: '2026-04-15T10:00:00Z',
    studentCount: 28,
    averageScore: 85
  },
  {
    id: 'cls_002',
    name: 'Creative Writing',
    subject: 'English',
    grade: 'Grade 9',
    description: 'Explore creative writing techniques including fiction, poetry, and essays.',
    banner: 'gradient-2',
    teacherId: 'teacher_001',
    createdAt: '2026-04-20T09:00:00Z',
    studentCount: 24,
    averageScore: 78
  },
  {
    id: 'cls_003',
    name: 'Spoken English',
    subject: 'English',
    grade: 'Grade 11',
    description: 'Improve spoken English skills through presentations, debates, and conversations.',
    banner: 'gradient-3',
    teacherId: 'teacher_001',
    createdAt: '2026-05-01T08:00:00Z',
    studentCount: 26,
    averageScore: 92
  }
];

const MOCK_STUDENTS = [
  { id: 'stu_001', name: 'Tharindu Perera', avatar: null, classroomIds: ['cls_001','cls_002'], points: 920 },
  { id: 'stu_002', name: 'Dilmi Fernando', avatar: null, classroomIds: ['cls_001'], points: 875 },
  { id: 'stu_003', name: 'Navod Jayasuriya', avatar: null, classroomIds: ['cls_001','cls_003'], points: 840 },
  { id: 'stu_004', name: 'Sithara Silva', avatar: null, classroomIds: ['cls_002','cls_003'], points: 810 },
  { id: 'stu_005', name: 'Kavindu Ratnayake', avatar: null, classroomIds: ['cls_001'], points: 790 },
  { id: 'stu_006', name: 'Amaya Wickrama', avatar: null, classroomIds: ['cls_002'], points: 765 },
  { id: 'stu_007', name: 'Heshan Bandara', avatar: null, classroomIds: ['cls_003'], points: 730 },
  { id: 'stu_008', name: 'Rashmi Kumari', avatar: null, classroomIds: ['cls_001','cls_003'], points: 710 },
  { id: 'stu_009', name: 'Dineth Gunawardena', avatar: null, classroomIds: ['cls_002'], points: 680 },
  { id: 'stu_010', name: 'Senuri Jayasinghe', avatar: null, classroomIds: ['cls_001','cls_002','cls_003'], points: 950 }
];

const MOCK_ASSIGNMENTS = [
  { id: 'asg_001', classroomId: 'cls_001', title: 'English Essay Assignment', instructions: 'Write a 500-word essay on climate change.', dueDate: '2026-05-24', points: 100, createdAt: '2026-05-08T10:00:00Z' },
  { id: 'asg_002', classroomId: 'cls_002', title: 'Short Story Draft', instructions: 'Write a short story using three literary devices.', dueDate: '2026-05-20', points: 80, createdAt: '2026-05-06T09:00:00Z' },
  { id: 'asg_003', classroomId: 'cls_003', title: 'Spoken English Test', instructions: 'Prepare a 3-minute speech on any topic.', dueDate: '2026-05-28', points: 100, createdAt: '2026-05-07T11:00:00Z' },
  { id: 'asg_004', classroomId: 'cls_001', title: 'Grammar Worksheet', instructions: 'Complete exercises on tenses and voice.', dueDate: '2026-05-18', points: 50, createdAt: '2026-05-05T08:00:00Z' },
  { id: 'asg_005', classroomId: 'cls_002', title: 'Poetry Analysis', instructions: 'Analyze the given poem and identify poetic devices.', dueDate: '2026-05-22', points: 60, createdAt: '2026-05-04T10:00:00Z' }
];

const MOCK_SUBMISSIONS = [
  { id: 'sub_001', assignmentId: 'asg_001', studentId: 'stu_001', status: 'submitted', submittedAt: '2026-05-10T14:00:00Z', score: 88 },
  { id: 'sub_002', assignmentId: 'asg_001', studentId: 'stu_002', status: 'submitted', submittedAt: '2026-05-11T09:00:00Z', score: 92 },
  { id: 'sub_003', assignmentId: 'asg_004', studentId: 'stu_001', status: 'submitted', submittedAt: '2026-05-09T16:00:00Z', score: 45 },
  { id: 'sub_004', assignmentId: 'asg_002', studentId: 'stu_004', status: 'submitted', submittedAt: '2026-05-12T10:00:00Z', score: 72 },
  { id: 'sub_005', assignmentId: 'asg_003', studentId: 'stu_003', status: 'pending', submittedAt: null, score: null }
];

const MOCK_BUCKETS = [
  { id: 'bkt_001', classroomId: 'cls_001', name: 'Grammar Resources', items: [
    { id: 'bi_001', title: 'Tenses Cheat Sheet', type: 'document', source: 'explore' },
    { id: 'bi_002', title: 'Active vs Passive Voice', type: 'video', source: 'bookmark' }
  ]},
  { id: 'bkt_002', classroomId: 'cls_002', name: 'Writing Prompts', items: [
    { id: 'bi_003', title: '50 Creative Writing Prompts', type: 'document', source: 'explore' },
    { id: 'bi_004', title: 'Story Structure Guide', type: 'article', source: 'explore' }
  ]}
];

const MOCK_LEADERBOARD = MOCK_STUDENTS
  .slice()
  .sort((a, b) => b.points - a.points)
  .map((s, i) => ({ ...s, rank: i + 1 }));

const MOCK_UPCOMING = [
  { date: '2026-05-24', month: 'May', day: '24', title: 'English Essay Assignment', classroom: 'Grade 10 - English', dueLabel: 'Due in 2 days', color: 'purple' },
  { date: '2026-05-25', month: 'May', day: '25', title: 'Live Quiz - Vocabulary', classroom: 'Grade 9 - Creative Writing', dueLabel: 'Due in 3 days', color: 'blue' },
  { date: '2026-05-28', month: 'May', day: '28', title: 'Spoken English Test', classroom: 'Grade 11 - Spoken English', dueLabel: 'Due in 6 days', color: 'green' }
];

const MOCK_AI_FEEDBACK = [
  { id: 'ai_001', classroomId: 'cls_001', type: 'exam', summary: 'Overall class performance is strong with 85% average. 3 students need attention in grammar sections. Recommend additional practice on passive voice constructions.', generatedAt: '2026-05-07T12:00:00Z' },
  { id: 'ai_002', classroomId: 'cls_002', type: 'assignment', summary: 'Creative writing submissions show improvement in narrative structure. Students should focus more on character development and dialogue authenticity.', generatedAt: '2026-05-06T15:00:00Z' }
];

const MOCK_ANALYTICS = {
  performanceDistribution: { excellent: 42, good: 38, average: 15, needsImprovement: 5 },
  assignmentCompletion: [
    { label: 'English Essay', completed: 22, total: 28 },
    { label: 'Short Story', completed: 18, total: 24 },
    { label: 'Speech Prep', completed: 24, total: 26 },
    { label: 'Grammar WS', completed: 25, total: 28 },
    { label: 'Poetry', completed: 15, total: 24 }
  ],
  averageScore: 86,
  totalStudents: 78,
  totalClassrooms: 3,
  activeAssignments: 5
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MOCK_TEACHER, MOCK_CLASSROOMS, MOCK_STUDENTS, MOCK_ASSIGNMENTS, MOCK_SUBMISSIONS, MOCK_BUCKETS, MOCK_LEADERBOARD, MOCK_UPCOMING, MOCK_AI_FEEDBACK, MOCK_ANALYTICS };
}
