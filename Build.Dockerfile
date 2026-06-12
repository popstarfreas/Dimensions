FROM node:lts AS build
RUN apt-get update && apt-get install -y zip jq python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pnpm-lock.yaml /app
COPY package.json /app
COPY native-addon /app/native-addon
RUN corepack pnpm install
RUN mkdir /app/app
COPY app /app/app
COPY tsconfig.json /app
RUN npm run build
COPY dimensions_cli.js /app

COPY configuration/config.yaml.example /app
COPY License.md /app
COPY README.md /app
COPY makerelease.sh /app
RUN ./makerelease.sh
