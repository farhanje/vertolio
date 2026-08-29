# Portfolio artifact authoring

This file records how the reusable case-study artifacts should be chosen. The blocks are a toolbox, not a fixed case-study template.

## Artifact Explorer

### Horizontal tabs

Use when the reader is comparing a small number of peer views and the labels are short.

Good fits include:

- Flow A and Flow B
- Before and after
- Research, design, result
- Two or three screenshots from the same level of the work

Horizontal tabs are the default.

### Vertical tabs

Use when the tabs behave more like an index into a set of related artifacts. This is useful when there are three to six views, labels need more room, or the active artifact deserves most of the horizontal width.

Good fits include:

- Research themes
- Several benchmark categories
- Design-system component states
- Different user or merchant types
- A set of related specification views
- Workshop outputs grouped by topic

On smaller screens the vertical rail collapses into a horizontal scrollable tab bar.

Do not use vertical tabs only to make a page look different. Use them when the information architecture benefits from a persistent index.

## Native Flowchart

Every node uses a Stage value for the main sequence. Basic flows also use Branch position. Swimlane flows use laneKey instead of Branch position.

### Horizontal direction

Stage runs from left to right.

Use for:

- Short user flows
- Transaction state models
- Decision trees with a compact main path
- A system sequence that fits comfortably across the page

In Basic mode, Branch position becomes the visual row.

In Swimlane mode, lanes run top to bottom and Stage runs left to right.

### Vertical direction

Stage runs from top to bottom.

Use for:

- Long onboarding or approval sequences
- Operational handoffs
- Review and escalation processes
- Flows with several stages that would become too wide horizontally
- Mobile-first or document-like process reading

In Basic mode, Branch position becomes the visual column.

In Swimlane mode, lanes run left to right across the top and Stage runs top to bottom. This is useful when the process is chronological and the reader needs to see which actor owns each step.

## Choosing between Process Map and Flowchart

Use a Process Map or journey table when the evidence comes from comparing attributes across stages. Examples include user goal, pain point, emotion, frontstage, backstage, owner, or opportunity.

Use a Flowchart when the evidence is the relationship between actions, states, decisions, handoffs, branches, loops, or system transitions.

Use an Interactive Prototype when the interaction itself is the evidence. A flowchart can sit beside it when the underlying state or system behavior needs separate explanation.

## Portfolio-level rule

Do not repeat one artifact structure simply because it worked in the previous case. Choose the representation that makes the specific project's reasoning easiest to inspect.
