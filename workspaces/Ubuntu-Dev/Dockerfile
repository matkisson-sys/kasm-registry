# --- Ubuntu 24 / Noble base (switch to jammy if noble not available)
ARG BASE_IMAGE=kasmweb/core-ubuntu-noble:1.17.0
FROM ${BASE_IMAGE}

USER root
ARG DEBIAN_FRONTEND=noninteractive
ENV STARTUPDIR=/dockerstartup \
    HOME=/home/kasm-default-profile

WORKDIR ${HOME}

# ---- Core OS deps & helpers
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl wget gnupg git xz-utils zip unzip tar gzip bzip2 \
    build-essential pkg-config software-properties-common \
    openssl libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev \
    libffi-dev liblzma-dev tk-dev uuid-dev libncursesw5-dev \
    fonts-liberation xdg-utils xdg-user-dirs \
    wmctrl xdotool xfconf \
    dnsutils net-tools iproute2 less nano \
 && rm -rf /var/lib/apt/lists/*

# ---- Google Chrome (stable) + wrapper for VNC/X11
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

# ---- VS Code (official, stable apt repo)
RUN install -d -m 0755 /etc/apt/keyrings \
 && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
    | gpg --dearmor -o /etc/apt/keyrings/packages.microsoft.gpg \
 && sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list' \
 && apt-get update && apt-get install -y --no-install-recommends code \
 && rm -rf /var/lib/apt/lists/*

# VS Code wrapper to run safely under Kasm/containers
RUN mv /usr/bin/code /usr/bin/code.real && \
  cat >/usr/bin/code <<'WRAP' && chmod +x /usr/bin/code
#!/usr/bin/env bash
set -euo pipefail
: "${HOME:=$(/usr/bin/getent passwd $(id -u) | cut -d: -f6)}"
: "${XDG_RUNTIME_DIR:=${HOME}/.xdg-runtime}"
mkdir -p "${XDG_RUNTIME_DIR}" || true
export XDG_RUNTIME_DIR
export ELECTRON_DISABLE_SANDBOX=1
export ELECTRON_OZONE_PLATFORM_HINT=x11
export LIBGL_ALWAYS_SOFTWARE=1
export QT_X11_NO_MITSHM=1
EXTRA_FLAGS=( \
  --no-sandbox --disable-setuid-sandbox --no-zygote \
  --disable-dev-shm-usage --disable-gpu \
  --ozone-platform=x11 --password-store=basic \
)
exec -a code /usr/bin/code.real "${EXTRA_FLAGS[@]}" "$@"
WRAP


# ---- Dev profile (no nested heredocs; safe at build + runtime)
RUN cat > /etc/profile.d/dev-env.sh <<'EOS'
# ----- Shared dev env for kasm-user sessions -----
export XDG_RUNTIME_DIR="${HOME}/.xdg-runtime"
mkdir -p "${XDG_RUNTIME_DIR}" 2>/dev/null || true

# local bin for pipx/poetry etc.
export PATH="${HOME}/.local/bin:${PATH}"

# pyenv
export PYENV_ROOT="${HOME}/.pyenv"
export PATH="${PYENV_ROOT}/bin:${PATH}"
if command -v pyenv >/dev/null 2>&1; then
  eval "$(pyenv init -)"
fi

# nvm
export NVM_DIR="${HOME}/.nvm"
[ -s "${NVM_DIR}/nvm.sh" ] && . "${NVM_DIR}/nvm.sh"

# sdkman
export SDKMAN_DIR="${HOME}/.sdkman"
[ -s "${SDKMAN_DIR}/bin/sdkman-init.sh" ] && . "${SDKMAN_DIR}/bin/sdkman-init.sh"
EOS

# ---- Language managers (user-level dirs under default profile)
RUN git clone https://github.com/pyenv/pyenv.git ${HOME}/.pyenv || true \
 && mkdir -p ${HOME}/.pyenv/cache

RUN curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash -s -- --no-use \
 && curl -s "https://get.sdkman.io" | bash \
 || true

# ---- Preinstall toolchains (Python 3.12, Node LTS + pnpm/yarn, Java 21 + Maven/Gradle)
RUN bash -lc '\
  set -e; \
  source /etc/profile.d/dev-env.sh; \
  # Python
  pyenv install -s 3.12.5 && pyenv global 3.12.5; \
  pip3 install --no-cache-dir --upgrade pip pipx && pipx install poetry; \
  # Node
  . "${NVM_DIR}/nvm.sh"; nvm install --lts && nvm alias default lts/*; \
  npm i -g pnpm yarn npm-check-updates; \
  # Java
  . "${SDKMAN_DIR}/bin/sdkman-init.sh"; \
  yes | sdk install java 21.0.4-tem || yes | sdk install java 21.0.5-tem || yes | sdk install java 21.0.6-tem; \
  yes | sdk install maven; \
  yes | sdk install gradle \
'

# ---- Disable XFCE panel/desktop (app-only UX)
RUN mkdir -p ${HOME}/.config/autostart \
 && printf '[Desktop Entry]\nType=Application\nName=xfdesktop\nHidden=true\n' \
      > ${HOME}/.config/autostart/xfdesktop.desktop \
 && printf '[Desktop Entry]\nType=Application\nName=xfce4-panel\nHidden=true\n' \
      > ${HOME}/.config/autostart/xfce4-panel.desktop

# ---- Optional: preseed Code extensions into the default profile
RUN mkdir -p ${HOME}/.vscode/extensions ${HOME}/.config/Code/User \
 && code --user-data-dir="${HOME}/.config/Code" --extensions-dir="${HOME}/.vscode/extensions" \
    --install-extension ms-python.python --force || true \
 && code --user-data-dir="${HOME}/.config/Code" --extensions-dir="${HOME}/.vscode/extensions" \
    --install-extension ms-python.vscode-pylance --force || true \
 && code --user-data-dir="${HOME}/.config/Code" --extensions-dir="${HOME}/.vscode/extensions" \
    --install-extension ms-azuretools.vscode-docker --force || true \
 && code --user-data-dir="${HOME}/.config/Code" --extensions-dir="${HOME}/.vscode/extensions" \
    --install-extension redhat.java --force || true \
 && code --user-data-dir="${HOME}/.config/Code" --extensions-dir="${HOME}/.vscode/extensions" \
    --install-extension vscjava.vscode-java-pack --force || true \
 && code --user-data-dir="${HOME}/.config/Code" --extensions-dir="${HOME}/.vscode/extensions" \
    --install-extension esbenp.prettier-vscode --force || true \
 && code --user-data-dir="${HOME}/.config/Code" --extensions-dir="${HOME}/.vscode/extensions" \
    --install-extension dbaeumer.vscode-eslint --force || true \
 && code --user-data-dir="${HOME}/.config/Code" --extensions-dir="${HOME}/.vscode/extensions" \
    --install-extension vscjava.vscode-gradle --force || true \
 && code --user-data-dir="${HOME}/.config/Code" --extensions-dir="${HOME}/.vscode/extensions" \
    --install-extension editorconfig.editorconfig --force || true

# ---- Kasm custom startup: hide desktop & fullscreen VS Code, Chrome for xdg-open
RUN cat > ${STARTUPDIR}/custom_startup.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Consume Kasm flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --go|--assign) shift ;;
    --url) shift 2 || true ;;
    *) shift ;;
  esac
done

command -v /usr/bin/desktop_ready >/dev/null 2>&1 && /usr/bin/desktop_ready

export DISPLAY=:1
export XDG_RUNTIME_DIR="${HOME}/.xdg-runtime"
mkdir -p "${XDG_RUNTIME_DIR}" && chmod 700 "${XDG_RUNTIME_DIR}"

# Make Chrome default for http(s)
export BROWSER=/usr/bin/google-chrome-stable
mkdir -p "${HOME}/.local/share/applications"
cat > "${HOME}/.local/share/applications/mimeapps.list" <<'MIMEEOF'
[Default Applications]
x-scheme-handler/http=google-chrome.desktop
x-scheme-handler/https=google-chrome.desktop
text/html=google-chrome.desktop
MIMEEOF
update-desktop-database "${HOME}/.local/share/applications" >/dev/null 2>&1 || true

# Hide panel/desktop, set clean background
{ pkill -9 xfce4-panel || true; pkill -9 xfdesktop || true; } >/dev/null 2>&1
xsetroot -solid black || true

# Launch VS Code
code &

# Fullscreen when window appears
tries=120
while ((tries--)); do
  wmctrl -x -r "code" -b add,fullscreen && break
  wmctrl -r "Visual Studio Code" -b add,fullscreen && break
  sleep 0.5
done

wait
EOF
RUN chmod +x ${STARTUPDIR}/custom_startup.sh

# ---- Kasm ownership & user
RUN chown -R 1000:0 /home/kasm-default-profile \
 && ${STARTUPDIR}/set_user_permission.sh /home/kasm-default-profile
ENV HOME=/home/kasm-user
WORKDIR ${HOME}
RUN mkdir -p ${HOME} && chown -R 1000:0 ${HOME}

USER 1000
