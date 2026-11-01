#!/usr/bin/env bash
# Managed by Road to Daytona deployment kit v1.
# Run on an Ubuntu/Debian server, never on your local Windows computer.
set -Eeuo pipefail
umask 022

die() { printf 'Deployment stopped: %s\n' "$*" >&2; exit 1; }
usage() { printf 'Usage: sudo bash deploy.sh /path/to/Road-to-Daytona.html [--port 8080|80]\n'; }

[[ $# -eq 1 || $# -eq 3 ]] || { usage; exit 2; }
html_source=$(readlink -f -- "$1") || die 'Cannot resolve the supplied HTML file.'
port=8080
if [[ $# -eq 3 ]]; then
  [[ $2 == --port && ( $3 == 8080 || $3 == 80 ) ]] || { usage; exit 2; }
  port=$3
fi
[[ $EUID -eq 0 ]] || die 'Run this script with sudo.'
[[ -f $html_source && -s $html_source ]] || die 'Supply a nonempty HTML file.'
[[ -r /etc/os-release ]] || die 'Cannot identify this operating system.'
. /etc/os-release
[[ ${ID:-} == ubuntu || ${ID:-} == debian ]] || die 'This script supports Ubuntu and Debian only.'
[[ -d /run/systemd/system ]] || die 'A running systemd installation is required.'
for command_name in apt-get systemctl ss awk grep install cp cmp mktemp readlink; do
  command -v "$command_name" >/dev/null || die "Required command is missing: $command_name"
done

marker='# Managed by Road to Daytona deployment kit v1.'
service=ieee-daytona.service
web_root=/var/www/ieee-daytona
config_dir=/etc/ieee-daytona
config_file=$config_dir/nginx.conf
unit_file=/etc/systemd/system/$service
backup_root=/var/backups/ieee-daytona
stage=$(mktemp -d /tmp/ieee-daytona.XXXXXXXX)
backup_dir=
mask_added=0
write_started=0
was_active=0
was_enabled=0
had_index=0
had_config=0
had_unit=0
had_marker=0
systemctl is-active --quiet "$service" && was_active=1
systemctl is-enabled --quiet "$service" && was_enabled=1

cleanup() {
  local status=$?
  trap - EXIT
  set +e
  if (( write_started && status != 0 )); then
    printf 'Restoring this site from %s.\n' "$backup_dir" >&2
    if (( had_index )); then cp -p -- "$backup_dir/index.html" "$web_root/index.html"; else rm -f -- "$web_root/index.html"; fi
    if (( had_config )); then cp -p -- "$backup_dir/nginx.conf" "$config_file"; else rm -f -- "$config_file"; fi
    if (( had_unit )); then cp -p -- "$backup_dir/$service" "$unit_file"; else rm -f -- "$unit_file"; fi
    (( had_marker )) || rm -f -- "$web_root/.ieee-daytona-managed"
    systemctl daemon-reload
    if (( was_active )); then systemctl restart "$service"; else systemctl stop "$service"; fi
    (( was_enabled )) || systemctl disable "$service" >/dev/null 2>&1
    printf 'The attempted files remain in the backup directory for inspection.\n' >&2
  fi
  if (( mask_added )); then
    # Only a previously absent distribution service was masked by this run.
    systemctl disable nginx.service >/dev/null 2>&1
    systemctl unmask --runtime nginx.service >/dev/null 2>&1
  fi
  rm -f -- "$stage/nginx.conf" "$stage/$service" "$stage/system-config.txt" "$stage/nginx-test.txt" "$stage/response.html" "$stage/index.html"
  rmdir -- "$stage" 2>/dev/null
  exit "$status"
}
trap cleanup EXIT

check_owned_file() {
  local pathname=$1
  [[ ! -L $pathname ]] || die "Refusing a symbolic link: $pathname"
  if [[ -e $pathname ]]; then
    [[ -f $pathname ]] || die "Expected a regular file: $pathname"
    [[ $(head -n 1 -- "$pathname") == "$marker" ]] || die "An existing configuration is not owned by this kit: $pathname"
  fi
}
for directory in "$web_root" "$config_dir" "$backup_root" /var/log/ieee-daytona /run/ieee-daytona; do
  [[ ! -L $directory ]] || die "Refusing a symbolic-link directory: $directory"
  [[ ! -e $directory || -d $directory ]] || die "Expected a directory: $directory"
done
check_owned_file "$config_file"
check_owned_file "$unit_file"
current_fragment=$(systemctl show "$service" -p FragmentPath --value)
[[ -z $current_fragment || $current_fragment == "$unit_file" ]] || die "A service with this name already exists at $current_fragment."
if [[ -d $web_root ]]; then
  [[ -f $web_root/.ieee-daytona-managed && ! -L $web_root/.ieee-daytona-managed ]] || die "Existing content at $web_root is not managed by this kit."
  [[ $(cat "$web_root/.ieee-daytona-managed") == "$marker" ]] || die 'The site ownership marker does not match.'
  had_marker=1
fi
[[ ! -L $web_root/index.html ]] || die 'Refusing a symbolic-link index.html.'
[[ ! -e $web_root/index.html || -f $web_root/index.html ]] || die 'index.html is not a regular file.'

# A rerun may use this kit's current listener. Any other listener is a conflict.
listeners=$(ss -H -ltnp "sport = :$port")
if [[ -n $listeners ]]; then
  (( was_active )) || die "TCP port $port already has a listener."
  while IFS= read -r listener; do
    process_ids=$(printf '%s\n' "$listener" | grep -oE 'pid=[0-9]+' || true)
    [[ -n $process_ids ]] || die "Cannot identify the owner of TCP port $port."
    while IFS= read -r process_id; do
      process_id=${process_id#pid=}
      grep -qE '(^|/)ieee-daytona\.service($|/)' "/proc/$process_id/cgroup" || die "TCP port $port is used by another service."
    done <<< "$process_ids"
  done <<< "$listeners"
fi

if ! command -v nginx >/dev/null; then
  # Prevent package installation from starting a new default site on port 80.
  # Existing Nginx installations and their service settings are never changed.
  [[ $(systemctl show nginx.service -p LoadState --value) == not-found ]] || die 'An Nginx service already exists but its executable is missing.'
  [[ ! -e /run/systemd/system/nginx.service && ! -L /run/systemd/system/nginx.service ]] || die 'A runtime Nginx service override already exists.'
  systemctl mask --runtime nginx.service
  mask_added=1
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends nginx curl
  systemctl disable nginx.service >/dev/null
  systemctl unmask --runtime nginx.service >/dev/null
  mask_added=0
elif ! command -v curl >/dev/null; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends curl
fi
[[ $(command -v nginx) == /usr/sbin/nginx ]] || die 'Expected the Ubuntu/Debian Nginx executable at /usr/sbin/nginx.'

# Check the effective distribution configuration even when its service is stopped.
# This kit uses a separate configuration, outside sites-enabled and conf.d.
nginx -T -c /etc/nginx/nginx.conf > "$stage/system-config.txt" 2> "$stage/nginx-test.txt" || {
  cat "$stage/nginx-test.txt" >&2
  die 'The existing Nginx configuration does not pass validation.'
}
if awk -v wanted="$port" '
  { sub(/#.*/, ""); for (i=1; i<=NF; i++) {
      token=$i; gsub(/[;{}"]/, "", token);
      if (next_is_address) {
        if (token == wanted || token ~ (":" wanted "$")) conflict=1;
        next_is_address=0;
      }
      if (token == "listen") next_is_address=1;
    }
  }
  END { exit conflict ? 0 : 1 }
' "$stage/system-config.txt"; then
  die "An existing Nginx configuration already declares port $port. Choose a free port or have the server administrator review that configuration."
fi

install -d -m 0755 -- "$web_root" "$config_dir" /var/log/ieee-daytona /run/ieee-daytona
install -d -m 0700 -- "$backup_root"
backup_dir=$(mktemp -d "$backup_root/$(date -u +%Y%m%dT%H%M%SZ).XXXXXXXX")
[[ ! -f $web_root/index.html ]] || { cp -p -- "$web_root/index.html" "$backup_dir/index.html"; had_index=1; }
[[ ! -f $config_file ]] || { cp -p -- "$config_file" "$backup_dir/nginx.conf"; had_config=1; }
[[ ! -f $unit_file ]] || { cp -p -- "$unit_file" "$backup_dir/$service"; had_unit=1; }
cp -- "$html_source" "$backup_dir/supplied.html"

cat > "$stage/nginx.conf" <<EOF
$marker
user www-data;
worker_processes auto;
pid /run/ieee-daytona/nginx.pid;
error_log /var/log/ieee-daytona/error.log warn;
events { worker_connections 1024; }
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /var/log/ieee-daytona/access.log;
    sendfile on;
    server_tokens off;
    server {
        listen $port;
        server_name _;
        root $web_root;
        index index.html;
        autoindex off;
        add_header X-Content-Type-Options nosniff always;
        location / { try_files \$uri \$uri/ =404; }
        location ~ (^|/)\. { deny all; }
    }
}
EOF
cat > "$stage/$service" <<EOF
$marker
[Unit]
Description=Road to Daytona static website
After=network.target

[Service]
Type=simple
RuntimeDirectory=ieee-daytona
RuntimeDirectoryMode=0755
ExecStart=/usr/sbin/nginx -c $config_file -g "daemon off;"
ExecReload=/usr/sbin/nginx -c $config_file -s reload
KillSignal=SIGQUIT
TimeoutStopSec=10
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/log/ieee-daytona /run/ieee-daytona

[Install]
WantedBy=multi-user.target
EOF
nginx -t -c "$stage/nginx.conf"
cp -- "$html_source" "$stage/index.html"

write_started=1
printf '%s\n' "$marker" > "$web_root/.ieee-daytona-managed"
chmod 0644 "$web_root/.ieee-daytona-managed"
install -m 0644 -- "$stage/index.html" "$web_root/index.html"
install -m 0644 -- "$stage/nginx.conf" "$config_file"
install -m 0644 -- "$stage/$service" "$unit_file"
systemctl daemon-reload
systemctl restart "$service"
curl --noproxy '*' --fail --silent --show-error --max-time 10 --retry 5 --retry-delay 1 --retry-connrefused "http://127.0.0.1:$port/" > "$stage/response.html"
cmp -- "$stage/index.html" "$stage/response.html" || die 'The local HTTP response differs from the supplied HTML.'
systemctl enable "$service"
write_started=0

printf '\nSite verified locally on TCP port %s.\n' "$port"
printf 'Share: http://YOUR_SERVER_PUBLIC_IP:%s/\n' "$port"
printf 'Backups: %s\n' "$backup_dir"
printf 'Allow inbound TCP %s in the Alibaba security group and any active server firewall.\n' "$port"
printf 'This script does not change firewall rules or existing default-site configuration.\n'
