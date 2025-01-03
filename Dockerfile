FROM node:23.5.0-alpine

WORKDIR /app
COPY package.json /app/
COPY build/ /app/build/
COPY .env .env.local /app/

ENV NODE_ENV=production
CMD [ "node", "--run", "start:prod" ]
