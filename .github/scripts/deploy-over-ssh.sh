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
#   DEPLOY_HOST_KEY      the server's host key, type and key only (ssh-ed25519 AAAA...), with no
#                        address in it; no other server is trusted
#   PRODUCT_DOMAIN       the organisation's secret, the one place the domain is kept; the server
#                        is deploy.<PRODUCT_DOMAIN>
#   DEPLOY_PORT          optional, 22 by default
#   CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET   optional: reach the server through
#                        Cloudflare Access with `cloudflared access ssh` (port 22 stays closed)
# DEPLOY_HOST, when set, replaces deploy.<PRODUCT_DOMAIN>; only the local test uses it.
# The server's output goes to the log and the run's summary; no secret is ever printed. The step
# fails when the server says the deploy failed or was rolled back.
set -euo pipefail

: "${DEPLOY_SSH_KEY:?the production environment needs DEPLOY_SSH_KEY}"
: "${DEPLOY_HOST_KEY:?the production environment needs DEPLOY_HOST_KEY}"
host="${DEPLOY_HOST:-deploy.${PRODUCT_DOMAIN:?the organisation needs the secret PRODUCT_DOMAIN}}"
host_pattern='^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$'
key_pattern='^[a-z0-9-]+ [A-Za-z0-9+/]+=*$'
[[ "$host" =~ $host_pattern ]] || { echo "PRODUCT_DOMAIN must be a plain domain name." >&2; exit 2; }
[[ "$DEPLOY_HOST_KEY" =~ $key_pattern ]] || {
  echo "DEPLOY_HOST_KEY must be one line with the key type and the key only (ssh-ed25519 AAAA...)." >&2
  exit 2
}
(($# > 0)) || { echo "Say what to do: deploy <kind> <sha>, rollback or status." >&2; exit 2; }

work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
umask 077
printf '%s\n' "$DEPLOY_SSH_KEY" >"$work/key"
# Pinned under a fixed name, not the address, so moving to a new domain leaves it as it is.
printf 'deploy-server %s\n' "$DEPLOY_HOST_KEY" >"$work/known_hosts"

ssh_options=(
  -i "$work/key"
  -p "${DEPLOY_PORT:-22}"
  -o IdentitiesOnly=yes
  -o "UserKnownHostsFile=$work/known_hosts"
  -o HostKeyAlias=deploy-server
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
ssh_options+=("deploy@$host" "$remote_request")
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
