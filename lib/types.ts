export type Semester = 1 | 2;

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  semester: Semester;
  ects: number;
  color: string;
  icon: string;
  active: boolean;
  created_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  order_index: number;
  created_at: string;
}

export type FileType = "pdf" | "docx" | "pptx" | "image" | "other";

export interface Document {
  id: string;
  subject_id: string;
  topic_id: string | null;
  user_id: string;
  filename: string;
  file_url: string;
  file_type: FileType;
  extracted_text: string | null;
  processed: boolean;
  is_exam: boolean;
  uploaded_at: string;
}

export interface ExamRecurringTopic {
  topic: string;
  frequency: number;
  exampleQuestions: string[];
}

export interface ExamInsightsContent {
  totalExams: number;
  recurringTopics: ExamRecurringTopic[];
  questionStyleNotes: string;
  difficultyProfile: string;
  lastUpdated: string;
}

export interface ExamInsights {
  id: string;
  subject_id: string;
  user_id: string;
  content: ExamInsightsContent;
  version: number;
  last_updated: string;
  generated_from: string[];
}

export interface NotesDefinition {
  term: string;
  definition: string;
}

export interface NotesSection {
  title: string;
  content: string;
  keyPoints: string[];
  definitions: NotesDefinition[];
  formulas: string[];
  examples: string[];
  connections: string;
}

export interface NotesTopic {
  id: string;
  number: number;
  title: string;
  summary: string;
  sections: NotesSection[];
  practiceQuestions: string[];
}

export interface NotesContent {
  title: string;
  lastUpdated: string;
  totalTopics: number;
  topics: NotesTopic[];
  glossary: NotesDefinition[];
  conceptMap: string;
  newConcepts?: {
    title: string;
    definition: string;
    keyPoints: string[];
    examples: string[];
    topicNumber?: number;
  }[];
}

export interface Notes {
  id: string;
  subject_id: string;
  user_id: string;
  content: NotesContent;
  version: number;
  last_updated: string;
  generated_from: string[];
}

export interface Concept {
  id: string;
  subject_id: string;
  topic_id: string | null;
  title: string;
  definition: string;
  key_points: string[];
  examples: string[];
  source_document_ids: string[];
  mastery_level: number;
  created_at: string;
  updated_at: string;
}

export type QuestionType = "multiple_choice" | "true_false" | "short_answer" | "explain";

export interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  concept_id: string;
  subject_id: string;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOption[] | null;
  correct_answer: string;
  explanation: string;
  difficulty: number;
  times_asked: number;
  times_correct: number;
  created_at: string;
}

export type StudyPhase = "fallar" | "estudiar" | "explicar" | "volver" | "completed";

export interface StudySession {
  id: string;
  user_id: string;
  subject_id: string | null;
  started_at: string;
  ended_at: string | null;
  phase: StudyPhase;
  total_questions: number;
  correct_answers: number;
  concepts_reviewed: string[];
  duration_minutes: number | null;
}

export interface Answer {
  id: string;
  session_id: string;
  question_id: string;
  concept_id: string;
  phase: string;
  user_answer: string | null;
  is_correct: boolean;
  time_spent_seconds: number | null;
  answered_at: string;
}

export interface SpacedRepetition {
  id: string;
  user_id: string;
  concept_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
  last_reviewed: string | null;
}

export interface ConceptWithProgress extends Concept {
  spaced_repetition?: SpacedRepetition;
}

// ─────────────────────────────────────────────────────────────────────────
// Social Module Types
// ─────────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  university: string | null;
  degree: string | null;
  year: number | null;
  reputation_score: number;
  is_verified: boolean;
  is_banned: boolean;
  is_muted: boolean;
  created_at: string;
}

export interface CommunitySubject {
  id: string;
  name: string;
  university: string | null;
  degree: string | null;
  description: string | null;
  member_count: number;
  is_archived: boolean;
  created_at: string;
  created_by: string | null;
}

export type CommunityRole = "member" | "moderator" | "admin";

export interface CommunityMembership {
  id: string;
  user_id: string;
  community_subject_id: string;
  role: CommunityRole;
  joined_at: string;
}

export type ChatMessageType = "text" | "file" | "image" | "note_share";
export type ModerationStatus = "approved" | "pending" | "rejected";

export interface ChatMessage {
  id: string;
  community_subject_id: string;
  user_id: string;
  content: string;
  message_type: ChatMessageType;
  file_url: string | null;
  file_name: string | null;
  reply_to_id: string | null;
  is_pinned: boolean;
  is_deleted: boolean;
  moderation_status: ModerationStatus;
  created_at: string;
  edited_at: string | null;
  // joined
  author?: UserProfile;
  reply_to?: ChatMessage;
}

export type PostType = "apuntes" | "pregunta" | "recurso" | "discusion";

export interface PostAttachment {
  filename: string;
  url: string;
  type: string;
}

export interface Post {
  id: string;
  community_subject_id: string;
  user_id: string;
  title: string;
  content: string;
  post_type: PostType;
  attachments: PostAttachment[];
  upvotes: number;
  downvotes: number;
  comment_count: number;
  is_pinned: boolean;
  is_deleted: boolean;
  moderation_status: ModerationStatus;
  created_at: string;
  edited_at: string | null;
  // joined
  author?: UserProfile;
  my_vote?: "up" | "down" | null;
}

export interface PostVote {
  id: string;
  post_id: string;
  user_id: string;
  vote_type: "up" | "down";
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  upvotes: number;
  is_deleted: boolean;
  moderation_status: ModerationStatus;
  created_at: string;
  // joined
  author?: UserProfile;
  replies?: PostComment[];
}

export type ProjectCategory = "startup" | "app" | "proyecto" | "investigacion" | "otro";
export type ProjectStatus = "open" | "closed";
export type ProjectApplicationStatus = "pending" | "accepted" | "rejected";

export interface Project {
  id: string;
  creator_id: string;
  title: string;
  tagline: string;
  description: string;
  category: ProjectCategory;
  looking_for: string[];
  status: ProjectStatus;
  member_count: number;
  applications_count: number;
  moderation_status: ModerationStatus;
  is_deleted: boolean;
  created_at: string;
  // joined
  creator?: UserProfile;
}

export interface ProjectApplication {
  id: string;
  project_id: string;
  applicant_id: string;
  pitch: string;
  status: ProjectApplicationStatus;
  likes_count: number;
  moderation_status: ModerationStatus;
  created_at: string;
  decided_at: string | null;
  // joined
  applicant?: UserProfile;
  my_like?: boolean;
}

export interface SharedNote {
  id: string;
  user_id: string;
  community_subject_id: string;
  title: string;
  description: string | null;
  file_url: string;
  extracted_text: string | null;
  content_json: NotesContent | null;
  download_count: number;
  rating_average: number;
  rating_count: number;
  tags: string[];
  is_approved: boolean;
  moderation_status: ModerationStatus;
  created_at: string;
  // joined
  author?: UserProfile;
  my_rating?: number;
}

export interface NoteRating {
  id: string;
  shared_note_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export type PdfSourceType = "own_notes" | "shared_note" | "chat_message" | "post" | "document" | "free_text";

export interface PdfSourceMaterial {
  type: PdfSourceType;
  id: string;
  label?: string;
  text?: string; // used for free_text sources
}

export type PdfStyle = "resumen_ejecutivo" | "apuntes_completos" | "guia_estudio" | "esquema";

export interface PdfContentSection {
  title: string;
  content: string;
  definitions: { term: string; definition: string }[];
  formulas: string[];
  examples: { title: string; content: string }[];
  keyPoints: string[];
  reviewQuestions: string[];
}

export interface PdfContent {
  title: string;
  subject: string;
  topics: string[];
  style: PdfStyle;
  generatedAt: string;
  sourceCount: number;
  content: {
    tableOfContents: { title: string; page: number; subsections?: string[] }[];
    sections: PdfContentSection[];
    glossary: { term: string; definition: string }[];
    summary: string;
  };
}

export interface PdfGeneration {
  id: string;
  user_id: string;
  subject_id: string | null;
  community_subject_id: string | null;
  title: string;
  source_materials: PdfSourceMaterial[];
  generated_pdf_url: string | null;
  content_json: PdfContent | null;
  created_at: string;
}

export type NotificationType =
  | "mention"
  | "reply"
  | "upvote"
  | "new_notes"
  | "comment"
  | "rating"
  | "download"
  | "moderation"
  | "project_application"
  | "project_decision";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export type ModerationContentType = "chat_message" | "post" | "comment" | "shared_note" | "project" | "project_application";
export type AiDecision = "auto_approved" | "needs_review" | "auto_rejected";

export interface ModerationQueueItem {
  id: string;
  content_type: ModerationContentType;
  content_id: string;
  user_id: string;
  community_subject_id: string | null;
  content_preview: string;
  ai_decision: AiDecision;
  ai_reason: string | null;
  ai_score: number | null;
  admin_decision: "approved" | "rejected" | null;
  admin_notes: string | null;
  decided_at: string | null;
  created_at: string;
  // joined
  author?: UserProfile;
}
