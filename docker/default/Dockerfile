FROM node:6.9
MAINTAINER Jan Blaha
EXPOSE 5488

RUN apt-get update && apt-get install -y sudo
RUN npm install npm -g
RUN adduser --disabled-password --gecos "" jsreport
RUN echo "jsreport ALL=(root) NOPASSWD: /usr/local/bin/node" >> /etc/sudoers
RUN echo "jsreport ALL=(root) NOPASSWD: /usr/local/bin/npm" >> /etc/sudoers

VOLUME ["/jsreport"]

WORKDIR /app

ADD run.sh /app/run.sh

RUN sudo npm install jsreport --production
RUN sudo node node_modules/jsreport --init

ENV NODE_ENV production

CMD ["bash", "/app/run.sh"]
