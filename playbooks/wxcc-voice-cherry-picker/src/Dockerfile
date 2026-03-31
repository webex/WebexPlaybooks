FROM node:21.5

# docker build --build-arg HOST_URI="https://your-server.com" -t wxcc-voice-cherry-picker .
# docker run -p 5000:5000 wxcc-voice-cherry-picker

ARG PORT=5000
ARG HOST_URI

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# Write a .env from build args so dotenv-webpack can inject HOST_URI at build time
RUN printf "PORT=%s\nHOST_URI=%s\n" "${PORT}" "${HOST_URI}" > .env

RUN npm run build

ENV PORT=${PORT}

CMD [ "npm", "start" ]
