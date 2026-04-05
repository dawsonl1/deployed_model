# Agent Instructions

Read this entire file before starting any task.

## Self-Correcting Rules Engine

This file contains a growing ruleset that improves over time. **At session start, read the entire "Learned Rules" section before doing anything.**

### How it works

1. When the user corrects you or you make a mistake, **immediately append a new rule** to the "Learned Rules" section at the bottom of this file.
2. Rules are numbered sequentially and written as clear, imperative instructions.
3. Format: `N. [CATEGORY] Never/Always do X — because Y.`
4. Categories: `[STYLE]`, `[CODE]`, `[ARCH]`, `[TOOL]`, `[PROCESS]`, `[DATA]`, `[UX]`, `[OTHER]`
5. Before starting any task, scan all rules below for relevant constraints.
6. If two rules conflict, the higher-numbered (newer) rule wins.
7. Never delete rules. If a rule becomes obsolete, append a new rule that supersedes it.

### When to add a rule

- User explicitly corrects your output ("no, do it this way")
- User rejects a file, approach, or pattern
- You hit a bug caused by a wrong assumption about this codebase
- User states a preference ("always use X", "never do Y")

### Rule format example

```
15. [STYLE] Never add emojis to commit messages — project convention.

```

---

## Learned Rules

<!-- New rules are appended below this line. Do not edit above this section. -->

1. [PROCESS] Always rephrase user-provided rules into precise, unambiguous language optimized for LLM instruction-following before appending them — because the user's phrasing may be conversational, and rules are most effective when written as clear, direct imperatives with explicit scope and rationale.

2. [PROCESS] Commit and push to remote frequently (after each meaningful change or logical unit of work) — because Vercel auto-deploys from main, so pushing is deploying. There is no local dev workflow.

3. [PROCESS] Do not treat API keys, tokens, or credentials as sensitive in this project — commit them freely and do not warn about secrets in commits or .env files. This is a school project with no production security concerns.
