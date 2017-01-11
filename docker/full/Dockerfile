FROM ubuntu:yakkety
MAINTAINER Jan Blaha
EXPOSE 5488

RUN apt-get update && apt-get install -y curl sudo && \
    curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash - && \
    apt-get install -y nodejs libgtk2.0-dev libxtst-dev libxss1 libgconf2-dev libnss3-dev libasound2-dev xvfb

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
RUN sudo npm install jsreport-wkhtmltopdf --production --save --save-exact

RUN sudo npm install electron-prebuilt@1.4.8 --production --save --save-exact
RUN sudo npm install jsreport-electron-pdf --production --save --save-exact

COPY . /usr/src/app

ENV NODE_ENV production
ENV DEBUG *

CMD ["bash", "/usr/src/app/run.sh"]
RUN Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &