#!/usr/bin/env bash
# Ask the server to deploy, go back or say what is live (ticket 14, ADR 0024). Used by the
# `deploy` job in ci.yml and by deploy.yml; the same file is in both code repositories.
#
#   .github/scripts/deploy-over-ssh.sh deploy backend <sha>
#   .github/scripts/deploy-over-ssh.sh deploy frontend <sha>
#   .github/scripts/deploy-over-ssh.sh rollback
#   .github/scripts/deploy-over-ssh.sh status
#
# The server's `deploy` user lets this key run nothing but ci-entry.sh, which checks the request
# word by word. Who started it (github:<repo>:<run>:<actor>) and DEPLOY_REASON (base64url) are
# added here. Environment, from the `production` environment's secrets:
#   DEPLOY_SSH_KEY       the private key
#   DEPLOY_KNOWN_HOSTS   the server's pinned host key line(s); no other server is trusted
#   DEPLOY_HOST          e.g. deploy.<domain> (through the Cloudflare Tunnel) or the server
#   DEPLOY_PORT          optional, 22 by default
#   CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET   optional: reach DEPLOY_HOST through
#                        Cloudflare Access with `cloudflared access ssh` (port 22 stays closed)
# The server's output goes to the log and the run's summary; no secret is ever printed. The step
# fails when the server says the deploy failed or was rolled back.
set -euo pipefail

: "${DEPLOY_SSH_KEY:?the production environment needs DEPLOY_SSH_KEY}"
: "${DEPLOY_KNOWN_HOSTS:?the production environment needs DEPLOY_KNOWN_HOSTS}"
: "${DEPLOY_HOST:?the production environment needs DEPLOY_HOST}"
(($# > 0)) || { echo "Say what to do: deploy <kind> <sha>, rollback or status." >&2; exit 2; }

work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
umask 077
printf '%s\n' "$DEPLOY_SSH_KEY" >"$work/key"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" >"$work/known_hosts"

ssh_options=(
  -i "$work/key"
  -p "${DEPLOY_PORT:-22}"
  -o IdentitiesOnly=yes
  -o "UserKnownHostsFile=$work/known_hosts"
  -o StrictHostKeyChecking=yes
  -o BatchMode=yes
  -o ConnectTimeout=30
  -o ServerAliveInterval=15
)
if [[ -n "${CF_ACCESS_CLIENT_ID:-}" ]]; then
  # cloudflared reads the Access service token from these, never from its command line.
  export TUNNEL_SERVICE_TOKEN_ID="$CF_ACCESS_CLIENT_ID"
  export TUNNEL_SERVICE_TOKEN_SECRET="${CF_ACCESS_CLIENT_SECRET:?CF_ACCESS_CLIENT_SECRET goes with the ID}"
  ssh_options+=(-o "ProxyCommand=cloudflared access ssh --hostname %h")
fi

request=("$@")
if [[ "$1" != status ]]; then
  # GitHub user names are letters, digits and hyphens; anything else (a bot's "[bot]") becomes -.
  actor="${GITHUB_ACTOR:-unknown}"
  actor="${actor//[^A-Za-z0-9-]/-}"
  request+=("github:${GITHUB_REPOSITORY#*/}:${GITHUB_RUN_ID:?}:${actor:0:39}")
  if [[ -n "${DEPLOY_REASON:-}" ]]; then
    encoded="$(printf '%s' "${DEPLOY_REASON:0:280}" | base64 -w0 | tr '+/' '-_' | tr -d '=')"
    request+=("reason=$encoded")
  fi
fi

# The words become one request line, as sshd hands it to ci-entry.sh (SSH_ORIGINAL_COMMAND).
remote_request="${request[*]}"
ssh_options+=("deploy@$DEPLOY_HOST" "$remote_request")
set +e
ssh "${ssh_options[@]}" 2>&1 | tee "$work/output"
status="${PIPESTATUS[0]}"
set -e

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    if ((status == 0)); then echo "### Server: done"; else echo "### Server: failed or rolled back"; fi
    echo
    echo '```text'
    cat "$work/output"
    echo '```'
  } >>"$GITHUB_STEP_SUMMARY"
fi
exit "$status"
