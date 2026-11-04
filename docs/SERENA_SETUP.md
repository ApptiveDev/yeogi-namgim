# Serena 사용법

Serena는 Java와 TypeScript 코드의 심볼 및 참조 관계를 AI 코딩 도구에서 찾는 MCP 서버다. 저장소의 `.serena/project.yml`에 두 언어 서버를 설정했다. 캐시, 로그, 개인 설정은 `.serena/.gitignore`로 제외한다.

## Codex 연결

1. [uv를 설치](https://docs.astral.sh/uv/getting-started/installation/)한다.
2. `uv tool install -p 3.13 serena-agent`로 Serena를 설치한다.
3. `serena init`을 실행한다.
4. `serena setup codex`를 실행한다. 설치 후 `serena` 명령이 PATH에 없다면 `codex mcp add serena -- <serena 실행 파일의 절대 경로> start-mcp-server --context=codex --project-from-cwd`로 등록한다.
5. `codex mcp get serena`에서 등록 상태를 확인한다. 새 Codex 대화에서 `Serena로 yeogi-namgim 프로젝트를 활성화하고 참조를 찾아줘`처럼 요청한다. Codex 앱은 프로젝트 디렉터리에서 세션을 시작하지 않을 수 있으므로 활성화할 프로젝트를 명시한다.

프로젝트 상태를 직접 점검하려면 저장소 루트에서 `serena project health-check .`을 실행한다. 첫 실행에서는 언어 서버와 Java 의존성을 내려받아 시간이 걸릴 수 있다.

Serena 공식 문서: https://oraios.github.io/serena/02-usage/030_clients.html
