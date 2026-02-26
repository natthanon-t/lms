#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/cbt-lms"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed"
  exit 1
fi

echo "Node version: $(node -v)"
echo "npm version : $(npm -v)"
echo "Installing frontend dependencies in $FRONTEND_DIR"

cd "$FRONTEND_DIR"

if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi

echo "Frontend dependencies installed successfully"
