FROM mcr.microsoft.com/windows/servercore:ltsc2019
EXPOSE 5488

# install nodejs
ADD https://nodejs.org/dist/v16.12.0/node-v16.12.0-x64.msi nodejs.msi
RUN msiexec.exe /q /i nodejs.msi
RUN del /f nodejs.msi