---
name: api-contract-check
description: "ApptiveDev/yeogi-namgim에서 백엔드 API 구현, 문서, 마이그레이션, 프론트엔드 호출부의 계약 일치를 검사합니다. API 추가·변경, 연동 오류, DTO나 검증 규칙 변경을 확인할 때 사용하며 일반 코드 리뷰에는 사용하지 않습니다."
---

# API Contract Check

Verify that each changed API contract remains consistent across its producer, persistence model, documentation, and consumers. Keep the inspection read-only unless the user also asks for fixes.

## Establish the contract scope

1. Resolve the target PR, branch, commit range, endpoint, or reported integration failure.
2. Read the applicable `AGENTS.md` files and repository API documentation requirements.
3. Fetch the latest `origin/main` and target head. Record the SHAs and inspect the integrated result when reviewing a PR.
4. Identify every changed or affected endpoint, including indirect changes from shared DTOs, authentication, migrations, error handling, and validation constants.

## Trace each contract end to end

For every affected endpoint, compare:

- controller method, path, authentication mechanism, headers, query parameters, path variables, and request body;
- request and response DTO names, types, nullability, defaults, validation limits, enum values, field casing, and serialization behavior;
- success status, error status, error code, response envelope, pagination, ordering, and count semantics;
- service authorization, ownership, friendship, visibility, distance, bookmark, and read-state conditions;
- entity constraints, Flyway migrations, existing-data compatibility, and migration ordering;
- feature documents, API catalog entries, examples, and stated implementation status;
- frontend request builders, validation, constants, generated or handwritten types, response parsing, authentication state, and user-facing error handling;
- other backend consumers, tests, fixtures, mocks, and sibling PRs that depend on the contract.

Do not treat matching field names as sufficient. Verify units, ranges, lifecycle rules, and meaning. Pay particular attention to invitation-code length and reuse, member versus guest authentication, 150 m access rules, coordinate bounds, date/time formats, and partial results represented as complete counts.

## Verify compatibility

- Distinguish backward-compatible additions from breaking changes.
- Check whether old app clients and existing database rows remain valid.
- Check Flyway version collisions and deployment prerequisites against latest `main` and open sibling PRs.
- Run focused backend tests or compilation and frontend type/lint checks when practical. Add database-backed verification when constraints, migrations, or queries are involved.
- Clearly separate checks executed directly from claims in PR descriptions or documentation.

## Report mismatches

List concrete mismatches first. For each one, provide:

- endpoint and producer location;
- consumer, document, or schema location that disagrees;
- the exact request or sequence that exposes the mismatch;
- user or deployment impact;
- the smallest safe alignment direction and a regression test.

Finish with a compact compatibility verdict per endpoint, executed checks, unresolved prerequisites, and any consumer that could not be verified. Do not post or modify external review state without an explicit request.
