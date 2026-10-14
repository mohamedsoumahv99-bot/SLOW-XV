FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential ffmpeg imagemagick python3 webp \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

EXPOSE 10000

COPY . .

CMD ["npm", "start"]
