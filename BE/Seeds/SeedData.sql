BEGIN;

-- ---------------------------------------------------------------------------
-- Users (password for all test users: "password")
-- bcrypt hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZagG5rXxR4rWuHf4iG8xM8/5jY6e.
-- ---------------------------------------------------------------------------
INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'student01',  'student01@example.com',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZagG5rXxR4rWuHf4iG8xM8/5jY6e.', 'Student',  NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'teacher01',  'teacher01@example.com',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZagG5rXxR4rWuHf4iG8xM8/5jY6e.', 'Teacher',  NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'orgadmin01', 'orgadmin01@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZagG5rXxR4rWuHf4iG8xM8/5jY6e.', 'OrgAdmin', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', 'sysadmin01', 'sysadmin01@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZagG5rXxR4rWuHf4iG8xM8/5jY6e.', 'SysAdmin', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Organization and membership
-- ---------------------------------------------------------------------------
INSERT INTO organizations (id, name, address, slug, owner_id, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'Demo Organization', '123 Demo Street', 'demo-org', '00000000-0000-0000-0000-000000000003', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  slug = EXCLUDED.slug,
  owner_id = EXCLUDED.owner_id,
  updated_at = NOW();

INSERT INTO members (id, user_id, org_id, role, join_date, created_at)
VALUES
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'Student', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000101', 'Teacher', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000101', 'Admin',   NOW(), NOW())
ON CONFLICT (user_id, org_id) DO UPDATE SET
  role = EXCLUDED.role,
  join_date = NOW();

-- ---------------------------------------------------------------------------
-- Course, module, and content structure
-- ---------------------------------------------------------------------------
INSERT INTO courses (id, org_id, created_by, title, description, course_code, status, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002',
   'Introduction to React', 'Learn React fundamentals with practical exercises.', 'REACT-101', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  org_id = EXCLUDED.org_id,
  created_by = EXCLUDED.created_by,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  course_code = EXCLUDED.course_code,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO modules (id, org_id, created_by, parent_id, title, description, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', NULL,
   'React Core Concepts', 'Component architecture, state, and props.', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  org_id = EXCLUDED.org_id,
  created_by = EXCLUDED.created_by,
  parent_id = EXCLUDED.parent_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO course_has_module (id, course_id, module_id, order_index, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000351', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000301', 0, NOW())
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  module_id = EXCLUDED.module_id,
  order_index = EXCLUDED.order_index;

INSERT INTO contents (id, title, content_type, status, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000401', 'React Fundamentals Quiz', 'QUIZ',      'PUBLISHED', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000402', 'React Hooks Flashcards', 'FLASHCARD', 'PUBLISHED', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000403', 'React Study Guide',      'PDF',       'PUBLISHED', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content_type = EXCLUDED.content_type,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO module_has_content (id, module_id, content_id, order_index, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000451', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000401', 0, NOW()),
  ('00000000-0000-0000-0000-000000000452', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000402', 1, NOW()),
  ('00000000-0000-0000-0000-000000000453', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000403', 2, NOW())
ON CONFLICT (id) DO UPDATE SET
  module_id = EXCLUDED.module_id,
  content_id = EXCLUDED.content_id,
  order_index = EXCLUDED.order_index;

-- ---------------------------------------------------------------------------
-- Quiz data
-- ---------------------------------------------------------------------------
INSERT INTO quizzes (id, content_id, time_limit, passing_score, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', 20, 70, NOW())
ON CONFLICT (id) DO UPDATE SET
  content_id = EXCLUDED.content_id,
  time_limit = EXCLUDED.time_limit,
  passing_score = EXCLUDED.passing_score;

INSERT INTO questions (id, quiz_id, question_text, explanation, order_index, created_at, updated_at, deleted_at)
VALUES
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000501',
   'What hook is used to store local component state?', 'useState stores local component state.', 0, NOW(), NOW(), NULL),
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000501',
   'Which hook runs side effects after render?', 'useEffect executes side effects after render.', 1, NOW(), NOW(), NULL)
ON CONFLICT (id) DO UPDATE SET
  quiz_id = EXCLUDED.quiz_id,
  question_text = EXCLUDED.question_text,
  explanation = EXCLUDED.explanation,
  order_index = EXCLUDED.order_index,
  updated_at = NOW(),
  deleted_at = NULL;

INSERT INTO question_options (id, question_id, option_text, is_correct, order_index, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000601', 'useState',  TRUE,  0, NOW()),
  ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000601', 'useEffect', FALSE, 1, NOW()),
  ('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000601', 'useMemo',   FALSE, 2, NOW()),
  ('00000000-0000-0000-0000-000000000704', '00000000-0000-0000-0000-000000000601', 'useRef',    FALSE, 3, NOW()),
  ('00000000-0000-0000-0000-000000000705', '00000000-0000-0000-0000-000000000602', 'useMemo',   FALSE, 0, NOW()),
  ('00000000-0000-0000-0000-000000000706', '00000000-0000-0000-0000-000000000602', 'useRef',    FALSE, 1, NOW()),
  ('00000000-0000-0000-0000-000000000707', '00000000-0000-0000-0000-000000000602', 'useEffect', TRUE,  2, NOW()),
  ('00000000-0000-0000-0000-000000000708', '00000000-0000-0000-0000-000000000602', 'useId',     FALSE, 3, NOW())
ON CONFLICT (id) DO UPDATE SET
  question_id = EXCLUDED.question_id,
  option_text = EXCLUDED.option_text,
  is_correct = EXCLUDED.is_correct,
  order_index = EXCLUDED.order_index;

-- ---------------------------------------------------------------------------
-- Flashcard data
-- ---------------------------------------------------------------------------
INSERT INTO flashcard_decks (id, content_id, theme, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000402', 'React Hooks', NOW())
ON CONFLICT (id) DO UPDATE SET
  content_id = EXCLUDED.content_id,
  theme = EXCLUDED.theme;

INSERT INTO flashcards (id, deck_id, front_text, back_text, is_mastered, mastered_at, order_index, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000801', 'useState',  'Stores local component state and triggers re-render on updates.', FALSE, NULL, 0, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000801', 'useEffect', 'Runs side effects after render and supports dependency arrays.', FALSE, NULL, 1, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  deck_id = EXCLUDED.deck_id,
  front_text = EXCLUDED.front_text,
  back_text = EXCLUDED.back_text,
  is_mastered = EXCLUDED.is_mastered,
  mastered_at = EXCLUDED.mastered_at,
  order_index = EXCLUDED.order_index,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Document, progress, and attempt sample
-- ---------------------------------------------------------------------------
INSERT INTO documents (id, content_id, created_by_user_id, file_name, file_path, file_size, file_type, is_public, created_at, updated_at, deleted_at)
VALUES
  ('00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000002',
   'react-study-guide.pdf', './uploads/documents/react-study-guide.pdf', 245760, 'PDF', TRUE, NOW(), NOW(), NULL)
ON CONFLICT (id) DO UPDATE SET
  content_id = EXCLUDED.content_id,
  created_by_user_id = EXCLUDED.created_by_user_id,
  file_name = EXCLUDED.file_name,
  file_path = EXCLUDED.file_path,
  file_size = EXCLUDED.file_size,
  file_type = EXCLUDED.file_type,
  is_public = EXCLUDED.is_public,
  updated_at = NOW(),
  deleted_at = NULL;

INSERT INTO student_progress (
  id, course_id, user_id, module_id, content_id, progress_percentage,
  is_completed, completed_at, time_spent_seconds, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000401',
   40, FALSE, NULL, 780, NOW(), NOW())
ON CONFLICT (course_id, user_id, module_id) DO UPDATE SET
  content_id = EXCLUDED.content_id,
  progress_percentage = EXCLUDED.progress_percentage,
  is_completed = EXCLUDED.is_completed,
  completed_at = EXCLUDED.completed_at,
  time_spent_seconds = EXCLUDED.time_spent_seconds,
  updated_at = NOW();

INSERT INTO quiz_attempts (id, quiz_id, user_id, score_percentage, answers, time_taken_seconds, created_at)
VALUES
  ('00000000-0000-0000-0000-000000001301', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000001',
   50, '{"00000000-0000-0000-0000-000000000601":0,"00000000-0000-0000-0000-000000000602":1}', 95, NOW())
ON CONFLICT (id) DO UPDATE SET
  quiz_id = EXCLUDED.quiz_id,
  user_id = EXCLUDED.user_id,
  score_percentage = EXCLUDED.score_percentage,
  answers = EXCLUDED.answers,
  time_taken_seconds = EXCLUDED.time_taken_seconds;

COMMIT;

