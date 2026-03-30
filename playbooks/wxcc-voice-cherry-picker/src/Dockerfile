FROM node:21.5

# docker build -t wxcc-voice-cherry-picker .
# docker run -p 5000:5000 -i -t wxcc-voice-cherry-picker

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# Rename env.template to .env and fill in values before building.
# The .env file is required at build time so that dotenv-webpack can inject
# HOST_URI into the frontend bundle during `npm run build`.
COPY .env .env

RUN npm run build

CMD [ "npm", "start" ]
