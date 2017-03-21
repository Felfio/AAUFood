FROM node:6.9.5

WORKDIR /usr/src/app

RUN npm install
RUN bash -l -c 'npm run build'

EXPOSE 3000

CMD [ "node", "index.js" ]
