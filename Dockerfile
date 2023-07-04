FROM ubuntu:18.04

WORKDIR /workspace

ENV TZ=America/Los_Angeles
ENV LANG=en_US.UTF-8
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN echo again 2021-03-30 && apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y tzdata

RUN apt-get install -y wget xz-utils vim less && \
    wget --output-document=node.tar.xz https://nodejs.org/dist/v14.16.0/node-v14.16.0-linux-x64.tar.xz && \
    tar xf node.tar.xz && \
    ln -s node*x64 nodejs

ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/workspace/nodejs/bin
RUN node /workspace/nodejs/bin/npm install -g pnpm


COPY package.json pnpm-lock.yaml  ./
RUN pnpm install

COPY tsconfig.json vite.config.ts ./

COPY client ./client
COPY client_root ./client_root
COPY server ./server
COPY shared ./shared
RUN mkdir build
COPY build/serve ./build/serve

