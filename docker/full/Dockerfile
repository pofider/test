FROM node:6.9
MAINTAINER Jan Blaha
EXPOSE 5488

RUN apt-get update && apt-get install -y sudo && \
    apt-get install -y nodejs libgtk2.0-dev libxtst-dev libxss1 libgconf2-dev libnss3-dev libasound2-dev xvfb xfonts-75dpi xfonts-base

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ADD run.sh /usr/src/app/run.sh

RUN sudo npm install jsreport --production
RUN sudo node node_modules/jsreport --init

RUN sudo npm install jsreport-ejs --production --save --save-exact
RUN sudo npm install jsreport-jade --production --save --save-exact
RUN sudo npm install jsreport-freeze --production --save --save-exact
RUN sudo npm install jsreport-phantom-image --production --save --save-exact

RUN sudo npm install jsreport-mssql-store --production --save --save-exact
RUN sudo npm install jsreport-postgres-store --production --save --save-exact
RUN sudo npm install jsreport-mongodb-store --production --save --save-exact

RUN sudo wget http://download.gna.org/wkhtmltopdf/0.12/0.12.2.1/wkhtmltox-0.12.2.1_linux-jessie-amd64.deb
RUN sudo dpkg -i wkhtmltox-0.12.2.1_linux-jessie-amd64.deb
RUN sudo npm install jsreport-wkhtmltopdf --production --save --save-exact

RUN sudo npm install electron-prebuilt@1.4.8 --production --save --save-exact
RUN sudo npm install jsreport-electron-pdf --production --save --save-exact

COPY . /usr/src/app

ENV NODE_ENV production
ENV electron:strategy electron-ipc
ENV phantom:strategy phantom-server
ENV tasks:strategy http-server

CMD ["bash", "/usr/src/app/run.sh"]