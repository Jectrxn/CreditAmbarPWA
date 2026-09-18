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

## Visual & UX/UI Inspection Protocol (MANDATORY)

- **Mandatory Visual Mode (Antigravity Browser Control)**: ALWAYS use the visual Antigravity Browser Control mode when performing UX/UI tests. **Exception/Clarification:** When using the raw `chrome_devtools` MCP server or delegating to subagents in Antigravity 2.0, the browser launches in standard automated mode (showing "Chrome is being controlled by automated software") and CANNOT display the IDE's custom blue glow or fake cursor overlay. The agent MUST explicitly clarify this limitation to the user upfront so they don't expect the overlay, while guaranteeing that rigorous visual screenshot analysis is still being performed.
- **Mandatory Screenshot Analysis**: Whenever taking, generating, or receiving a screenshot (via `/browser`, manual upload, or automated tools), the agent MUST proactively and thoroughly analyze the captured images and perform a UX/UI inspection.
  - Critique visual hierarchy, Liquid Glass aesthetic consistency (translucency, specular highlights, refraction), contrast, typography, and spacing.
  - Check for visual glitches, clipping, awkward positioning, or occlusion by floating components (such as the bottom dock or Speed Dial).
  - Validate semantic coherence (e.g. icons, colors matching operational state) and mobile ergonomics (Thumb Zone).
- **Post-Change Visual Self-Review**: After writing or modifying any UI/UX code, the agent MUST NOT assume the code is visually perfect. It MUST automatically launch the visual browser, navigate to the modified component, and perform a strict self-review to catch even minor visual errors (clipping, padding issues, translucency bugs) before handing the task back to the user.
- **Proactive Design Recommendations**: After completing the inspection, the agent MUST always proactively propose concrete, prioritized recommendations and enhancements to elevate the visual polish, clarity, and overall user experience.

## Home Dashboard Design Rules

- **Centralized Global Action Hub**: The floating elevated `+` button in `TabBar` is the primary global launcher for actions (*Nuevo Fiado*, *Registrar Abono*, *Nuevo Cliente*).
- **Home Action Buttons Deprecation**: In `HomePage`, dedicated buttons for *Nuevo Fiado* and *Registrar Abono* are no longer important/needed; removing or minimizing them avoids action duplication and keeps the home view focused on financial metrics and debt tracking.

## Master Liquid Glass Design System Standard (MANDATORY)

To prevent opaque/milky plastic surfaces and ensure genuine optical refraction (objects blurring realistically as they pass behind floating glass):

1. **Calibrated Translucency Formula**:
   - **Floating Docks & Nav Bars (`TabBar`, `TopBar`)**: Use `bg-white/[0.18]` to `bg-white/[0.24]` (default `bg-white/[0.20]`). NEVER exceed `bg-white/[0.45]` on docks, as high opacity destroys transparency and produces a milky, solid-looking block.
   - **Modals & Action Sheets (`LiquidModal`, `CashierLoginModal`, Speed Dial)**: Use `bg-white/[0.75]` to `bg-white/[0.82]` with `backdrop-blur-[24px]` for high-contrast legibility of inputs and forms.
2. **Backdrop Blur & Saturation Pairing**:
   - Always pair `backdrop-blur-[18px]` to `backdrop-blur-[20px]` with `backdrop-saturate-[180%]` to `backdrop-saturate-[200%]`.
   - Avoid excessive blur radii (> 25px) on floating bars, because excessive blur dissolves text and card edges into an indistinguishable white smudge. 18px-20px preserves recognizable, elegant shape refraction.
3. **Directional Specular Lighting**:
   - **Top Rim (Specular Highlight)**: `border-t-white/95` or `border-t-white/90` with inner highlight `inset_0_1.5px_2px_rgba(255,255,255,0.95)` to simulate top-down ambient light reflecting off the bevel.
   - **Lateral & Bottom Borders**: Soft falloff (`border-x-white/35 border-b-white/15`).
   - **Top Specular Reflection Span**: Include an absolute top-half specular gradient (`bg-gradient-to-b from-white/50 via-white/10 to-transparent pointer-events-none`).
4. **Zero Blocking Layers (Stacking Discipline)**:
   - NEVER place fixed gradient overlays or auxiliary blur masks at an intermediate `z-index` (e.g. `z-30`) between the scrolling content (`z-10`) and the glass dock (`z-40`). Any layer between them blinds the `backdrop-filter` from sampling the real content underneath.
5. **Component Application Targets**:
   - `TabBar` (Dock inferior)
   - `TopBar` (Barra superior)
   - `ActionCapsule` / Speed Dial (Lanzador de acciones)
   - `LiquidModal` / `CashierLoginModal` (Modales y Bottom Sheets)
   - `HeroCard` y tarjetas métricas (Paneles de cristal líquido con wells reflectivos)

