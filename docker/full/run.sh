# file run.sh
#!/bin/sh

echo Trying to remove the lock on displat 99
rm /tmp/.X99-lock > /dev/null 2>&1

echo Running display 99
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &

echo Starting node.js
export DISPLAY=:99 && node "/usr/src/app/server.js"