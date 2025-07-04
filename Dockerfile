FROM node:20-alpine

ARG DATABASE_URL

WORKDIR /usr/src/app

COPY packages ./packages
COPY apps/client ./apps/client
COPY apps/server ./apps/server
COPY package.json .
COPY package-lock.json .
COPY turbo.json .

RUN npm install

RUN cd packages/db && DATABASE_URL=$DATABASE_URL npx prisma generate

WORKDIR /usr/src/app/

EXPOSE 3000 3001

RUN npm run build 

CMD ["npm", "run", "dev"]


