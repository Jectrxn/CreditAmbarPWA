# CreditAmbar PWA — Workspace Rules

## Proactive Slash Command & Gentle AI Guidance (MANDATORY)

Whenever the user's task or intent fits one of the specialized workflows below, proactively recommend the appropriate slash command (`/`) or Gentle AI tool/workflow to the user with a brief rationale:

- **/boost**: Recommend when the task involves complex architecture changes, high-risk refactors, deep exploratory reasoning, or multi-faceted technical tradeoffs.
- **/grill-me**: Recommend when user requirements, UI/UX designs, or business logic are underspecified or ambiguous, allowing an interactive interview to lock down specifications before coding.
- **/goal**: Recommend for long-running, autonomous tasks (e.g. overnight test-suite expansion, massive migrations) where the agent must be exhaustive and not stop until the goal is fully achieved.
- **/teamwork-preview**: Recommend when coordinating large-scale features across parallel autonomous subagents.
- **/learn**: Recommend when user preferences, corrections, or complex setup patterns need to be permanently codified.
- **/browser**: Recommend when tasks require live browser testing, DevTools auditing, or visual web interaction.
- **Gentle AI Workflows**:
  - Propose Spec-Driven Development (`sdd-propose` / OpenSpec) when creating or altering non-trivial domain features.
  - Propose `gentle-ai review start` upon completing significant changes to audit readability, resilience, and risk.
  - Propose Engram memory lookups (`mem_search` / `engram search`) when historical context or past decisions are relevant.
