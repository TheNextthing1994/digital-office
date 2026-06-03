#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

if [ ! -d "$ROOT_DIR/.git" ]; then
  echo "Cannot install hooks: .git directory is missing."
  exit 1
fi

mkdir -p "$ROOT_DIR/.git/hooks"
cp "$ROOT_DIR/hooks/pre-commit" "$ROOT_DIR/.git/hooks/pre-commit"
cp "$ROOT_DIR/hooks/pre-push" "$ROOT_DIR/.git/hooks/pre-push"
chmod +x "$ROOT_DIR/.git/hooks/pre-commit" "$ROOT_DIR/.git/hooks/pre-push"

echo "Hooks installed."

