FROM node:24.3.0-alpine

HEALTHCHECK \
	--interval=60s \
	--timeout=5s \
	--start-period=15s \
	--start-interval=5s \
	--retries=3 \
	CMD [ "wget", "--spider", "http://127.0.0.1:3000/api/healthcheck" ]

WORKDIR /app
COPY package.json /app/
COPY .env .env.local /app/

ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"

COPY build/ /app/build/

CMD node --env-file=.env --env-file-if-exists=.env.local ./build/migrate.js up ; node --env-file=.env --env-file-if-exists=.env.local ./build/index.js
