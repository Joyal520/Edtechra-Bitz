# Future Supabase Database Schema

This schema is not connected yet. It documents the expected backend shape for the future Edtechra integration.

## profiles

Purpose: Existing Edtechra user profile table for teachers, students, admins, and guardians.
Key fields: `id`, `auth_user_id`, `full_name`, `role`, `school_id`, `avatar_url`, `created_at`.
Relationships: Referenced by classroom ownership, membership, submissions, and points.
RLS/security: Users can read/update their own profile; admins can manage school profiles; classroom reads should be scoped through membership.

## classrooms

Purpose: Teacher-created classroom records.
Key fields: `id`, `teacher_id`, `name`, `subject`, `grade_level`, `description`, `theme`, `created_at`, `archived_at`.
Relationships: `teacher_id` references `profiles.id`; parent for members, invites, buckets, assignments, quizzes, exams, and competitions.
RLS/security: Teachers can manage owned classrooms; members can read classrooms they belong to.

## classroom_members

Purpose: Membership roster for teachers, co-teachers, and students.
Key fields: `id`, `classroom_id`, `profile_id`, `role`, `status`, `joined_at`.
Relationships: Joins `profiles` to `classrooms`.
RLS/security: Teachers can manage members in owned classrooms; students can read their own memberships; roster visibility should require membership.

## classroom_invites

Purpose: Track shareable invite links and WhatsApp join flows.
Key fields: `id`, `classroom_id`, `token_hash`, `created_by`, `expires_at`, `max_uses`, `uses`, `is_active`, `created_at`.
Relationships: Belongs to `classrooms`; creator references `profiles`.
RLS/security: Teachers can create/revoke invites for owned classrooms; public join endpoint validates token server-side without exposing raw hashes.

## content_buckets

Purpose: Named classroom collections of Edtechra content.
Key fields: `id`, `classroom_id`, `title`, `description`, `created_by`, `created_at`.
Relationships: Belongs to `classrooms`; parent for `bucket_items`.
RLS/security: Teachers can manage buckets; members can read assigned buckets.

## bucket_items

Purpose: Content entries assigned to a classroom bucket.
Key fields: `id`, `bucket_id`, `content_id`, `content_type`, `sort_order`, `assigned_at`.
Relationships: Belongs to `content_buckets`; references Edtechra content catalog records.
RLS/security: Teachers can insert/delete for owned classrooms; students can read items through classroom membership.

## assignments

Purpose: Teacher-created tasks for classroom members.
Key fields: `id`, `classroom_id`, `title`, `instructions`, `due_at`, `points`, `created_by`, `is_deleted`, `deleted_at`, `updated_at`, `created_at`, `published_at`.
Relationships: Belongs to `classrooms`; parent for assignment submissions.
RLS/security: Teachers manage assignments in owned classrooms; students read active, non-deleted assignments for joined classrooms.

## assignment_submissions

Purpose: Student assignment completion, upload metadata, scoring, and feedback.
Key fields: `id`, `assignment_id`, `classroom_id`, `student_id`, `status`, `file_url`, `text_response`, `points_awarded`, `teacher_feedback`, `submitted_at`, `graded_at`.
Relationships: References `assignments`, `classrooms`, and student `profiles`.
RLS/security: Students can insert/read their own submissions; teachers can read/grade submissions for owned classrooms.

## live_quizzes

Purpose: Real-time or scheduled classroom quizzes.
Key fields: `id`, `classroom_id`, `title`, `questions_json`, `starts_at`, `ends_at`, `created_by`, `status`.
Relationships: Belongs to `classrooms`; parent for quiz results.
RLS/security: Teachers manage quizzes; students read active quizzes for joined classrooms.

## quiz_results

Purpose: Student quiz attempts and scores.
Key fields: `id`, `quiz_id`, `student_id`, `answers_json`, `score`, `points_awarded`, `submitted_at`.
Relationships: References `live_quizzes` and student `profiles`.
RLS/security: Students read their own results; teachers read results for owned classrooms.

## exams

Purpose: Formal classroom exams.
Key fields: `id`, `classroom_id`, `title`, `instructions`, `exam_config_json`, `starts_at`, `ends_at`, `created_by`, `status`.
Relationships: Belongs to `classrooms`; parent for exam results.
RLS/security: Teachers manage exams; students read available exams for joined classrooms.

## exam_results

Purpose: Student exam attempts, scores, and review status.
Key fields: `id`, `exam_id`, `student_id`, `answers_json`, `score`, `grade`, `review_status`, `submitted_at`, `graded_at`.
Relationships: References `exams` and student `profiles`.
RLS/security: Students read their own results; teachers read and grade results for owned classrooms.

## competitions

Purpose: Classroom or school-level challenge events.
Key fields: `id`, `classroom_id`, `title`, `description`, `rules`, `starts_at`, `ends_at`, `points_pool`, `created_by`.
Relationships: Optionally belongs to a classroom; parent for competition submissions.
RLS/security: Teachers/admins manage competitions; visibility depends on classroom or school membership.

## competition_submissions

Purpose: Student entries for competitions.
Key fields: `id`, `competition_id`, `student_id`, `submission_url`, `text_response`, `score`, `rank`, `points_awarded`, `submitted_at`.
Relationships: References `competitions` and student `profiles`.
RLS/security: Students manage their own submissions until lock time; teachers/admins score visible competitions.

## student_points

Purpose: Auditable points ledger for leaderboard calculations.
Key fields: `id`, `classroom_id`, `student_id`, `source_type`, `source_id`, `points`, `reason`, `awarded_by`, `awarded_at`.
Relationships: References `classrooms`, student `profiles`, and optional source records such as submissions or quiz results.
RLS/security: Points should be inserted by trusted server functions or teachers only; students can read their own ledger and classroom leaderboard summaries.

## ai_feedback_logs

Purpose: Audit log for AI-generated classroom insights and feedback.
Key fields: `id`, `classroom_id`, `requested_by`, `input_summary_json`, `model`, `prompt_version`, `output_text`, `created_at`.
Relationships: Belongs to `classrooms`; requester references `profiles`.
RLS/security: Teachers can create/read logs for owned classrooms; students should not see teacher-only analytics unless explicitly shared.

## classroom_messages

Purpose: Teacher announcements/messages shown in classroom teacher and student dashboards.
Key fields: `id`, `classroom_id`, `teacher_id`, `message`, `is_pinned`, `is_deleted`, `created_at`, `updated_at`, `edited_at`, `deleted_at`, `expires_at`.
Relationships: Belongs to `classrooms`; `teacher_id` references `profiles.id`; students read through `classroom_members`.
RLS/security: Teachers can insert/update/soft-delete messages for classrooms they own; joined students can read active, non-deleted, non-expired messages only.
