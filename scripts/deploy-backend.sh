#!/usr/bin/env bash
set -euo pipefail

# ====== CONFIG ======
REMOTE="root@oc"
REMOTE_DIR="/root/task-uncle/server"
SESSION="task-uncle-api"
PORT="4600"

log() { echo -e "\033[0;32m$1\033[0m"; }
err() { echo -e "\033[0;31m$1\033[0m"; }

cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.."

log "📦 Building server..."
(cd apps/api && bun run build)
[ -f apps/api/server.js ] || { err "❌ Build failed! server.js not found."; exit 1; }

log "📤 Copying files to $REMOTE..."
ssh "$REMOTE" "mkdir -p $REMOTE_DIR"
scp apps/api/server.js scripts/run-server-daemon.sh "$REMOTE:$REMOTE_DIR/"

log "🔄 Restarting server..."
ssh "$REMOTE" bash <<REMOTE_EOF
  set -e
  tmux kill-session -t "$SESSION" 2>/dev/null || true
  chmod +x "$REMOTE_DIR/run-server-daemon.sh"
  cd "$REMOTE_DIR"
  tmux new-session -d -s "$SESSION" "./run-server-daemon.sh"
  sleep 3
  tmux has-session -t "$SESSION" && echo "✅ tmux session '$SESSION' running"
  curl -fsS http://127.0.0.1:$PORT/health && echo
REMOTE_EOF

log "✅ Backend deployed: https://taskuncle.com/api/"
echo "  Logs:   ssh $REMOTE 'tail -f $REMOTE_DIR/server.log'"
echo "  Attach: ssh $REMOTE -t 'tmux attach -t $SESSION'"
