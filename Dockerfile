FROM ubuntu:yakkety
MAINTAINER Jan Blaha
EXPOSE 5488

RUN apt-get update && apt-get install -y curl sudo bzip2 && \
    curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash - && \
    apt-get install -y nodejs libfontconfig1 libfontconfig1-dev

RUN adduser --disabled-password --gecos "" jsreport
RUN echo "jsreport ALL=(root) NOPASSWD: /usr/local/bin/node" >> /etc/sudoers
RUN echo "jsreport ALL=(root) NOPASSWD: /usr/local/bin/npm" >> /etc/sudoers

VOLUME ["/jsreport"]

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ADD run.sh /usr/src/app/jsreport/run.sh


COPY package.json /usr/src/app/
RUN npm install --production
RUN node node_modules/jsreport --init

RUN sudo npm install jsreport-ejs --production --save --save-exact
RUN sudo npm install jsreport-jade --production --save --save-exact
RUN sudo npm install jsreport-freeze --production --save --save-exact
RUN sudo npm install jsreport-phantom-image --production --save --save-exact
RUN sudo npm install jsreport-wkhtmltopdf --production --save --save-exact

COPY . /usr/src/app

ENV NODE_ENV production

HEALTHCHECK CMD curl --fail http://localhost || exit 1

CMD ["bash", "/usr/src/app/run.sh"]