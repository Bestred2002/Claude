#!/usr/bin/env bash
# Setup automatico per il progetto Xcode myTV Watch.
# Esegui questo file UNA VOLTA (poi puoi sempre aprire myTVWatch.xcodeproj
# direttamente da Xcode).
set -e

cd "$(dirname "$0")"

# 1) Verifica Homebrew
if ! command -v brew >/dev/null 2>&1; then
  echo "Installazione Homebrew…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# 2) Verifica xcodegen
if ! command -v xcodegen >/dev/null 2>&1; then
  echo "Installazione xcodegen…"
  brew install xcodegen
fi

# 3) Genera asset catalog AppIcon minimale se manca
ASSETS_DIR="myTVWatch Watch App/Assets.xcassets"
if [ ! -d "$ASSETS_DIR/AppIcon.appiconset" ]; then
  mkdir -p "$ASSETS_DIR/AppIcon.appiconset"
  cat > "$ASSETS_DIR/Contents.json" <<JSON
{
  "info" : { "author" : "xcode", "version" : 1 }
}
JSON
  cat > "$ASSETS_DIR/AppIcon.appiconset/Contents.json" <<JSON
{
  "images" : [
    { "size" : "1024x1024", "idiom" : "universal", "filename" : "icon-1024.png", "platform" : "watchos" }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
JSON
fi

# 4) Se manca l'icona 1024, la genero in nero+m con Python (oppure usa la 512 esistente)
if [ ! -f "$ASSETS_DIR/AppIcon.appiconset/icon-1024.png" ]; then
  if [ -f "../icons/icon-512.png" ]; then
    cp "../icons/icon-512.png" "$ASSETS_DIR/AppIcon.appiconset/icon-1024.png"
    echo "Usata icon-512.png come AppIcon (verrà ridimensionata da Xcode)."
  fi
fi

# 5) Genera xcodeproj
echo "Generazione xcodeproj…"
xcodegen

echo ""
echo "✓ Pronto! Apri il progetto con:"
echo "  open myTVWatch.xcodeproj"
echo ""
echo "In Xcode:"
echo "  1. Signing & Capabilities → Team → seleziona il tuo Apple ID"
echo "  2. Collega iPhone via cavo (con Watch abbinato)"
echo "  3. Destination in alto → 'Apple Watch via <nome iPhone>'"
echo "  4. Cmd+R per installare ed eseguire"
echo ""

# 6) Apri direttamente Xcode se siamo su macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  open myTVWatch.xcodeproj
fi
