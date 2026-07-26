export type JournalTemplateType =
  | "daily_reflection"
  | "weekly_review"
  | "decision_log"
  | "research_log"
  | "meeting_note";

export interface JournalTemplateSpec {
  type: JournalTemplateType;
  title: string;
  description: string;
  icon: string;
  defaultMarkdown: string;
  prompts: string[];
}

export const JOURNAL_TEMPLATES: Record<JournalTemplateType, JournalTemplateSpec> = {
  daily_reflection: {
    type: "daily_reflection",
    title: "Daily Reflection",
    description: "End-of-day review of highlights, challenges, and learnings.",
    icon: "Sun",
    prompts: ["What went well today?", "What was challenging?", "What is one thing I learned?"],
    defaultMarkdown: `# Daily Reflection

## Highlights & Wins
- 

## Challenges & Friction
- 

## Key Learnings
- 

## Tomorrow's Priority
- [ ] 
`,
  },
  weekly_review: {
    type: "weekly_review",
    title: "Weekly Review",
    description: "High-level retrospective on major projects and focus areas.",
    icon: "Calendar",
    prompts: ["Key achievements this week?", "What fell behind?", "Top 3 priorities next week?"],
    defaultMarkdown: `# Weekly Review

## Strategic Accomplishments
- 

## Unresolved Blockers
- 

## Next Week Top 3 Goals
1. 
2. 
3. 
`,
  },
  decision_log: {
    type: "decision_log",
    title: "Decision Log",
    description: "Document context, trade-offs, and rationale for key decisions.",
    icon: "GitFork",
    prompts: ["What decision was made?", "What alternatives were considered?", "Why this path?"],
    defaultMarkdown: `# Decision Log: [Title]

## Context & Problem Statement
- 

## Decision Taken
- 

## Alternatives & Trade-offs
- **Alternative A**: 
- **Alternative B**: 

## Expected Outcome & Review Date
- 
`,
  },
  research_log: {
    type: "research_log",
    title: "Research Log",
    description: "Structured synthesis of papers, articles, or technical investigations.",
    icon: "BookOpen",
    prompts: ["Core hypothesis?", "Key findings?", "Open questions?"],
    defaultMarkdown: `# Research Log: [Topic / Title]

## Research Question / Objective
- 

## Key Findings & Quotes
> 

## Synthesis & Takeaways
- 

## Open Questions & Next Steps
- [ ] 
`,
  },
  meeting_note: {
    type: "meeting_note",
    title: "Meeting Note",
    description: "Attendees, agenda items, key takeaways, and action items.",
    icon: "Users",
    prompts: ["Who attended?", "Key points discussed?", "Assigned action items?"],
    defaultMarkdown: `# Meeting: [Topic]

**Attendees**: 

## Agenda & Discussion Points
- 

## Key Decisions
- 

## Action Items
- [ ] 
`,
  },
};
