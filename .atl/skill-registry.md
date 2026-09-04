# Skill Registry

> Central index of project standards, SDD workflows, and available agent skills.
> Generated for **CreditAmbar PWA** (OpenSpec Mode).

---

## 1. Registered Skills

| Skill | Category | Trigger / Scope | Description |
|---|---|---|---|
| `sdd-init` | SDD Core | `sdd init`, `iniciar sdd`, `openspec init` | Bootstraps SDD environment, tech stack detection, and OpenSpec structure |
| `sdd-explore` | SDD Core | `sdd explore`, `explorar` | Explores project architecture, dependencies, and domain boundaries |
| `sdd-propose` | SDD Core | `sdd propose`, `proponer` | Drafts feature proposals with scope, risks, and rollback strategies |
| `sdd-spec` | SDD Core | `sdd spec`, `especificar` | Creates delta specs using RFC 2119 and Given/When/Then scenarios |
| `sdd-design` | SDD Core | `sdd design`, `diseñar` | Generates system architecture, sequence diagrams, and component contracts |
| `sdd-tasks` | SDD Core | `sdd tasks`, `tareas` | Decomposes designs into atomic, testable execution tasks |
| `sdd-apply` | SDD Core | `sdd apply`, `aplicar` | Implements changes strictly following specifications and task checklists |
| `sdd-verify` | SDD Core | `sdd verify`, `verificar` | Executes validation suites, regression tests, and acceptance criteria |
| `sdd-archive` | SDD Core | `sdd archive`, `archivar` | Archives completed changes and promotes delta specs into main specs |
| `generative_ui` | Built-in | UI generation / design request | Visual component design and mobile interface generation |
| `agy-customizations` | Built-in | System configuration | Manages rules, skills, plugins, and MCP integration |
| `permissioned-github` | Built-in | GitHub operations | Governs Git PRs, issues, commits, and review workflows |

---

## 2. Compact Rules (Project Standards)

### Rule: SDD Executor Boundary
- **Trigger**: When running as any SDD phase subagent (`sdd-*`).
- **Standard**: Subagents are strictly EXECUTORS. Execute phase work directly; do not delegate or spawn subagents. Return results formatted as the standard Section D envelope.

### Rule: OpenSpec Artifact Organization
- **Trigger**: When reading or persisting specs, changes, or proposals.
- **Standard**: Store active changes in `openspec/changes/{change-name}/`. Place baseline source-of-truth specifications in `openspec/specs/{domain}/`. Archive completed changes under `openspec/changes/archive/`.

### Rule: Offline-First & Data Synchronization (CreditAmbar PWA)
- **Trigger**: Editing data storage, state management, or network queries.
- **Standard**: Store transactions and customer cache locally in IndexedDB (Dexie). All cashier operations (fiados, abonos) must succeed offline and queue for automatic background synchronization with Supabase upon reconnection.

### Rule: iOS Liquid Glass UI Conventions
- **Trigger**: Modifying Tailwind classes, UI components, or layout templates.
- **Standard**: Follow the iOS Liquid Glass design tokens: `backdrop-blur-md`, translucent glass borders (`border-white/20`), high-contrast dark text on translucent panels, minimum 44px touch targets, mobile-optimized for 390x844 viewports.

### Rule: Cash vs. Digital Payment Separation (FCC)
- **Trigger**: Modifying payment methods or transaction records.
- **Standard**: Always tag transaction payment methods as either `efectivo` (linked to Flujo de Caja Chica / FCC) or `qr_transferencia` to prevent bookkeeping mismatches with the store's primary POS.

### Rule: Role Authorization & Audit Window
- **Trigger**: Modifying customer creation, credit limits, or transaction voids.
- **Standard**: Customer creation and credit limit adjustments require Supervisor/Jefe roles. Cashiers have a 10-minute grace window for self-correction; subsequent annulments require supervisor PIN/approval with a mandatory void reason.
