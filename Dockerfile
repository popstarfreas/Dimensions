FROM node:lts-bullseye as build
WORKDIR /app
COPY yarn.lock /app
COPY package.json /app
RUN yarn install
COPY rescript.json /app
RUN mkdir /app/app
# This is used to make sure that all rescript-based deps
# have the right js extension
RUN npm run fixrescript
COPY app /app/app
COPY tsconfig.json /app
RUN npm run build

COPY dimensions_cli.js /app

FROM node:lts-bullseye-slim

WORKDIR /app
RUN mkdir /app/logs

WORKDIR /app/build
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
COPY --from=build /app/dimensions_cli.js /app/dimensions_cli.js

CMD ["node", "index.js"]
