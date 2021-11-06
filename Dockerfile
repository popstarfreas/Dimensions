FROM node:16 as builder
WORKDIR /builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build && npm run package

FROM node:16-slim as production
RUN apt-get update && apt-get upgrade -y && apt-get install -y tini \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN mkdir logs
COPY --from=builder /builder/dimensions.js /app/build/dimensions.js

WORKDIR /app/build
ENTRYPOINT ["tini", "--"]
CMD ["node", "dimensions.js"]