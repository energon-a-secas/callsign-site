.DEFAULT_GOAL := help

PORT = 8886
# The monorepo's root package.json has no "type", so node warns on every ES
# module it loads from here; the flag keeps the output to results.
NODE = node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON

# ── Help ──────────────────────────────────────────────────────────────────────
.PHONY: help
help:
	@echo ""
	@echo "  make serve    Start dev server → http://localhost:$(PORT)"
	@echo "  make kill     Kill this project's HTTP server"
	@echo "  make name     Names from the terminal: make name SEED=\"billing dashboard\" [HOUSE=balam] [SLOT=head] [COUNT=3]"
	@echo "  make test     Engine, links and CLI checks, then the golden plates"
	@echo "  make golden   Record new houses and pools; refuses a rename until GRAMMAR is bumped"
	@echo ""

# ── Dev server ────────────────────────────────────────────────────────────────
# scripts/serve.py is http.server plus Cache-Control: no-cache; a plain
# http.server sends only Last-Modified, so browsers keep stale ES modules after
# edits. Falls back to plain http.server outside the monorepo.
.PHONY: serve
serve:
	@echo "Serving → http://localhost:$(PORT)"
	@if [ -f ../../scripts/serve.py ]; then python3 ../../scripts/serve.py $(PORT); else python3 -m http.server $(PORT); fi

# ── Names from the terminal ───────────────────────────────────────────────────
.PHONY: name
name:
	@test -n "$(SEED)" || { echo 'usage: make name SEED="billing dashboard" [HOUSE=balam] [SLOT=head] [COUNT=3]'; exit 2; }
	@$(NODE) tools/callsign.mjs forge "$(SEED)" $(if $(HOUSE),--house $(HOUSE)) $(if $(SLOT),--slot $(SLOT)) $(if $(COUNT),--count $(COUNT))

# ── Tests ─────────────────────────────────────────────────────────────────────
# Plain node, no dependencies. golden.test.mjs fails when a shipped grammar
# would rename a plate; see the comment at its top before re-recording.
.PHONY: test golden
test:
	@$(NODE) tests/engine.test.mjs && $(NODE) tests/golden.test.mjs

golden:
	@$(NODE) tests/golden.test.mjs --update

# ── Kill ──────────────────────────────────────────────────────────────────────
.PHONY: kill
kill:
	@lsof -ti :$(PORT) | xargs kill 2>/dev/null && echo "Stopped server on port $(PORT)" || echo "No server running on port $(PORT)"
