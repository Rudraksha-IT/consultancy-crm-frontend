#!/usr/bin/env bash
# Install cloudflared on the GitHub runner, only when the server is reached through Cloudflare
# Access (CF_ACCESS_CLIENT_ID is set; ticket 14, ADR 0024). It comes from Cloudflare's own signed
# package repository, so apt checks every download. The same file is in both code repositories.
set -euo pipefail

if [[ -z "${CF_ACCESS_CLIENT_ID:-}" ]]; then
  echo "No Cloudflare Access token: the server is reached directly; cloudflared isn't needed."
  exit 0
fi
keyring=/usr/share/keyrings/cloudflare-main.gpg
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee "$keyring" >/dev/null
echo "deb [signed-by=$keyring] https://pkg.cloudflare.com/cloudflared any main" |
  sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
sudo apt-get update -qq -o Dir::Etc::sourcelist=sources.list.d/cloudflared.list \
  -o Dir::Etc::sourceparts=- -o APT::Get::List-Cleanup=0
sudo apt-get install -y -qq cloudflared
cloudflared --version
