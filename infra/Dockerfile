# One image for the gate, the proefapp and the migration job; compose picks the command.
FROM node:22-slim
ENV NODE_ENV=production
RUN corepack enable
WORKDIR /srv
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/poort/package.json apps/poort/
COPY apps/proefapp/package.json apps/proefapp/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile --prod
COPY apps apps
COPY packages packages
USER node
