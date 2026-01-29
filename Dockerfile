FROM node:lts AS build
WORKDIR /app
COPY pnpm-lock.yaml /app
COPY package.json /app
RUN corepack pnpm install
COPY rescript.json /app
RUN mkdir /app/app
COPY app /app/app
COPY tsconfig.json /app
RUN npm run build

COPY dimensions_cli.js /app

FROM node:lts-slim

WORKDIR /app
RUN mkdir /app/logs

WORKDIR /app/build
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
COPY --from=build /app/dimensions_cli.js /app/dimensions_cli.js
RUN mkdir -p /app/build/node_modules && ln -s /app/build/dimensions /app/build/node_modules/dimensions
COPY shim.json /app/build/node_modules/dimensions/package.json

CMD ["node", "index.js"]
