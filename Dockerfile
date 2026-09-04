FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 8790
CMD ["npx", "tsx", "src/cli.ts", "serve"]
