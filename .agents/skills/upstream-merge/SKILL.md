---
name: upstream-merge
description: >
  Bring upstream changes (e.g. agentscope-ai/CoPaw) into a fork by reading and understanding
  upstream first, then refactoring into the local codebase, not by mechanically merging or
  pasting patches. Git merge/cherry-pick is optional transport; full-stack and multi-user checks
  apply. Triggers: fork sync, upstream merge, cherry-pick, pull upstream PR, git remote upstream.
---

# Upstream merge (fork maintenance)

Help the user bring selected changes from **upstream** into their **downstream** fork without
throwing away local work. Prefer small, reviewable steps; never rewrite published history unless
they explicitly ask.

**Git merge or cherry-pick is only an optional transport layer** (to get blobs into a branch or
to compare trees). **Do not mechanically apply upstream code** as if the goal were line-level
reconciliation. **Read upstream commits and PRs until the behavior and rationale are clear**,
then **re-implement or refactor on top of the current downstream code** (structure, naming, and
local features stay authoritative). Treat upstream diff as **specification and reference**, not
as the final shape of your patch.

Downstream work must follow the integration principles below (understand, adapt, full-stack,
multi-user).

## Integration principles (required)

These rules apply to every upstream-derived change in this fork (CoPaw backend + next-console).

1. **Understand before you port (no mechanical merge)**
   - Read upstream commits/PRs for **intent, invariants, and edge cases**, not only the diff.
   - **Default outcome** is **new or adjusted code written against the local tree**, not a
     conflict-free carry-over of upstream lines. Prefer **re-implementing or refactoring** into
     downstream patterns so existing behavior and local conventions stay coherent.
   - If the capability **already exists downstream** (same behavior), **skip** the port and
     **tell the user** explicitly so they do not duplicate work.

2. **Backend changes → check frontend**
   - If the new or changed behavior is in **backend** code, search whether **next-console** (or
     other clients) **already uses** the API or should.
   - If the UI does not use it yet, plan **frontend updates in the same integration** (routes,
     `lib/*-api`, proxy/auth headers) so the feature is actually reachable.

3. **Frontend changes → check backend**
   - If the port is **frontend-only** in upstream, verify the **downstream backend already exposes**
     the required APIs, auth, and data shapes.
   - If not, extend **CoPaw** (routers, models, multi-agent semantics) in the same effort so the UI
     is not dead or inconsistent.

4. **Multi-user system (critical)**
   - This product is **multi-user**. Every integrated feature must be reviewed for:
     **tenant/user isolation**, **authn/z** (e.g. JWT, agent scoping), **shared mutable state**,
     **rate limits**, **session/chat ownership**, and **safe defaults** when multiple users act in
     parallel.
   - Do not assume single-operator console behavior; call out gaps and fix or document mitigations.

**Suggested workflow:** read upstream change (message, PR description, tests) → summarize **what
must become true** in the product → map to **local** modules → decide **skip / adapt / full-stack**
→ **refactor or implement locally** (upstream patch is input, not the patch you ship) → run tests
and smoke **multi-user** paths where relevant.

## Prerequisites

- Git working tree clean enough to merge or cherry-pick (stash or commit WIP first).
- Optional: `gh` (GitHub CLI) for listing PR commits and inspecting diffs without leaving the terminal.

## Concepts

| Goal                                    | Typical approach                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Broad sync with upstream default branch | Merge or rebase for **comparison / starting point**; still **refactor locally** per principles |
| One upstream feature (commit range)     | `cherry-pick` the commits onto a branch cut from downstream                                    |
| Upstream PR not merged yet              | Fetch PR head as a local ref, then cherry-pick or merge that ref                               |

Default branch name may be `main` or `master`. Resolve with:

```bash
git remote show upstream | sed -n '/HEAD branch/s/.*: //p'
```

## 1. Ensure `upstream` remote exists

```bash
git remote -v
```

If missing:

```bash
git remote add upstream git@github.com:agentscope-ai/CoPaw.git
```

HTTPS is fine if the user prefers:

```bash
git remote add upstream https://github.com/agentscope-ai/CoPaw.git
```

## 2. Fetch upstream

```bash
git fetch upstream --prune
```

## 3. Merge upstream default branch (full sync)

This is a **Git step** (bring trees together). Resolving conflicts to a green build is **not** the
end state: **re-read what upstream changed**, then **refactor or replace merged hunks** so the
result matches local architecture and **Integration principles** (full-stack, multi-user).

From the branch that tracks downstream development (example: `main` or `local`):

```bash
git checkout <branch>
git merge upstream/<default-branch>
```

If the project policy is rebase instead:

```bash
git rebase upstream/<default-branch>
```

Resolve conflicts file by file, `git add`, then `git merge --continue` or `git rebase --continue`.
After a successful merge, run tests; only then push to **downstream** `origin`.

## 4. Cherry-pick specific upstream commits

Prefer **bounded cherry-picks** when wholesale merge is too risky. After each pick, treat picked
code as **input to understand**, then **fold into local style** per **Integration principles**,
not as finished integration.

List recent upstream commits (optional):

```bash
git log --oneline upstream/<default-branch> -n 30
```

Create a safety branch from downstream:

```bash
git checkout -b sync/upstream-<topic> <branch>
git cherry-pick <sha1>^..<sha2>   # inclusive range
# or single commit:
git cherry-pick <sha1>
```

If a pick fails, fix conflicts, `git add`, `git cherry-pick --continue`, or abort with
`git cherry-pick --abort`.

## 5. Pull commits from an upstream PR (not merged)

GitHub exposes PR heads as refs. Fetch PR number `N` into a local branch:

```bash
git fetch upstream pull/N/head:pr-upstream-N
```

Inspect:

```bash
git log --oneline pr-upstream-N -n 20
git diff <branch>...pr-upstream-N
```

Then either:

- **Cherry-pick** selected SHAs onto downstream, or
- **Merge** the PR branch once: `git merge pr-upstream-N` (creates a merge commit if not fast-forward).

Delete the local ref when done:

```bash
git branch -d pr-upstream-N
```

With **GitHub CLI** (repo explicit):

```bash
gh pr view N --repo agentscope-ai/CoPaw
gh pr diff N --repo agentscope-ai/CoPaw
```

See `references/github-pr.md` for edge cases (force-push, closed PRs).

## 6. Safety and hygiene

- Work on a **topic branch** (`sync/upstream-...`) before touching shared mainline.
- Do **not** run `git push --force` to shared branches unless the user asks.
- If upstream and downstream diverged heavily, prefer **cherry-pick** or **merge** of a
  bounded topic branch over blind wholesale merge.
- After integrating, run the project test suite and smoke the areas touched by conflict resolution.
- Re-verify **full-stack** (API + next-console) and **multi-user** assumptions per **Integration
  principles** before calling the work done.

## 7. When the user is unsure what to take

1. Ask which **upstream branch** and **time range** or **PR number**.
2. Show `git log --oneline` for that range and propose a minimal cherry-pick set.
3. If conflicts appear, summarize **which files** conflicted and why (rename, delete, or logic).
4. For each candidate change, note **skip-if-duplicate**, **backend-only / frontend-only / both**,
   and **multi-user** impact.

## Bundled resources

- `references/github-pr.md` — PR ref fetch, `gh` usage, and troubleshooting
