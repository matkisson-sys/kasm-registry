# Cursor for Kasm Workspaces (Debian 12 / Bookworm)
# Kasm 1.17.x base
FROM kasmweb/core-debian-bookworm:1.17.0

ARG CURSOR_VERSION=1.7

USER root
ENV DEBIAN_FRONTEND=noninteractive \
    STARTUPDIR=/dockerstartup \
    HOME=/home/kasm-default-profile

WORKDIR ${HOME}

# ---- Runtime deps for Electron/Chromium apps (Cursor + Chrome) and window tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg xdg-utils xdg-user-dirs \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libx11-xcb1 libxcb1 libxcb-dri3-0 libxshmfence1 \
    libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 \
    libgbm1 libgtk-3-0 libnspr4 libnss3 libxss1 \
    libdrm2 libxkbcommon0 libglu1-mesa libgl1-mesa-dri libegl1 libgles2 \
    libnotify4 fonts-liberation \
    wmctrl xdotool xfconf \
 && rm -rf /var/lib/apt/lists/*

# ---- Google Chrome (stable) with a wrapper that is VNC/X11 friendly
RUN mkdir -p /etc/apt/keyrings \
 && curl -fsSL https://dl.google.com/linux/linux_signing_key.pub \
    | gpg --dearmor -o /etc/apt/keyrings/google-linux.gpg \
 && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-linux.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
    > /etc/apt/sources.list.d/google-chrome.list \
 && apt-get update && apt-get install -y --no-install-recommends google-chrome-stable \
 && rm -rf /var/lib/apt/lists/* \
 && mv /usr/bin/google-chrome-stable /usr/bin/google-chrome-stable.real

RUN cat >/usr/bin/google-chrome-stable <<'WRAPSTABLE'
#!/usr/bin/env bash
set -euo pipefail
: "${HOME:=$(/usr/bin/getent passwd $(id -u) | cut -d: -f6)}"
: "${XDG_RUNTIME_DIR:=${HOME}/.xdg-runtime}"
mkdir -p "${XDG_RUNTIME_DIR}" || true
export XDG_RUNTIME_DIR
export LIBGL_ALWAYS_SOFTWARE=1
export QT_X11_NO_MITSHM=1
EXTRA_FLAGS=( \
  --no-first-run --no-default-browser-check \
  --no-sandbox --disable-setuid-sandbox --no-zygote \
  --disable-gpu --disable-gpu-sandbox --disable-dev-shm-usage \
  --disable-crash-reporter \
  --ozone-platform=x11 --use-gl=swiftshader \
  --password-store=basic \
)
exec -a google-chrome-stable /usr/bin/google-chrome-stable.real "${EXTRA_FLAGS[@]}" "$@"
WRAPSTABLE
RUN chmod +x /usr/bin/google-chrome-stable \
 && ln -sf /usr/bin/google-chrome-stable /usr/bin/google-chrome \
 && update-alternatives --install /usr/bin/x-www-browser x-www-browser /usr/bin/google-chrome-stable 200 \
 && update-alternatives --set x-www-browser /usr/bin/google-chrome-stable || true

# ---- Cursor (by version)
RUN curl -fL -o /tmp/cursor_${CURSOR_VERSION}_amd64.deb \
     "https://api2.cursor.sh/updates/download/golden/linux-x64-deb/cursor/${CURSOR_VERSION}" \
 && apt-get update && apt-get install -y /tmp/cursor_${CURSOR_VERSION}_amd64.deb \
 && rm -f /tmp/cursor_${CURSOR_VERSION}_amd64.deb \
 && rm -rf /var/lib/apt/lists/*

# ---- Prevent XFCE components from autostarting (hide panel/desktop permanently)
RUN mkdir -p /home/kasm-default-profile/.config/autostart \
 && printf '[Desktop Entry]\nType=Application\nName=xfdesktop\nHidden=true\n' \
      > /home/kasm-default-profile/.config/autostart/xfdesktop.desktop \
 && printf '[Desktop Entry]\nType=Application\nName=xfce4-panel\nHidden=true\n' \
      > /home/kasm-default-profile/.config/autostart/xfce4-panel.desktop

# ---- Kasm custom startup script: app-only UX (no desktop/panel)
RUN cat > ${STARTUPDIR}/custom_startup.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Eat Kasm flags (compat with go/assign)
while [[ $# -gt 0 ]]; do
  case "$1" in
    --go|--assign) shift ;;
    --url) shift 2 || true ;;
    *) shift ;;
  esac
done

# Ensure VNC/Xorg is up
if command -v /usr/bin/desktop_ready >/dev/null 2>&1; then
  /usr/bin/desktop_ready
fi

export DISPLAY=:1
export XDG_RUNTIME_DIR="${HOME}/.xdg-runtime"
mkdir -p "${XDG_RUNTIME_DIR}" && chmod 700 "${XDG_RUNTIME_DIR}"

# Make Chrome the default for http/https
export BROWSER=/usr/bin/google-chrome-stable
mkdir -p "${HOME}/.local/share/applications"
cat > "${HOME}/.local/share/applications/mimeapps.list" <<'MIMEEOF'
[Default Applications]
x-scheme-handler/http=google-chrome.desktop
x-scheme-handler/https=google-chrome.desktop
text/html=google-chrome.desktop
MIMEEOF
update-desktop-database "${HOME}/.local/share/applications" >/dev/null 2>&1 || true

# Helpful Electron envs
export LIBGL_ALWAYS_SOFTWARE=1
export QT_X11_NO_MITSHM=1
export ELECTRON_OZONE_PLATFORM_HINT=x11
export ELECTRON_NO_UPDATER=1

# Nuke XFCE chrome if present (belt-and-suspenders)
{ pkill -9 xfce4-panel || true; pkill -9 xfdesktop || true; } >/dev/null 2>&1
xsetroot -solid black || true

# Clear stale single-instance locks
rm -f "${HOME}/.config/Cursor/SingletonLock" \
      "${HOME}/.config/Cursor/SingletonCookie" \
      "${HOME}/.config/Cursor/SingletonSocket" 2>/dev/null || true

# Launch Cursor (foreground via wait)
cursor \
  --no-sandbox \
  --disable-setuid-sandbox --no-zygote \
  --disable-gpu --disable-gpu-sandbox \
  --disable-dev-shm-usage \
  --ozone-platform=x11 --enable-features=UseOzonePlatform \
  --use-gl=swiftshader \
  --password-store=basic \
  --user-data-dir="${HOME}/.config/Cursor" &

# Force fullscreen when the window appears
tries=120
while ((tries--)); do
  wmctrl -x -r "cursor" -b add,fullscreen && break
  wmctrl -r "Cursor" -b add,fullscreen && break
  sleep 0.5
done

wait
EOF
RUN chmod +x ${STARTUPDIR}/custom_startup.sh

# ---- Kasm ownership conventions
RUN chown -R 1000:0 /home/kasm-default-profile
RUN ${STARTUPDIR}/set_user_permission.sh /home/kasm-default-profile
ENV HOME=/home/kasm-user
WORKDIR ${HOME}
RUN mkdir -p ${HOME} && chown -R 1000:0 ${HOME}

# Entrypoint remains the base image's supervisord/KasmVNC
USER 1000
