export type LanguageId = "spanish" | "french" | "japanese" | "german";

export type ActivityType =
  | "multiple-choice"
  | "translation"
  | "listening"
  | "speaking";

export interface LanguageTheme {
  /** Gradient stops drawn from the language's flag colors (2-3 stops). */
  gradient: [string, string] | [string, string, string];
  /** Flag-derived accent color for text/icons on light surfaces. */
  accent: string;
}

export interface Language {
  id: LanguageId;
  name: string;
  nativeName: string;
  code: string;
  flag: string;
  description: string;
  greeting: string;
  theme: LanguageTheme;
}

export interface Unit {
  id: string;
  languageId: LanguageId;
  order: number;
  title: string;
  description: string;
}

export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  pronunciation?: string;
  partOfSpeech?: string;
}

export interface Phrase {
  id: string;
  text: string;
  translation: string;
  pronunciation?: string;
}

export interface LessonGoal {
  id: string;
  text: string;
}

interface BaseActivity {
  id: string;
  type: ActivityType;
  prompt: string;
  points: number;
}

export interface MultipleChoiceActivity extends BaseActivity {
  type: "multiple-choice";
  options: string[];
  answer: string;
}

export interface TranslationActivity extends BaseActivity {
  type: "translation";
  sourceText: string;
  acceptedAnswers: string[];
  hint?: string;
}

export interface ListeningActivity extends BaseActivity {
  type: "listening";
  phraseId: string;
  answer: string;
}

export interface SpeakingActivity extends BaseActivity {
  type: "speaking";
  phraseId: string;
  targetText: string;
}

export type Activity =
  | MultipleChoiceActivity
  | TranslationActivity
  | ListeningActivity
  | SpeakingActivity;

export interface AITeacherPrompt {
  role: string;
  objective: string;
  systemPrompt: string;
  openingMessage: string;
  suggestedTopics: string[];
}

export type LessonImageKey = "cafeScene" | "earth" | "treasure" | "palace";

export interface Lesson {
  id: string;
  unitId: string;
  languageId: LanguageId;
  order: number;
  title: string;
  description: string;
  imageKey?: LessonImageKey;
  imageUrl?: string;
  goals: LessonGoal[];
  vocabulary: VocabularyItem[];
  phrases: Phrase[];
  activities: Activity[];
  aiTeacherPrompt: AITeacherPrompt;
}
