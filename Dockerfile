FROM marketplace.gcr.io/google/ubuntu1804

WORKDIR /workspace

RUN apt-get update
RUN apt-get install -y wget xz-utils && \
    wget --output-document=node.tar.xz https://nodejs.org/dist/v14.15.3/node-v14.15.3-linux-x64.tar.xz && \
    tar xf node.tar.xz && \
    ln -s node*x64 nodejs

ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/workspace/nodejs/bin
RUN node /workspace/nodejs/bin/npm install -g pnpm

COPY package.json pnpm-lock.yaml  ./
RUN pnpm install

COPY rollup.config.js tsconfig.json ./
COPY src ./src

CMD ["pnpx", "rollup", "--watch", "-c"]

