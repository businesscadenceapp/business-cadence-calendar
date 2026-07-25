#!/bin/sh

# Xcode Cloud ci_post_clone.sh
# Runs after repo clone, before Xcode builds the iOS project.
# Installs Node.js dependencies and builds the web app.

set -e

echo "=== Current PATH ==="
echo $PATH

echo "=== Checking for Node.js ==="
if command -v node &> /dev/null; then
  echo "Node.js already installed: $(node --version)"
else
  echo "Installing Node.js via brew..."
  # Use NONINTERACTIVE to skip Homebrew prompts
  NONINTERACTIVE=1 brew install node
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
pnpm install --frozen-lockfile

echo "=== Building web app ==="
pnpm build

echo "=== Syncing Capacitor ==="
npx cap sync ios --no-open

echo "=== Done! ==="
