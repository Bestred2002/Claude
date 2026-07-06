#!/bin/bash
# Avvia LEAD GEN — alternativa semplice al doppio click su LEAD GEN.app.
# Avvia un server HTTP locale sulla cartella alchemyx-leadgen e apre
# la dashboard nel browser. Preferisce Node 18+ (server/server.js:
# "Cerca e qualifica" in un clic dalla mappa), fallback python3
# (solo file statici). Zero dipendenze (bash + node/python3 + curl).

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

# Fallback 2: percorso salvato da un avvio precedente.
CONFIG_FILE="$HOME/.config/alchemyx/leadgen-path"
if { [ -z "$ROOT_DIR" ] || [ ! -f "$ROOT_DIR/dashboard/index.html" ]; } && [ -f "$CONFIG_FILE" ]; then
    SAVED="$(cat "$CONFIG_FILE" 2>/dev/null)"
    if [ -n "$SAVED" ] && [ -f "$SAVED/dashboard/index.html" ]; then
        ROOT_DIR="$SAVED"
    fi
fi

# Fallback 3: cerca il progetto nelle posizioni comuni (profondità limitata).
if [ -z "$ROOT_DIR" ] || [ ! -f "$ROOT_DIR/dashboard/index.html" ]; then
    for BASE in "$HOME/Desktop" "$HOME/Documents" "$HOME/Downloads" "$HOME"; do
        [ -d "$BASE" ] || continue
        while IFS= read -r CANDIDATE; do
            if [ -f "$CANDIDATE/dashboard/index.html" ]; then
                ROOT_DIR="$CANDIDATE"
                break
            fi
        done < <(find "$BASE" -maxdepth 4 -type d -name "alchemyx-leadgen" 2>/dev/null)
        [ -n "$ROOT_DIR" ] && [ -f "$ROOT_DIR/dashboard/index.html" ] && break
    done
fi

if [ -z "$ROOT_DIR" ] || [ ! -f "$ROOT_DIR/dashboard/index.html" ]; then
    echo "ERRORE: dashboard non trovata (alchemyx-leadgen/dashboard/index.html)."
    echo "Scarica il progetto oppure tieni questo file dentro alchemyx-leadgen/launcher/."
    read -r -p "Premi Invio per chiudere..."
    exit 1
fi

# Percorso valido: ricordalo per i prossimi avvii.
mkdir -p "$(dirname "$CONFIG_FILE")" 2>/dev/null && printf '%s\n' "$ROOT_DIR" > "$CONFIG_FILE" 2>/dev/null

# Server: Node (preferito, abilita "Cerca e qualifica" one-click) con
# fallback su Python (solo file statici, come prima).
NODE_BIN=""
if command -v node >/dev/null 2>&1 && [ -f "$ROOT_DIR/server/server.js" ]; then
    NODE_BIN="node"
fi

PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
fi

if [ -z "$NODE_BIN" ] && [ -z "$PYTHON_BIN" ]; then
    echo "ERRORE: né Node.js né Python 3 trovati."
    echo "Installa Node 18+ (consigliato: abilita la ricerca in un clic) da https://nodejs.org"
    read -r -p "Premi Invio per chiudere..."
    exit 1
fi

# Trova una porta libera da 8347 in su; riusa un server già nostro.
PORT=8347
FOUND=""
while [ "$PORT" -lt 8400 ]; do
    if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/"; then
        # Marker /api/ping = nostro server Node; dashboard = server Python statico.
        if curl -s --max-time 1 "http://localhost:$PORT/api/ping" | grep -q "alchemyx-leadgen" \
           || curl -s --max-time 1 "http://localhost:$PORT/dashboard/index.html" | grep -qi "alchemyx"; then
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
    if [ -n "$NODE_BIN" ]; then
        # Server Node: file statici + API ("Cerca e qualifica" dalla mappa).
        PORT="$PORT" nohup "$NODE_BIN" "$ROOT_DIR/server/server.js" >/dev/null 2>&1 &
    else
        echo "(Node non trovato: server statico Python, senza ricerca in un clic)"
        nohup "$PYTHON_BIN" -m http.server "$PORT" >/dev/null 2>&1 &
    fi
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
