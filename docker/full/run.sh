# file run.sh
#!/bin/sh

_kill_procs() {
  kill -TERM $node
  wait $node
  kill -TERM $xvfb
}

# Setup a trap to catch SIGTERM and relay it to child processes
trap _kill_procs SIGTERM

Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
xvfb=$!

export DISPLAY=:99

node "/usr/src/app/index.js"
node=$!

wait $node
wait $xvfb
