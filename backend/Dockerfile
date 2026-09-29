FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# Production Runner Image
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 4000
EXPOSE 25

# Push schema to database and start server
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
