FROM oven/bun:1-alpine

WORKDIR /app

# Спершу лише маніфести — шар із залежностями кешується між збірками.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

# --bun: next dev виконує рантайм bun, а не node-шим з образу.
CMD ["bun", "--bun", "run", "dev"]
