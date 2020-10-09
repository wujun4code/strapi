FROM strapi/base

WORKDIR /srv/app

COPY ./package.json ./
COPY ./yarn.lock ./

RUN npm config set registry http://mirrors.cloud.tencent.com/npm/
RUN yarn config set registry http://mirrors.cloud.tencent.com/npm/

RUN yarn install

COPY . .

ENV NODE_ENV production

RUN yarn run build

EXPOSE 1337

CMD ["yarn", "run start"]
