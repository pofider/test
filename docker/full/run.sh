# file run.sh
#!/bin/sh

Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 & export DISPLAY=:99 && node "/usr/src/app/index.js"

