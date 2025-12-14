# SynergyMesh

Next-generation cloud-native platform for intelligent business automation and seamless data orchestration.

## Project Overview

SynergyMesh is an autonomous coordination grid system (無人化自主協同網格系統) that combines AI agents, multi-agent orchestration, and enterprise automation capabilities.

## Project Architecture

This is a polyglot monorepo containing:

### Languages & Frameworks
- **TypeScript/JavaScript**: Frontend (React) and tooling
- **Python**: Core AI/ML modules, automation, and backend services
- **Rust**: High-performance runtime components (planned)
- **Go**: Microservices (planned)

### Directory Structure

```
apps/
  web/              # React frontend - THE ONLY SOURCE for UI components
  web-backend/      # Python backend services

core/
  modules/          # THE ONLY SOURCE for Python AI/automation modules
    ai_constitution/
    ci_error_handler/
    cloud_agent_delegation/
    drone_system/
    execution_architecture/
    execution_engine/
    main_system/
    mcp_servers_enhanced/
    mind_matrix/
    monitoring_system/
    tech_stack/
    training_system/
    virtual_experts/
    yaml_module_system/
  safety_mechanisms/
  slsa_provenance/
  unified_integration/

services/
  agents/           # Agent services (auto-repair, code-analyzer, etc.)
  mcp/              # MCP services

automation/         # Automation pipelines and intelligent agents
infrastructure/     # Kubernetes manifests and monitoring
governance/         # Policies, schemas, and compliance
docs/               # Documentation
tests/              # Test suites
tools/              # Development utilities
```

### Key Principles

1. **Single Source of Truth for Python Modules**: All Python modules reside in `core/modules/`. Do not create Python modules elsewhere.

2. **Single Source of Truth for UI Components**: All UI components reside in `apps/web/src/components/`. Do not create UI components elsewhere.

3. **No Scratch Directories**: Temporary scratch directories have been removed. Use `experiments/` for experimental code.

### Package Managers
- **npm**: Primary JavaScript package manager (workspaces in package.json)
- **pnpm**: Alternative JS package manager (pnpm-workspace.yaml)
- **pip/uv**: Python dependencies (pyproject.toml)

## Development

### Frontend
```bash
cd apps/web && npm run dev
```
- Runs on port 5000
- Uses esbuild for bundling
- Tailwind CSS for styling

### Python
```bash
pip install -e ".[dev]"
```

## Workflows

- **Frontend**: `cd apps/web && npm run dev` - React development server on port 5000

## Deployment

The frontend is configured for static deployment:
- Build: `npm run build --workspace apps/web`
- Output: `apps/web/dist/`

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | npm workspaces configuration |
| `pnpm-workspace.yaml` | pnpm workspaces (synced with npm) |
| `pyproject.toml` | Python project configuration |
| `Cargo.toml` | Rust workspace (members pending) |
| `go.work` | Go workspace (modules pending) |
| `tsconfig.json` | TypeScript configuration |

## Notes

- Rust crates in Cargo.toml are commented out (pending implementation)
- Go services in go.work are commented out (pending implementation)
- Frontend binds to 0.0.0.0:5000 for Replit compatibility
