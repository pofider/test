FROM ubuntu:latest
MAINTAINER Jan Blaha
EXPOSE 5488

RUN apt-get update && apt-get install -y sudo
RUN apt-get install -y  curl
RUN curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
RUN apt-get install -y nodejs docker.io build-essential

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY prod.config.json /usr/src/app/
COPY server.js /usr/src/app/
COPY ./data/images /usr/src/app/data/images

EXPOSE 5488
CMD [ "npm", "start", "--production" ]