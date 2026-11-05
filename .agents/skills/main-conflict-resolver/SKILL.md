---
name: main-conflict-resolver
description: "ApptiveDev/yeogi-namgim에서 사용자가 명시적으로 요청한 PR 또는 작업 브랜치의 최신 main 충돌을 분석하고 해결합니다. 실제 브랜치 변경이 필요한 충돌 해결에만 사용하며 읽기 전용 진단이나 일반 코드 리뷰에는 사용하지 않습니다."
---

# Main Conflict Resolver

Resolve conflicts between a specifically authorized working branch and the latest `origin/main` while preserving user changes and repository behavior.

## Confirm the mutation scope

1. Require an explicit target PR or branch and an explicit request to resolve its conflicts. Do not infer authorization from a review or readiness request.
2. Inspect the current worktree before switching branches. Preserve unrelated staged, unstaged, and untracked user files; use an isolated worktree when the checkout is dirty or belongs to another task.
3. Read the latest repository Git workflow and applicable implementation instructions.
4. Fetch `origin/main` and the remote target branch immediately before starting. Record both SHAs and confirm that the target head has not moved before push.

## Analyze before editing

- Use `git merge-tree --write-tree origin/main <head>` or an equivalent read-only simulation to enumerate conflicts and inspect the intended integrated tree.
- Check stacked or sibling PRs, shared Flyway versions, generated files, API contracts, and changes already merged independently.
- Identify the semantic owner of each conflicting behavior. Never resolve a conflict by blindly accepting all of `ours` or `theirs`.
- Stop and ask for direction when both sides implement incompatible product policies and repository evidence does not establish the intended result.

## Resolve safely

- Follow the repository's preferred integration strategy. Unless its rules or the user say otherwise, merge latest `origin/main` into the target branch and avoid history rewriting or force push.
- Keep the target PR's intended change while retaining compatible fixes and contracts already present on `main`.
- For migrations, preserve already-applied files, choose an unused version based on the actual deployment order, and update dependent tests or documentation.
- Remove conflict markers and temporary debugging artifacts. Verify that the resulting diff contains no unrelated checkout changes.
- Run checks proportional to the affected areas, including backend tests for behavior or migrations and frontend type/lint checks for consumer changes.

## Push and report

Push only the authorized target branch and only after rechecking that its remote head has not advanced. Never push to `main`, rewrite history, or force push without a separate explicit request.

Report:

- base and target SHAs used;
- files and semantic decisions involved in each conflict;
- merge or resolution commit SHA;
- checks executed and their results;
- push status and remaining CI, review, or ordering requirements.

If safe resolution is impossible, leave the branch unpushed, preserve the recoverable worktree state, and explain the exact decision needed.
