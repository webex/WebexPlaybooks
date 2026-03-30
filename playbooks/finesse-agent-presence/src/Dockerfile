FROM node:21.5

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node . .
USER node

CMD [ "npm", "start" ]
