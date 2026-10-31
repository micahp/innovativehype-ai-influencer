FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY package*.json ./
COPY --from=builder /app/prisma ./prisma
RUN npm ci --omit=dev
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/data ./data
COPY --from=builder /app/research ./research
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/tsconfig.json ./tsconfig.json
EXPOSE 3000
CMD ["node", "server.js"]
