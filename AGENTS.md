# Agent instructions — roboticThingAvoidance

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

## Release habit (owner preference — keep the showcase at the top)

The GitHub front page is the `README.md` rendered at the top of the repo. The
owner always wants the HTML that shows off the work/3D/etc. — the latest
one-file showcase — on that front page, at the top, before any status detail.
Never let the front page drift to text-only.

After producing a new one-file showcase: add it to `share/`, point the README
front-page “latest one-file showcase” line and the first “Start here” row at it
(both live at the top of the README), run `secrets-guard --staged`, commit, and
push to `main`. Never overwrite earlier pinned showcase HTML files.
