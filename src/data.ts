import { CaseStudy, ServiceItem, EngagementModel, Testimonial, OutcomeModel } from "./types";

export const OUTCOMES: OutcomeModel[] = [
  {
    id: "revenue",
    tabLabel: "Revenue Growth Modeling",
    focusTitle: "Goal A: Revenue Growth Modeling",
    focusDesc: "We find out exactly where your product is leaking money or slowing down, and we fix it.",
    targetOutcome: "TARGETED OUTCOME: PLUG SYSTEM REVENUE LEAKS",
    streams: [
      {
        label: "Audit & Assess",
        description: "Comprehensive Gap, Product, and Workflow Analysis."
      },
      {
        label: "Streamline Operations",
        description: "Mapping your business processes to find hidden blockages."
      },
      {
        label: "Engineered Fixes",
        description: "Providing actionable, structural solutions to get your revenue moving upward."
      }
    ]
  },
  {
    id: "product",
    tabLabel: "Product Strategy Architecture",
    focusTitle: "Goal B: Product Strategy Architecture",
    focusDesc: "We define the exact blueprint required to launch a successful product or enter a new market.",
    targetOutcome: "TARGETED OUTCOME: ORCHESTRATE PRODUCT STRATEGY BLUEPRINTS",
    streams: [
      {
        label: "Foundation",
        description: "Market Research, Value Statement, and MVP scoping."
      },
      {
        label: "Execution",
        description: "Milestone Roadmapping and agile Feature Prioritization."
      },
      {
        label: "Commercialization",
        description: "Data-driven Pricing, Product Placement, and Go-to-Market execution."
      }
    ]
  }
];

export const SERVICES: ServiceItem[] = [
  {
    id: "workflow",
    icon: "insights",
    title: "Workflow Optimization",
    description: "Auditing internal operational cycles to eliminate execution friction and align product roadmaps with commercial realities.",
    bullets: ["Prioritization Frameworks", "Product Requirements Structuring", "Core Pipeline Serialization"]
  },
  {
    id: "api-strategy",
    icon: "api",
    title: "System & API Strategy",
    description: "Designing scalable integration patterns, idempotent sync loops, and robust data flows for high-throughput platforms.",
    bullets: ["Integration Blueprinting", "Dependency Vector Analysis", "API Gateways Mapping"]
  },
  {
    id: "growth",
    icon: "trending_up",
    title: "Growth Activation",
    description: "Smoothing B2B SaaS onboarding journeys and establishing sustainable product-led loops for retention metrics.",
    bullets: ["Funnel Leak Detection", "Journey Friction Reductions", "Customer Metadata Standardization"]
  },
  {
    id: "prod-ops",
    icon: "settings",
    title: "Product Operations & Tech",
    description: "Bridging architectural discrepancies between visionary core code, executive targets, and actual release timelines.",
    bullets: ["Timeline Alignment Loops", "Velocity Auditing Protocols", "Critical Path Mapping"]
  },
  {
    id: "research",
    icon: "search",
    title: "Research & Discovery",
    description: "Conducting rigorous deep-dive investigations to identify shadow software spending, integration gaps, and resource leaks.",
    bullets: ["Tooling Redundancy Analysis", "Core Data Leak Audits", "Friction Mapping Sprints"]
  }
];

export const ENGAGEMENTS: EngagementModel[] = [
  {
    id: "discovery",
    number: "01 - DISCOVERY",
    name: "Discover Clarity Sprint",
    objective: "Unearth the actual structural issue behind your immediate growth symptoms through strict workflow parsing.",
    duration: "2 Weeks",
    investment: "From $900"
  },
  {
    id: "architecture",
    number: "02 - ARCHITECTURE",
    name: "Design Architecture Sprint",
    objective: "Draft clean API blueprints, database transaction architectures, and actionable transition roadmaps.",
    duration: "6-8 Weeks",
    investment: "From $5,500"
  },
  {
    id: "advisory",
    number: "03 - ADVISORY",
    name: "Sustain Strategic Advisory",
    objective: "On-demand architectural checkups and executive strategy support during implementation sprints.",
    duration: "Monthly Retainer",
    investment: "From $1,800/mo"
  }
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "case-01",
    tag: "ENTERPRISE - PRICING PLATFORM",
    value: "~40%",
    metricLabel: "LATENCY REDUCTION",
    title: "Enterprise Pricing Platform",
    description: "Led API performance, security, and efficiency optimization at Accenture, reducing calls and reclaiming 250+ annual manual hours.",
    year: 2024
  },
  {
    id: "case-02",
    tag: "LOGISTICS & INTEGRATION - SHADOWFAX",
    value: "100%",
    metricLabel: "OPERATIONAL CLARITY",
    title: "Ecosystem Integration & Visibility",
    description: "Resolved systemic friction by bridging cross-functional data silos, replacing manual firefighting with automated status visibility.",
    year: 2024
  },
  {
    id: "case-03",
    tag: "B2B SAAS - BOTPATH",
    value: "+40%",
    metricLabel: "USER SIGN-UPS GROWTH",
    title: "Systems-First Transformation",
    description: "Re-engineered a fragmented technical environment into a modular, user-centric SaaS ecosystem, unblocking high-throughput adoption.",
    year: 2024
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "t-01",
    quote: "Evangeline possesses a remarkable talent for piercing operational noise to locate true failures. Her diagnostic unblocked our strategic roadmap within days.",
    author: "Shyam.J",
    role: "Co-Founder",
    company: "Nova Tech"
  },
  {
    id: "t-02",
    quote: "The structural model structured during our sprint was more valuable than another full-time VP hire. Pristine perspective backed by high-leverage execution.",
    author: "Arun Samuel",
    role: "Founder",
    company: "techsprint"
  }
];

export const BOTTLENECK_OPTIONS = [
  "Manual work & operational overhead",
  "Broken tool integrations & data sync",
  "CRM & pipeline tracking errors",
  "Delayed product launches & roadmap gaps",
  "Slow system performance & database lag",
  "Drops in customer onboarding & conversion"
];

export const STAGE_OPTIONS = [
  "Early Traction (Pre-seed / Seed)",
  "High Growth Scale (Series A-B)",
  "Late Stage / Expansion",
  "Enterprise / Complex Systems"
];

export const TECH_STACK_PRESETS = [
  "Salesforce / HubSpot, Node.js, Stripe, PostgreSQL",
  "Next.js, Segment, AWS, Supabase, Retool",
  "Enterprise SAP, Custom Legacy API, Java, Oracle",
  "React, Zapier, Google Sheets, Airtable, Firebase",
  "Python, Django, Cohere/OpenAI, Snowflake, Mongo"
];
