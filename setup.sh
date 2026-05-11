#!/usr/bin/env bash
set -e

echo "==> Installing GTube dependencies..."

# System packages
sudo apt-get update -qq
sudo apt-get install -y \
    mpv \
    ffmpeg \
    python3-gi \
    python3-gi-cairo \
    gir1.2-gtk-4.0 \
    gir1.2-adw-1 \
    gir1.2-gdk-4.0 \
    libadwaita-1-dev \
    python3-pip \
    python3-venv

# Python venv
VENV="$HOME/.local/share/gtube/venv"
mkdir -p "$(dirname "$VENV")"
python3 -m venv "$VENV" --system-site-packages

# Python packages
"$VENV/bin/pip" install --upgrade pip -q
"$VENV/bin/pip" install -r "$(dirname "$0")/requirements.txt" -q

# Desktop entry
mkdir -p "$HOME/.local/share/applications"
cat > "$HOME/.local/share/applications/gtube.desktop" << EOF
[Desktop Entry]
Name=GTube
Comment=YouTube Music for Linux
Exec=$VENV/bin/python $(realpath "$(dirname "$0")/main.py")
Icon=audio-x-generic
Terminal=false
Type=Application
Categories=Audio;Music;GTK;
EOF

echo ""
echo "==> Done! Run with:"
echo "    $VENV/bin/python $(realpath "$(dirname "$0")/main.py")"
echo "    or: bash run.sh"

# Create run script
cat > "$(dirname "$0")/run.sh" << EOF
#!/usr/bin/env bash
exec "$VENV/bin/python" "$(realpath "$(dirname "$0")/main.py")" "\$@"
EOF
chmod +x "$(dirname "$0")/run.sh"
