#!/bin/sh

echo ${FOODDEV}

if [ -z "$FOODDEV" ]; then
    node app/index.js
else
    npm run build
    node_modules/.bin/nodemon app/index.js
fi
