---
name: upstream-merge
description: >
  Sync a CoPaw fork with agentscope-ai/CoPaw: treat merge/cherry-pick as transport, integrate by
  reading upstream and refactoring in-tree. Only src/, console/, and next-console/ are in scope;
  ignore upstream changes elsewhere. Fork ships UI in next-console. Triggers: upstream merge,
  cherry-pick, PR import, remote upstream.
---

# Upstream merge (fork maintenance)

Bring **upstream** (e.g. `agentscope-ai/CoPaw`) into **downstream** without discarding local intent.
Use **small, reviewable** steps. Do **not** rewrite published history unless the user explicitly asks.

## Philosophy

| Idea                   | Practice                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git is **transport**   | `merge` / `rebase` / `cherry-pick` move commits or expose diffs. They are not the integration deliverable.                                                          |
| Upstream is **spec**   | Read commits and PRs until **intent, invariants, and edge cases** are clear. Then **implement or refactor on the local tree**; downstream structure and naming win. |
| **No mechanical port** | The goal is not a conflict-free replay of upstream lines. **Skip** work if behavior already exists downstream and **say so** to the user.                           |

After any Git step, **finish integration** in code: scoped directories only, full-stack where needed, **multi-user** checks (see Integration rules).

---

## Repository policy (this fork)

### In-scope roots (product code)

Paths are relative to the repo root. **All intentional integration work happens here:**

| Path            | Role                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `src/`          | CoPaw backend and runtime                                                                             |
| `console/`      | Legacy SPA, upstream-aligned; **reference only** for behavior—do not grow it as the fork’s primary UI |
| `next-console/` | **Maintained** web console; prefer porting **console/** UX ideas here                                 |

Apply **Integration rules** below to changes under these roots only.

### Out-of-scope paths (auxiliary)

Everything **outside** `src/`, `console/`, and `next-console/` (e.g. `deploy/`, `docker-compose.yml`, `.github/`, `website/`, root configs, docs, scripts) is **fork-specific auxiliary**. It often **diverges** from upstream’s release layout.

- **Do not** adopt upstream updates in these paths as part of sync.
- **Merge conflicts:** keep **downstream** (`ours`) or **drop** upstream hunks.
- **Cherry-pick:** skip commits that touch **only** out-of-scope files, or **exclude** those files from the change.
- **Upstream still has a path downstream deleted** (and that path is **outside** the three roots): **do not** restore it—treat as intentional drift.

A full `git merge` may still modify out-of-scope files; **resolve** using the rules above, then spend integration effort **only** inside the three roots.

---

## Integration rules (in-scope only)

1. **Understand, then implement locally**  
   Default outcome: **new or adjusted code** matching downstream patterns. If capability already matches downstream, **skip** and **tell the user**.

2. **Backend (`src/`) → frontend**  
   Check whether **next-console** (or other clients) should call new or changed APIs. If not, extend **next-console** in the same effort (`lib/*-api`, routes, proxy/auth).

3. **Frontend → backend**  
   Ensure **CoPaw** exposes required APIs, auth, and shapes. If upstream only changed **`console/`**, treat it as **spec for `next-console/`**, not a reason to expand **`console/`** as product UI.

4. **Multi-user**  
   Review isolation, **authn/z** (JWT, agent scope), shared mutable state, rate limits, session/chat ownership, and safe defaults under concurrency. Do not assume a single-operator console.

---

## Recommended workflow

1. **Triage** upstream commits: list touched paths; **discard** or **skip** anything **only** out-of-scope (see Repository policy).
2. **Read** messages, PR description, tests for in-scope changes; note **skip-if-duplicate**, **backend / frontend / both**, **multi-user** impact.
3. **Transport** (optional): merge, rebase, or cherry-pick; resolve conflicts in out-of-scope files per policy.
4. **Integrate** in-scope: refactor or rewrite locally; wire **next-console** and **`src/`** together as needed.
5. **Verify:** tests, smoke, multi-user paths for touched behavior.

---

## Prerequisites

- Working tree clean enough to merge or cherry-pick (stash or commit WIP first).
- Optional: **GitHub CLI** (`gh`) for PR metadata and diffs.

---

## Git cookbook

**Default branch name** (`main` vs `master`):

```bash
git remote show upstream | sed -n '/HEAD branch/s/.*: //p'
```

### 1. Ensure `upstream` remote

```bash
git remote -v
# If missing:
git remote add upstream git@github.com:agentscope-ai/CoPaw.git
# or: https://github.com/agentscope-ai/CoPaw.git
```

### 2. Fetch

```bash
git fetch upstream --prune
```

### 3. Merge or rebase default branch

```bash
git checkout <branch>
git merge upstream/<default-branch>
# or: git rebase upstream/<default-branch>
```

Resolve conflicts; for **out-of-scope** paths prefer **local**. `git add`, then `merge --continue` / `rebase --continue`. Run tests before pushing to **origin**.

### 4. Cherry-pick a range

```bash
git log --oneline upstream/<default-branch> -n 30
git checkout -b sync/upstream-<topic> <branch>
git cherry-pick <sha1>^..<sha2>   # inclusive, or single <sha1>
```

On failure: fix, `git add`, `cherry-pick --continue`, or `cherry-pick --abort`. Treat picked **in-scope** code as input for local refactor (Integration rules).

### 5. Upstream PR `N` (not merged)

```bash
git fetch upstream pull/N/head:pr-upstream-N
git log --oneline pr-upstream-N -n 20
git diff <branch>...pr-upstream-N
# Then cherry-pick selected SHAs, or: git merge pr-upstream-N
git branch -d pr-upstream-N   # when done
```

Optional: `gh pr view N --repo agentscope-ai/CoPaw` / `gh pr diff N`. See `references/github-pr.md`.

---

## Safety and hygiene

- Prefer a **topic branch** (`sync/upstream-...`) before shared mainline.
- No **`git push --force`** to shared branches unless the user requests it.
- Heavy divergence: prefer **bounded cherry-picks** or a **single merge** of a topic branch over repeated blind merges.
- After integration: tests, smoke, and **full-stack + multi-user** sanity for changed behavior.

---

## If the user is unsure what to take

Ask for **upstream branch**, **time range** or **PR number**, then:

1. Show `git log --oneline` for that range and propose a **minimal** pick list.
2. **Filter** by path: commits **only** out-of-scope → **skip** (Repository policy).
3. For each in-scope candidate: duplicate? backend/frontend/both? multi-user notes?
4. On conflicts: which files, rename vs delete vs logic; for **deploy/CI/docs** conflicts, default **keep local**.

---

## Bundled resources

- `references/github-pr.md` — PR refs, `gh`, troubleshooting
