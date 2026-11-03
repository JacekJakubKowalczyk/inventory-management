---
name: vue-component-analysis
description: Analyze a Vue 3 component or view in client/src for performance and reuse problems (reactivity, computed vs methods, v-for keys, duplicated markup) and suggest concrete optimizations. Use when asked to review, optimize, or refactor a .vue file.
---

# Vue Component Analysis

Read-only analysis. Report findings; do not edit files unless asked. If edits to a `.vue` file follow, delegate them to the `vue-expert` subagent (per CLAUDE.md).

## Steps

1. Read the target `.vue` file (default: files in `client/src/views/`). Also read `client/src/api.js` if the component fetches data.
2. Check each area below and note `file:line` for every finding.
3. Compare against sibling views for duplicated logic or markup that could become a shared component or composable.
4. Report using the format at the end.

## Checklist

- **Reactivity**: raw data in `ref`s, derived data in `computed` (not methods called in the template); no mutation of props; watchers that could be computed.
- **Lists**: `v-for` uses a unique key (`sku`, `month`, `order_id`), never the index.
- **Dates**: dates validated (`isNaN(date.getTime())`) before `.getMonth()` and similar.
- **Data fetching**: filters passed as query params through `api.js`; no redundant requests when filters are unchanged; loading and error states handled.
- **Rendering cost**: heavy work in templates, large lists without pagination, `v-if` vs `v-show` choice.
- **Reuse**: repeated cards, tables, filter bars, or formatters that appear in 2+ views.
- **Design system**: slate/gray palette, green/blue/yellow/red status colors, custom SVG charts, no emojis.

## Output format

```
Component: <path>
Findings (highest impact first):
1. <title> - <file:line> - <why it matters> - <suggested fix>
Reuse opportunities: <list or "none">
Verdict: <ok / minor / needs work>
```
