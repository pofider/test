FROM mcr.microsoft.com/windows/servercore:ltsc2019
EXPOSE 5488

# fonts for chrome https://github.com/gantrior/docker-chrome-windows
ADD ./packages/jsreport/docker/windowsservercore/FontsToAdd.tar /fonts/
WORKDIR /fonts
SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]
RUN .\Add-Font.ps1 fonts
SHELL ["cmd", "/S", "/C"]

WORKDIR /app

# volume for custom mount
VOLUME c:\\jsreport
COPY ./packages/jsreport/docker/windowsservercore/run.js /app/run.js
COPY ./packages/jsreport/docker/windowsservercore/editConfig.js /app/editConfig.js

ENV chrome_launchOptions_args --no-sandbox,--disable-dev-shm-usage
