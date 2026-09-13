FROM oven/bun:1-alpine

WORKDIR /app

# * Manifests first — the dependency layer is cached between builds.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

# * --bun: next dev runs on the bun runtime, not the image's node shim.
CMD ["bun", "--bun", "run", "dev"]
