#!/bin/sh

# Xcode Cloud ci_post_clone.sh
# This script runs after the repo is cloned, before Xcode builds the iOS project.
# It installs Node.js dependencies and builds the web app so Capacitor has assets.

set -e

echo "=== Installing Homebrew ==="
if ! command -v brew &> /dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

echo "=== Installing Node.js ==="
brew install node || true

echo "=== Installing pnpm ==="
npm install -g pnpm || true

echo "=== Moving to project root ==="
# ci_post_clone.sh runs from ios/App/ci_scripts, so go up 3 levels to project root
cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "=== Installing npm dependencies ==="
pnpm install --frozen-lockfile

echo "=== Building web app ==="
pnpm build

echo "=== Syncing Capacitor ==="
npx cap sync ios

echo "=== Done! ==="
