# Native flowchart authoring

The `flowchart` case-study block is for relational behavior that is easier to understand as connected states than as prose or a stage-by-lane table.

## When to use it

Use a flowchart for product flows, branching logic, state transitions, system handoffs, operational routing, failure and recovery paths, or a compact service flow.

Keep `processMap` for a user journey or service blueprint when the reader needs to compare several attributes across the same stages. Keep `interactivePrototype` when the interaction itself is the evidence and the reader benefits from clicking through real screen states.

Do not use a flowchart only to make a linear list look more visual.

## Layout modes

### Basic

Use `mode: basic` when the flow is mainly one product or decision path.

- `column` sets the left-to-right stage.
- `row` sets the branch row.
- Keep the main path on row 1 when possible.
- Put parallel alternatives in the same column on different rows.
- A later node can converge the branches again.

### Swimlane

Use `mode: swimlane` when responsibility or system layer matters.

- Define `lanes` in top-to-bottom reading order.
- Give every node a `laneKey` matching one lane.
- `column` still sets the left-to-right stage.
- `row` is ignored.
- Useful lane sets include User / UI / State / Backend, Merchant / Operations / Risk, or Customer / Frontstage / Backstage / Supporting system.

Prefer four to six lanes. More than that usually belongs in a process map table.

## Node types

- `start` for entry states.
- `process` for actions or ordinary product states.
- `decision` for a real branch or rule check.
- `system` for saved state, APIs, backstage processing, or invisible product behavior.
- `end` for completion or handoff.

`badge` is the small visible category label. Keep it short, such as `UI`, `state`, `rule`, `API`, or `handoff`.

Use `emphasis` only on nodes that carry the main product idea. A diagram with every node emphasized has no hierarchy.

## Connectors

Every connector uses node keys through `from` and `to`. Position is automatic.

Use a short `label` only when the path needs meaning, such as `complete`, `not yet`, `same session`, `retry`, or `approved`.

Use `solid` for the normal path. Use `dashed` for optional paths, later-session paths, retries, or secondary loops.

Use `emphasis` for the critical path rather than styling every connector heavily.

## Writing

Node labels should be short enough to scan. Put the explanation in `description`.

Do not expose internal implementation IDs in visible copy. The node `key` exists only for authoring and wiring.

Indonesian should use common product terms when they are more natural than forced translations. English and Indonesian should be written independently rather than translated sentence by sentence.

## Choosing between portfolio blocks

Use a journey table when the comparison across stages is the evidence.

Use a flowchart when relationships and transitions are the evidence.

Use an interactive prototype when sequence, choice, persistence, recovery, or UI state should be experienced directly.

Use Artifact Explorer when several parallel artifacts need progressive disclosure.

Use DataViz only when quantitative evidence exists.

A case study can combine these, but each block should explain a different layer of the work.
