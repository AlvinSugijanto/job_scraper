FROM node:current-alpine3.22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_OPTIONS=--max-old-space-size=8192

RUN npm run build

EXPOSE 80

CMD ["npm", "start"]
