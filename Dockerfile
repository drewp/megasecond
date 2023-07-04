FROM ubuntu:23.04

WORKDIR /workspace

ENV TZ=America/Los_Angeles
ENV LANG=en_US.UTF-8
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

ENV KEYRING=/usr/share/keyrings/nodesource.gpg
ENV VERSION=node_18.x
ENV DISTRO=lunar
RUN \
    apt-get update && \
    apt-get install -y --no-install-recommends curl gpg ca-certificates && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | gpg --dearmor > "$KEYRING" && \
    echo "deb [signed-by=$KEYRING] https://deb.nodesource.com/$VERSION $DISTRO main" | tee /etc/apt/sources.list.d/nodesource.list && \
    echo "deb-src [signed-by=$KEYRING] https://deb.nodesource.com/$VERSION $DISTRO main" | tee -a /etc/apt/sources.list.d/nodesource.list
RUN \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      bind9-dnsutils \
      build-essential \
      libpython3.11-dev \
      nodejs \
      pipenv \
      python3.11 \
      tzdata \
      vim \
      vim-tiny \
      wget \
      xz-utils \
      zsh

RUN npm install --global pnpm@8.6.3

COPY package.json pnpm-lock.yaml  ./
RUN pnpm install

COPY tsconfig.json vite.config.ts ./

COPY client ./client
COPY client_root ./client_root
COPY server ./server
COPY shared ./shared
RUN mkdir build
COPY build/serve ./build/serve

