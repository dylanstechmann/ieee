# Agent instructions — ieee

## Agent tooling (portable across harnesses)

<!-- agent-toolbox:installed -->

This repo vendors its agent tooling (no secrets inside) so Claude Code,
Cline, Codex, OpenCode, Kilo Code, Kimi Code and Grok share one setup:

- `.mcp.json` — project MCP servers `scholar` (PubMed, OpenAlex, Semantic
  Scholar, CORE, ORCID, Crossref) and `web` (Exa, Brave, Jina, Firecrawl).
- `opencode.json` — same servers for OpenCode; `AGENT_TOOLS.md` has the
  merge snippets for Codex / Cline / Kilo Code and notes for Kimi/Grok.
- `.claude/skills/` — project skills: literature-search, web-research, secrets-guard.
- Keys: `~/.config/ai-keys.env` via the `agentkeys` loader — never in git,
  MCP config or chat. Run `secrets-guard` (`--staged`) before committing.
