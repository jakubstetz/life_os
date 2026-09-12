# Life OS dev stack — source from ~/.zshrc:
#   [[ -f "$HOME/life_os/scripts/lifeos.zsh" ]] && source "$HOME/life_os/scripts/lifeos.zsh"

: "${LIFE_OS_ROOT:=${HOME}/life_os}"
: "${LIFE_OS_API_PORT:=8000}"
: "${LIFE_OS_WEB_PORT:=5173}"

_lifeos_local_dir() {
  echo "${LIFE_OS_ROOT}/.local"
}

_lifeos_state_dir() {
  echo "$(_lifeos_local_dir)"
}

_lifeos_log_dir() {
  echo "$(_lifeos_local_dir)/logs"
}

_lifeos_port_pid() {
  lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -1
}

_lifeos_load_env() {
  local env_file="${LIFE_OS_ROOT}/.env"
  [[ -f "$env_file" ]] || return 0
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
}

_lifeos_data_root() {
  _lifeos_load_env
  local root="${LIFE_OS_DATA_ROOT:-}"
  if [[ -z "$root" ]]; then
    echo "${LIFE_OS_ROOT}/seeds"
    return
  fi
  root="${root/#\~/$HOME}"
  if [[ "$root" != /* ]]; then
    root="${LIFE_OS_ROOT}/${root}"
  fi
  if [[ -d "$root" ]]; then
    (cd "$root" && pwd -P)
  else
    echo "$root"
  fi
}

_lifeos_print_volume() {
  local data_root="${1:-$(_lifeos_data_root)}"
  local label="live"
  if [[ -z "${LIFE_OS_DATA_ROOT}" ]]; then
    label="seeds (LIFE_OS_DATA_ROOT unset)"
  elif [[ "$data_root" == "${LIFE_OS_ROOT}/seeds" || "$data_root" == "${LIFE_OS_ROOT}/seeds/"* ]]; then
    label="seeds"
  fi
  echo "Volume  ${data_root}  [${label}]"
}

_lifeos_require() {
  local travel="${LIFE_OS_ROOT}/apps/travel"
  local web="${travel}/web"

  if [[ ! -d "$LIFE_OS_ROOT" ]]; then
    echo "lifeos: repo not found at ${LIFE_OS_ROOT}" >&2
    return 1
  fi
  if [[ ! -x "${travel}/.venv/bin/uvicorn" ]]; then
    echo "lifeos: missing API venv. From repo root:" >&2
    echo "  python3 -m venv apps/travel/.venv" >&2
    echo "  apps/travel/.venv/bin/pip install -e apps/travel" >&2
    return 1
  fi
  if [[ ! -d "${web}/node_modules" ]]; then
    echo "lifeos: missing web deps. Run:" >&2
    echo "  (cd apps/travel/web && npm install)" >&2
    return 1
  fi
}

_lifeos_is_up() {
  [[ -n "$(_lifeos_port_pid "$LIFE_OS_API_PORT")" && -n "$(_lifeos_port_pid "$LIFE_OS_WEB_PORT")" ]]
}

_lifeos_wait_ready() {
  local i=0
  while (( i < 20 )); do
    _lifeos_is_up && return 0
    sleep 0.25
    (( i++ ))
  done
  return 1
}

_lifeos_bg() {
  # Detach from the shell TTY so zsh doesn't suspend background jobs (npm/vite).
  local log_file="$1"
  shift
  (
    "$@"
  ) >>"$log_file" 2>&1 < /dev/null &
  disown
  echo $!
}

_lifeos_status() {
  _lifeos_load_env
  _lifeos_print_volume

  local api_pid web_pid
  api_pid=$(_lifeos_port_pid "$LIFE_OS_API_PORT")
  web_pid=$(_lifeos_port_pid "$LIFE_OS_WEB_PORT")

  if [[ -n "$api_pid" ]]; then
    echo "API   up   http://127.0.0.1:${LIFE_OS_API_PORT}  (pid ${api_pid})"
  else
    echo "API   down"
  fi
  if [[ -n "$web_pid" ]]; then
    echo "Web   up   http://127.0.0.1:${LIFE_OS_WEB_PORT}/  (pid ${web_pid})"
  else
    echo "Web   down"
  fi
}

_lifeos_up() {
  _lifeos_require || return 1
  _lifeos_load_env

  local state_dir pidfile log_dir
  state_dir=$(_lifeos_state_dir)
  pidfile="${state_dir}/dev.pids"
  log_dir=$(_lifeos_log_dir)
  mkdir -p "$state_dir" "$log_dir"

  local travel="${LIFE_OS_ROOT}/apps/travel"
  local web="${travel}/web"
  local api_pid web_pid

  api_pid=$(_lifeos_port_pid "$LIFE_OS_API_PORT")
  web_pid=$(_lifeos_port_pid "$LIFE_OS_WEB_PORT")

  if [[ -n "$api_pid" && -n "$web_pid" ]]; then
    echo "Life OS is already running."
    _lifeos_status
    return 0
  fi

  : >"$pidfile"

  if [[ -z "$api_pid" ]]; then
    api_pid=$(
      _lifeos_bg "${log_dir}/api.log" \
        zsh -c "cd ${(q)travel} && export PYTHONPATH=. && exec ${(q)travel}/.venv/bin/uvicorn api.server:app --reload --port ${LIFE_OS_API_PORT}"
    )
    echo "$api_pid api" >>"$pidfile"
    echo "Started API (pid ${api_pid})"
  else
    echo "API already listening on ${LIFE_OS_API_PORT} (pid ${api_pid})"
  fi

  if [[ -z "$web_pid" ]]; then
    web_pid=$(
      _lifeos_bg "${log_dir}/web.log" \
        zsh -c "cd ${(q)web} && exec npm run dev -- --port ${LIFE_OS_WEB_PORT} --host 127.0.0.1"
    )
    echo "$web_pid web" >>"$pidfile"
    echo "Started web (pid ${web_pid})"
  else
    echo "Web already listening on ${LIFE_OS_WEB_PORT} (pid ${web_pid})"
  fi

  echo
  if ! _lifeos_wait_ready; then
    echo "Still starting (check logs if this persists)..." >&2
  fi
  _lifeos_status
  echo "Logs: ${log_dir}/"
}

_lifeos_down() {
  local state_dir pidfile
  state_dir=$(_lifeos_state_dir)
  pidfile="${state_dir}/dev.pids"

  local pid role
  if [[ -f "$pidfile" ]]; then
    while read -r pid role; do
      [[ -n "$pid" ]] && kill "$pid" 2>/dev/null
    done <"$pidfile"
    rm -f "$pidfile"
  fi

  local p
  for p in $(_lifeos_port_pid "$LIFE_OS_API_PORT") $(_lifeos_port_pid "$LIFE_OS_WEB_PORT"); do
    [[ -n "$p" ]] && kill "$p" 2>/dev/null
  done

  sleep 0.3

  for p in $(_lifeos_port_pid "$LIFE_OS_API_PORT") $(_lifeos_port_pid "$LIFE_OS_WEB_PORT"); do
    [[ -n "$p" ]] && kill -9 "$p" 2>/dev/null
  done

  echo "Life OS stopped."
  _lifeos_status
}

lifeos() {
  local cmd="${1:-}"
  case "$cmd" in
    up) _lifeos_up ;;
    down) _lifeos_down ;;
    status) _lifeos_status ;;
    "")
      if _lifeos_is_up; then
        _lifeos_status
      else
        _lifeos_up
      fi
      ;;
    *)
      echo "lifeos: unknown command '${cmd}' (try: up, down, status)" >&2
      return 1
      ;;
  esac
}

los() { lifeos "$@"; }
