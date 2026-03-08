# syntax = docker/dockerfile:1

# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.3.5
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL fly_launch_runtime="Bun"

# Bun app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

# Copy application code first
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN bun install
RUN bun run build

# Clean up and install dependencies
WORKDIR /app
RUN rm -rf /app/frontend
RUN bun install

# Patch @ai-sdk/openai: force systemMessageMode to "system" for non-OpenAI providers
# The SDK defaults to "developer" role for unknown model IDs, which DeepSeek doesn't support
RUN sed -i 's/const systemMessageMode = isReasoningModel ? "developer" : "system"/const systemMessageMode = "system"/' \
    /app/node_modules/@ai-sdk/openai/dist/index.mjs

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "bun", "index.ts" ]
