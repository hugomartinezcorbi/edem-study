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
