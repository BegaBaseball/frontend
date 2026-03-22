#!/bin/bash
# Generate PWA icons from favicon.png using macOS sips
# Usage: bash scripts/generate-pwa-icons.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE="$ROOT_DIR/public/favicon.png"
OUT_DIR="$ROOT_DIR/public/icons"

if [ ! -f "$SOURCE" ]; then
  echo "Error: $SOURCE not found"
  exit 1
fi

mkdir -p "$OUT_DIR"

SIZES=(192 512)

for SIZE in "${SIZES[@]}"; do
  OUT="$OUT_DIR/icon-${SIZE}.png"
  cp "$SOURCE" "$OUT"
  sips -z "$SIZE" "$SIZE" "$OUT" --out "$OUT" > /dev/null 2>&1
  echo "Generated: icon-${SIZE}.png (${SIZE}x${SIZE})"
done

# Maskable icon (same as 512 — safe zone padding is handled by the OS)
cp "$OUT_DIR/icon-512.png" "$OUT_DIR/icon-maskable-512.png"
echo "Generated: icon-maskable-512.png (512x512, maskable)"

echo "Done. Icons saved to public/icons/"
