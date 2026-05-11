#!/usr/bin/env bash
# GTube launcher — uses the venv created by setup.sh
VENV="$HOME/.local/share/gtube/venv"
SCRIPT="$(dirname "$(realpath "$0")")/main.py"

if [ ! -f "$VENV/bin/python" ]; then
    echo "ERROR: venv not found. Run setup.sh first."
    exit 1
fi

exec "$VENV/bin/python" "$SCRIPT" "$@"
