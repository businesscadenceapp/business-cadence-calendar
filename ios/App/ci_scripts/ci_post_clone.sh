#!/bin/sh

# Xcode Cloud ci_post_clone.sh
# Runs after repo clone, before Xcode builds the iOS project.
# Installs Node.js dependencies and builds the web app.

set -e

# Disable Homebrew auto-update to avoid long download delays
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_ENV_HINTS=1
export HOMEBREW_NO_INSTALL_CLEANUP=1

echo "=== Current PATH ==="
echo $PATH

echo "=== Checking for Node.js ==="
if command -v node &> /dev/null; then
  echo "Node.js already installed: $(node --version)"
else
  echo "Installing Node.js via brew (no auto-update)..."
  brew install node
fi

echo "=== Checking for pnpm ==="
if command -v pnpm &> /dev/null; then
  echo "pnpm already installed: $(pnpm --version)"
else
  echo "Installing pnpm..."
  npm install -g pnpm
fi

echo "=== Moving to project root ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
echo "Working directory: $(pwd)"

echo "=== Installing npm dependencies ==="
pnpm install --no-frozen-lockfile

echo "=== Building web app ==="
pnpm build

echo "=== Syncing Capacitor ==="
npx cap sync ios --no-open

echo "=== Done! ==="
