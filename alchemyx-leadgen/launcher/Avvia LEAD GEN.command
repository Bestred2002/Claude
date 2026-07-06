#!/bin/bash
# Avvia LEAD GEN — alternativa semplice al doppio click su LEAD GEN.app.
# Avvia un server HTTP locale sulla cartella alchemyx-leadgen e apre
# la dashboard nel browser. Zero dipendenze (bash + python3 + curl).

set -u

# Questo file vive in alchemyx-leadgen/launcher/, quindi la radice
# del progetto è la cartella superiore.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." 2>/dev/null && pwd)"

if [ -z "${ROOT_DIR:-}" ] || [ ! -f "$ROOT_DIR/dashboard/index.html" ]; then
    # Fallback: cerca alchemyx-leadgen/dashboard/index.html risalendo.
    ROOT_DIR=""
    SEARCH_DIR="$SCRIPT_DIR"
    while [ "$SEARCH_DIR" != "/" ]; do
        if [ -f "$SEARCH_DIR/alchemyx-leadgen/dashboard/index.html" ]; then
            ROOT_DIR="$SEARCH_DIR/alchemyx-leadgen"
            break
        fi
        SEARCH_DIR="$(dirname "$SEARCH_DIR")"
    done
fi

if [ -z "$ROOT_DIR" ] || [ ! -f "$ROOT_DIR/dashboard/index.html" ]; then
    echo "ERRORE: dashboard non trovata (alchemyx-leadgen/dashboard/index.html)."
    echo "Tieni questo file dentro alchemyx-leadgen/launcher/ e riprova."
    read -r -p "Premi Invio per chiudere..."
    exit 1
fi

# Interprete Python: python3 (macOS/Linux moderni) o python in fallback.
if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
else
    echo "ERRORE: Python 3 non trovato."
    read -r -p "Premi Invio per chiudere..."
    exit 1
fi

# Trova una porta libera da 8347 in su; riusa un server già nostro.
PORT=8347
FOUND=""
while [ "$PORT" -lt 8400 ]; do
    if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/"; then
        if curl -s --max-time 1 "http://localhost:$PORT/dashboard/index.html" | grep -qi "alchemyx"; then
            FOUND="reuse"
            break
        fi
        PORT=$((PORT + 1))
    else
        FOUND="free"
        break
    fi
done

if [ -z "$FOUND" ]; then
    echo "ERRORE: nessuna porta libera trovata (8347-8399)."
    read -r -p "Premi Invio per chiudere..."
    exit 1
fi

if [ "$FOUND" = "free" ]; then
    # CWD = radice alchemyx-leadgen: serve sia /dashboard/ che /output/leads.json.
    cd "$ROOT_DIR" || exit 1
    echo "Avvio server LEAD GEN su http://localhost:$PORT/ ..."
    nohup "$PYTHON_BIN" -m http.server "$PORT" >/dev/null 2>&1 &
    for _ in $(seq 1 50); do
        if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/"; then
            break
        fi
        sleep 0.1
    done
fi

URL="http://localhost:$PORT/dashboard/"
echo "Apro la dashboard: $URL"
# `open` su macOS, `xdg-open` su Linux (questo script funziona su entrambi).
if command -v open >/dev/null 2>&1; then
    open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
else
    echo "Apri manualmente nel browser: $URL"
fi
