---
name: pr-readiness
description: "ApptiveDev/yeogi-namgim Pull Request의 이슈 연결, 브랜치·라벨·템플릿, CI, 승인, 리뷰 스레드, 최신 main 충돌과 머지 준비 상태를 점검합니다. 코드 결함 리뷰나 충돌 해결 자체에는 사용하지 않습니다."
---

# PR Readiness

Assess whether a pull request satisfies the repository's collaboration and merge requirements. Keep the check read-only unless the user explicitly asks to update PR metadata or branches.

## Collect current state

1. Resolve the PR and fetch its current base and head. Record both SHAs.
2. Read the latest root `AGENTS.md`, `docs/CONTRIBUTING.md`, PR template, and applicable branch-protection or ruleset information.
3. Inspect the linked issue, assignee, labels, milestone when required, branch name, PR title and body, draft state, commits, changed files, requested reviewers, reviews, review threads, and checks.
4. Fetch latest `origin/main` and use a read-only merge simulation to distinguish actual content conflicts from GitHub states caused by pending checks or policy.

## Evaluate repository requirements

Check that:

- the issue has one clear purpose, the required type and area labels, an assignee, and an updated checklist;
- the branch starts from the intended base and follows `type/area/#issue-summary`;
- commit and PR titles follow repository conventions;
- the PR targets `main`, links the issue with the correct closing or reference keyword, and completes the current template;
- API and documentation declarations match the changed files, including a concrete no-docs reason when applicable;
- local verification is described honestly and the required GitHub Actions checks have completed successfully;
- latest `main` integrates without conflict and no required migration or stacked-PR ordering is omitted;
- required non-author approval applies to the latest pushed commit;
- mandatory review findings are addressed and every required review thread is resolved;
- no secret, debug artifact, generated junk, or unrelated user change is included.

Do not interpret GitHub's `mergeable` or `mergeStateStatus` alone. Explain whether a block comes from a content conflict, a pending check, a missing approval, an unresolved thread, a draft state, or another ruleset condition.

## Report readiness

Group the result into:

- **Blockers:** conditions that prevent merge under current repository rules;
- **Warnings:** incomplete evidence or non-blocking cleanup;
- **Passed:** requirements verified from current GitHub and Git state.

Provide the exact evidence for each blocker and the minimum next action. Finish with a clear `Ready` or `Not ready` verdict, the reviewed head SHA, and any state that may become stale after another push. Do not approve, merge, edit metadata, resolve threads, or push merely because the user requested a readiness check.
