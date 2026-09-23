// Shared types for StudyCircle

export interface User {
  id: number;
  email: string;
  display_name: string;
  bio: string;
  created_at: string;
}

export interface UserSubject {
  subject: string;
  role: 'studying' | 'mastered';
}

export interface Question {
  id: number;
  author_id: number;
  title: string;
  body: string;
  subject: string;
  created_at: string;
  author?: User;
  answer_count?: number;
}

export interface Answer {
  id: number;
  question_id: number;
  author_id: number;
  body: string;
  created_at: string;
  author?: User;
  vote_count?: number;
  voted_by_me?: boolean;
}

export interface Subject {
  name: string;
  question_count: number;
}
