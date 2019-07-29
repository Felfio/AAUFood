#!/bin/sh

echo ${FOODDEV}

if [ -z "$FOODDEV" ]; then
    node app/index.js
else
    node_modules/.bin/nodemon app/index.js
fi
