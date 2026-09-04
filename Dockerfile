FROM mcr.microsoft.com/playwright:v1.62.1-noble AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM mcr.microsoft.com/playwright:v1.62.1-noble
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 8790
CMD ["node", "dist/cli.js", "serve"]
