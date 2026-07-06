#!/bin/bash
# Aggiorna LEAD GEN all'ultima versione dal repository e riavvia l'app.
# Doppio click: scarica gli aggiornamenti (git pull), chiude un eventuale
# server vecchio sulla porta e riavvia tramite "Avvia LEAD GEN.command".
# Zero dipendenze: bash + git + (node o python3), tutti già sul sistema.

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Trova la radice del repository git risalendo le cartelle.
REPO_DIR=""
DIR="$SCRIPT_DIR"
while [ "$DIR" != "/" ]; do
    if [ -d "$DIR/.git" ]; then
        REPO_DIR="$DIR"
        break
    fi
    DIR="$(dirname "$DIR")"
done

if [ -n "$REPO_DIR" ]; then
    echo "Aggiorno il codice in: $REPO_DIR"
    if git -C "$REPO_DIR" pull --ff-only; then
        echo "Aggiornamento completato."
    else
        echo ""
        echo "ATTENZIONE: 'git pull' non riuscito."
        echo "Puoi riscaricare il progetto da GitHub, oppure risolvere il conflitto a mano."
    fi
else
    echo "Questa copia NON è un repository git (probabilmente uno ZIP scaricato)."
    echo "Per aggiornare, riscarica il progetto da GitHub e sostituisci la cartella."
fi

# Chiudi un eventuale server rimasto attivo dall'avvio precedente (porte 8347-8399).
for P in $(seq 8347 8399); do
    PIDS="$(lsof -ti:"$P" 2>/dev/null || true)"
    [ -n "$PIDS" ] && kill $PIDS 2>/dev/null
done

echo ""
echo "Riavvio LEAD GEN..."
sleep 1

# Riavvia tramite il launcher standard (sceglie Node se disponibile, altrimenti Python).
exec "$SCRIPT_DIR/Avvia LEAD GEN.command"
