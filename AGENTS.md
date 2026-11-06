# Agent instructions — ieee

## Agent tooling (portable across harnesses)

<!-- agent-toolbox:installed -->

This repo vendors its agent tooling (no secrets inside) so Claude Code,
Cline, Codex, OpenCode, Kilo Code, Kimi Code and Grok share one setup:

- `.mcp.json` — project MCP servers:
  `scholar` (PubMed, OpenAlex, Semantic Scholar, CORE, ORCID, Crossref),
  `web` (Exa, Brave, Jina, Firecrawl), `github` (read-only, token via
  `gh auth token`), `context7` (library docs), `playwright` (browser).
- `opencode.json` — the same servers for OpenCode;
  `AGENT_TOOLS.md` has merge snippets for Codex / Cline / Kilo Code and
  CLI fallbacks for Kimi / Grok.
- `.claude/skills/` — project skills: literature-search, web-research, secrets-guard.
- Keys: `~/.config/ai-keys.env` via the `agentkeys` loader — never in git,
  MCP config or chat. Run `secrets-guard` (`--staged`) before committing.

## Release habit

After producing a new one-file showcase: add it to `share/`, point the README
front-page “latest one-file showcase” line and the first “Start here” row at it,
run `secrets-guard --staged`, commit, and push to `main`. Never overwrite
earlier pinned showcase HTML files.
