# Contributing to PodFire

- [Code of Conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Makefile Reference](#makefile-reference)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Commit Conventions](#commit-conventions)
- [PR Process](#pr-process)
- [Questions](#questions)

---

## Code of Conduct

This project is governed by the [Contributor Covenant](https://www.contributor-covenant.org/). By participating, you agree to maintain a respectful and inclusive environment. Report unacceptable behavior to the project maintainers.

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Running the app and TS agent |
| Go | 1.21+ | Building the Go agent |
| pnpm | 9+ | Package management |
| Docker | 24+ | Container builds and Swarm |
| Docker Swarm | initialized | `docker swarm init` |
| Git | 2+ | Version control |

---

## Project Structure

```
podfire/
├── app/                          # Web dashboard & API (Next.js 16)
│   ├── app/api/                  # Next.js API route handlers
│   ├── app/dashboard/            # UI page components
│   ├── lib/                      # Shared library code
│   │   ├── deploy-dispatch.ts    # Deployment job creation and dispatch
│   │   ├── stack.ts              # Docker Stack YAML generation
│   │   ├── github.ts             # GitHub API helpers
│   │   ├── auth.ts               # Authentication and session
│   │   ├── encryption.ts         # AES-256 encryption for tokens
│   │   └── gateway-auth.ts       # Gateway authentication
│   ├── prisma/                   # Database schema (SQLite)
│   ├── docker-templates/         # Framework Dockerfile templates
│   ├── traefik/                  # Traefik stack configuration
│   └── agent-gateway.js          # WebSocket gateway
│
├── agent/                        # Deploy agent (TypeScript)
│   ├── lib/
│   │   ├── stack.ts              # Stack YAML generation + deploy
│   │   ├── docker.ts             # Docker image utilities
│   │   ├── template-loader.ts    # Dockerfile template system
│   │   ├── framework-detector.ts # Framework detection
│   │   ├── available-port.ts     # Host port allocation
│   │   ├── encryption.ts         # Token encryption
│   │   ├── run-command.ts        # Shell command execution
│   │   ├── service-diagnostics.ts # Runtime diagnostic probes
│   │   └── port-detector.ts      # Source code port scanning
│   ├── docker-templates/         # Framework Dockerfile templates
│   └── run.ts                    # Agent entrypoint
│
├── agent-go/                     # Deploy agent (Go)
│   ├── internal/
│   │   ├── docker/
│   │   │   ├── docker.go         # Docker image utilities
│   │   │   └── port.go           # Source code port scanning
│   │   ├── stack/
│   │   │   └── stack.go          # Stack YAML generation + deploy
│   │   ├── template/
│   │   │   └── template.go       # Dockerfile template system
│   │   ├── framework/
│   │   │   └── framework.go      # Framework detection
│   │   ├── run/
│   │   │   └── run.go            # Shell command execution
│   │   ├── port/
│   │   │   └── port.go           # Available port allocation
│   │   └── diagnostics/          # Service diagnostics
│   ├── main.go                   # Agent entrypoint
│   └── Makefile                  # Build system
│
├── docs/                         # Documentation assets
├── README.md                     # Project overview
├── USER-GUIDE.md                 # User documentation
└── CONTRIBUTING.md               # This file
```

---

## Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/marcuwynu23/podfire.git
cd podfire

# App
cd app
pnpm install
cp .env.example .env
# Edit .env with your GitHub OAuth credentials

# Database
pnpm db:generate
pnpm db:push

# Agent
cd ../agent
pnpm install
cp .env.example .env
```

### 2. Initialize Docker Swarm

```bash
docker swarm init
docker network create --driver overlay web
```

### 3. Start Development Servers

Terminal 1 — App + Gateway:

```bash
cd app
pnpm dev:all
```

Terminal 2 — Agent:

```bash
cd agent
pnpm dev
```

Open **http://localhost:3000**.

---

## Makefile Reference

### Go Agent (`agent-go/`)

```bash
make build    # Build the Go agent binary
make run      # Run the agent (go run .)
make test     # Run all tests
make clean    # Clean build artifacts
```

---

## Development Workflow

1. **Fork and clone** the repository
2. **Create a feature branch**: `git checkout -b feat/my-feature`
3. **Make your changes** following the coding standards below
4. **Write or update tests** for your changes
5. **Run tests** to verify nothing is broken
6. **Commit** using conventional commits
7. **Push** and open a pull request

---

## Coding Standards

### General

- **Active voice.** "The agent clones the repo" not "The repo is cloned by the agent".
- **No filler comments.** Code should be self-documenting. Only add comments for non-obvious logic.
- **No trailing whitespace.** Configure your editor to strip it on save.
- **File names** use kebab-case for TS/JS, snake_case for Go.

### TypeScript

- **Strict mode** — the `tsconfig.json` uses `strict: true`
- **ES modules** — use `import`/`export`, not `require`
- **Types** — prefer explicit interfaces over inline types for public APIs
- **Null handling** — use `??` over `||` for default values (unless the value is expected to be falsy)
- **Async** — use `async`/`await` over raw promises

### Go

- **`gofmt`** — always run `gofmt -s` before committing
- **Error handling** — check errors; use `fmt.Errorf` with `%w` for wrapping
- **Naming** — use `CamelCase` for exported, `camelCase` for unexported
- **No `init()` functions** — prefer explicit initialization

---

## Testing

### Running Tests

```bash
# TypeScript agent
cd agent && pnpm test

# Go agent
cd agent-go && make test

# App
cd app && pnpm test
```

### Test Expectations

| Project | Framework | Location | Coverage |
|---|---|---|---|
| `app/` | vitest | `lib/*.test.ts` | Pure functions in shared libs |
| `agent/` | vitest | `lib/*.test.ts` | All modules should have test coverage |
| `agent-go/` | `go test` | `internal/*/*_test.go` | All packages have test coverage |

### Writing Tests

- **Pure functions first.** Test the logic that doesn't need mocking.
- **Table-driven tests** in Go: test multiple inputs with a single test function.
- **Temporary directories:** Use `fs.mkdtempSync` (TS) or `t.TempDir()` (Go) for filesystem-dependent tests.
- **Dynamic imports** for modules with module-level state (e.g., `process.env.DOCKER_REGISTRY`).

TypeScript example:

```typescript
import { describe, it, expect } from "vitest";
import { sanitizeForDocker } from "./docker";

describe("sanitizeForDocker", () => {
  it("lowercases the name", () => {
    expect(sanitizeForDocker("MyApp")).toBe("myapp");
  });
});
```

Go example:

```go
func TestSanitizeForDocker(t *testing.T) {
    tests := []struct {
        name, input, want string
    }{
        {"lowercases", "MyApp", "myapp"},
        {"special chars", "hello world!", "hello-world"},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := SanitizeForDocker(tt.input)
            if got != tt.want {
                t.Errorf("got %q, want %q", got, tt.want)
            }
        })
    }
}
```

---

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <description>
```

### Types

| Type | Usage |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `refactor` | Code change that neither fixes nor adds |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Build, deps, config, CI |

### Scope

The scope should be the package or area affected:

| Scope | Area |
|---|---|
| `app` | The Next.js dashboard and API |
| `agent` | The TypeScript agent |
| `agent-go` | The Go agent |
| `gateway` | The agent gateway |
| `traefik` | Traefik configuration |
| `deps` | Dependency updates |
| `ui` | UI components and styling |

### Examples

```
feat(agent): add framework detection for Python Flask
fix(app): handle missing ENCRYPTION_KEY gracefully
test(agent-go): add table-driven tests for SanitizeForDocker
docs: update README with architecture diagram
chore(deps): upgrade next from 14 to 16
refactor(gateway): extract dispatch logic to shared lib
```

---

## PR Process

### Before Submitting

- [ ] Code compiles (`pnpm build` / `go build ./...`)
- [ ] All tests pass (`pnpm test` / `make test`)
- [ ] New code is covered by tests
- [ ] No lint warnings (`pnpm lint`)
- [ ] Commit messages follow conventional commits
- [ ] Branch is up to date with main

### Review Criteria

- **Correctness** — Does the code do what it claims?
- **Test coverage** — Are there tests for the new behavior?
- **Consistency** — Does it follow the existing patterns?
- **Scope** — Is the change focused on one thing?

### Merge

PRs require at least one approval. Maintainers merge using **squash merge** to keep history clean.

---

## Questions

- Open a [GitHub Issue](https://github.com/marcuwynu23/podfire/issues) for bugs and feature requests
- Discussions are welcome in the repository's Discussions tab

---

➡️ **[Back to README](README.md)** | **[User Guide](USER-GUIDE.md)**
