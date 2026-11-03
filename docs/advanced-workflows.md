# Advanced Workflows

What is in `.claude/` and how to use plugins, agent teams and worktrees in this repo.

## In this repo

| Concept | File | Try it |
|---|---|---|
| Skill | `.claude/skills/vue-component-analysis/SKILL.md` | "Analyze client/src/views/Dashboard.vue with the vue-component-analysis skill" |
| Subagent | `.claude/agents/debugger.md` | "Use the debugger agent to investigate console errors on the Dashboard page" |
| Hook | `.claude/settings.json` + `.claude/hooks/vue-reminder.js` | Ask Claude to edit any `.vue` file; after the edit it receives a reminder of the project's Vue rules |

The hook only adds context after `Edit`/`Write` on `.vue` files. It never blocks and needs only Node (already required by the client). Use `/hooks` to inspect it.

## Plugins

Plugins bundle skills, agents, commands and hooks into installable packages. Review a plugin's source before installing; it runs with your permissions.

```
/plugin marketplace add <github-url-or-owner/repo>
/plugin install <plugin-name>
/plugin            # manage installed plugins
```

Nothing is installed by this repo. To share the files above as a plugin, move them into a directory with `.claude-plugin/plugin.json` plus `skills/`, `agents/`, `hooks/`.

## Agent teams (experimental)

Multiple Claude Code instances share a task list and message each other. Enable per user in `~/.claude/settings.json` (not committed):

```json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

Restart Claude Code, then for example:

```
Create an agent team with 3 teammates to audit this app: a security auditor, a
performance analyst (server/ and client/src/views), and a UX reviewer. Have them
share findings and challenge each other's severity ratings, then produce one
prioritized action plan.
```

Use Shift+Down to cycle between teammates. Give each teammate its own files (client vs server vs tests) to avoid edit conflicts. Teams cost more tokens than a single session; use them for parallel, independent review or cross-layer work.

## Worktrees

A git worktree is a second checkout on its own branch, sharing the same repo history. This lets Claude work in parallel without touching your current branch or running dev servers.

```bash
git worktree add ../inventory-management-feature -b feature-x main
git worktree list
git worktree remove ../inventory-management-feature   # when done
```

Or ask Claude: "Use a worktree to prototype a dark mode toggle without affecting my current branch", or start a session with `claude --worktree <name>`.

Notes for this repo:
- Each worktree needs its own `npm install` in `client/` (`node_modules` is not shared).
- Use different ports if both copies run at once (defaults are 3000 and 8001).
- A branch can be checked out in only one worktree at a time.
