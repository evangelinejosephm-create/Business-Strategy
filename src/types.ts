export interface MetricScores {
  structuralIntegrity: number;
  workflowFriction: number;
  automationMaturity: number;
}

export interface DiagnosticResult {
  blueprint: string;
  score: string;
  metrics: MetricScores;
  tacticalUrgency: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  isFallback?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface CaseStudy {
  id: string;
  tag: string;
  value: string;
  metricLabel: string;
  title: string;
  description: string;
  year: number;
}

export interface ServiceItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  bullets: string[];
}

export interface OutcomeSubStream {
  label: string;
  description: string;
}

export interface OutcomeModel {
  id: "revenue" | "product";
  tabLabel: string;
  focusTitle: string;
  focusDesc: string;
  targetOutcome: string;
  streams: OutcomeSubStream[];
}

export interface EngagementModel {
  id: string;
  number: string;
  name: string;
  objective: string;
  duration: string;
  investment: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
}
