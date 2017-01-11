# file run.sh
#!/bin/sh

echo starting xvfb
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
export DISPLAY=:99.0

echo starting node
node "/usr/src/app/index.js"
echo node is now running