---
name: commit
description: Commit pending changes in this repo using Conventional Commits with the project scopes public, admin, and firebase. Use whenever the user asks to commit, says "commit on main", or wants a commit message written.
---

# Commit

Commit the working tree's pending changes as one or more [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

## Rules

- Commit directly on `main` unless the user names another branch. Do not create a branch first.
- Do not push unless the user asks. Never force-push unless the user explicitly asks.
- Never add attribution trailers such as `Co-Authored-By: Claude ...` or "Generated with Claude Code".
- Never skip hooks (`--no-verify`) or bypass signing.

## Steps

1. Run `git status --porcelain -uall` and `git diff` (plus `git diff --cached` if anything is staged). If nothing is pending, say so and stop.
2. Read new and changed files before staging them. Do not commit secrets (`.env`, keys, tokens, service-account JSON); stop and tell the user if any appear.
3. Group the changes into logical commits. Changes for different scopes go in separate commits unless they are one inseparable change.
4. Stage each group by explicit path (no blind `git add -A`) and commit with the message format below, passing the message through a heredoc so the body keeps its line breaks.
5. Show `git log --oneline -<n>` and `git status -sb` so the user sees the result and how far `main` is ahead of `origin`.

## Message format

```
<type>(<scope>): <description>

<body>

<footer>
```

### Type

| Type | Use for |
|---|---|
| `feat` | A new user-facing feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting with no behavior change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system, dependencies, Nx/Angular config |
| `ci` | CI configuration and scripts |
| `chore` | Tooling and housekeeping (agent skills, editor config, gitignore) |
| `revert` | Reverting an earlier commit |

### Scope

Use exactly one of these scopes, or none:

| Scope | Covers |
|---|---|
| `public` | The public-facing app: pages, components, and assets visitors see |
| `admin` | The admin app: back-office screens and tooling for managing content and users |
| `firebase` | Firebase config, security rules, indexes, Cloud Functions, emulators, and hosting setup |

Omit the scope for repo-wide changes that belong to none of them, such as shared libraries used by both apps, workspace config, or agent tooling under `.claude/`: `chore: add commit skill`. Do not invent new scopes; if a change seems to need one, ask the user whether to add it to this skill.

### Description

- Imperative mood, lowercase first letter, no trailing period: `add login form`, not `Added login form.`
- Keep the whole header line at 72 characters or fewer.

### Body

Optional. Explain what changed and why, wrapped at about 72 characters. Skip it when the header says everything.

### Breaking changes

Add `!` after the type or scope and a `BREAKING CHANGE:` footer describing the migration:

```
feat(firebase)!: require auth for all Firestore reads

BREAKING CHANGE: anonymous clients can no longer read the posts
collection; sign in before querying.
```

## Examples

```
feat(public): add hero section to home page
fix(admin): keep table filters when paging
build(firebase): add emulator config for local development
chore: add Context7 find-docs skill
docs: describe product context in PRODUCT.md
```
