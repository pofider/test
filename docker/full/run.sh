# file run.sh
#!/bin/sh

if [ -d "/jsreport" ]; then 

  # link data folder from mounted volume

  if [ ! -d "/jsreport/data" ]; then 
    mkdir "/jsreport/data"
  fi

  ln -nsf "/jsreport/data" "/app/data"

  # copy default config  

  if [ ! -f "/jsreport/prod.config.json" ]; then    
    cp "/app/prod.config.json" "/jsreport/prod.config.json"    
  fi

  if [ ! -f "/jsreport/dev.config.json" ]; then
      cp "/app/dev.config.json" "/jsreport/dev.config.json"
  fi

  # delete default config and link from volume
	
  rm -f "/app/prod.config.json"
  ln -s "/jsreport/prod.config.json" "/app/prod.config.json"

  rm -f "/app/dev.config.json"
  ln -s "/jsreport/dev.config.json" "/app/dev.config.json"

  chown -R jsreport:jsreport /jsreport
fi

su jsreport

Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 & export DISPLAY=:99.0 && node "/app/server.js"