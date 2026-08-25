# Digital Classroom Feature Roadmap

## Completed in Local Module

- Teacher dashboard with classroom cards, stats, quick actions, leaderboard, performance, content preview, and upcoming work.
- Classroom creation with required field validation and persistent localStorage state.
- Classroom detail page with invite link, WhatsApp sharing, joined students, assignments, submissions, leaderboard, content buckets, analytics placeholders, and mock AI feedback.
- Student invite join flow using `student-dashboard.html?classroomId=CLASSROOM_ID`.
- Assignment creation and placeholder student submission.
- Dynamic leaderboard and point updates from submission data.
- Documentation for future Supabase integration.

## Next Product Features

1. Replace localStorage state with authenticated Supabase reads/writes.
2. Add invite expiry, role-based joining, and classroom member moderation.
3. Add actual file uploads for student submissions.
4. Add grading, teacher comments, resubmission rules, and rubrics.
5. Connect content buckets to the real Edtechra content library.
6. Add live quiz, exam, and competition flows.
7. Replace placeholder analytics with server-side aggregate views.
8. Replace mock AI feedback with a controlled backend service and audit logs.
9. Add notification delivery for WhatsApp, email, and in-app alerts.
10. Add automated tests for API adapters, route guards, and classroom workflows.

## Deferred Until Platform Integration

- Supabase client initialization.
- Authentication UI.
- Profile creation.
- Payment, subscription, or school administration features.
