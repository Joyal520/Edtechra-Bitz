# Edtechra Digital Classroom Integration Plan

## Current Boundary

The Digital Classroom module is standalone and uses `localStorage` only. It does not create authentication, profiles, or Supabase connections. The current browser state is stored under `edtechra_dc_data`.

## Future Platform Integration

1. Mount the classroom pages inside the existing Edtechra teacher/student routes.
2. Replace `ClassroomAPI` methods with Supabase queries while keeping the UI layer unchanged where possible.
3. Map the current session teacher to the existing Edtechra `profiles` record. Do not create a second profile system.
4. Replace browser-only student identity with authenticated students or invite-token joins.
5. Move WhatsApp invite links from raw classroom ids to signed invite tokens in `classroom_invites`.
6. Store content bucket references against Edtechra content ids.
7. Replace mock AI feedback generation with a server-side job that logs prompts, inputs, model metadata, and output in `ai_feedback_logs`.

## Migration Notes

- `classrooms.bucketItems` in localStorage should become rows in `bucket_items`.
- Student entries should become `classroom_members` rows linked to `profiles`.
- Assignment completion should be inferred from `assignment_submissions`.
- Points should be written through a controlled server path into `student_points`.
- Analytics should aggregate from submissions, quizzes, exams, competitions, and point events.

## Security Notes

- Never trust classroom ids from the URL for write operations without membership checks.
- Invite joins should validate active invite records, expiry, and teacher ownership.
- Teacher-only operations should be protected by classroom ownership or teacher membership role.
- Student submissions should be insertable only by the submitting student.
