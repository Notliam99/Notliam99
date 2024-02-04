#! /usr/bin/bash
git pull
if [ "${1}" == "" ]; then
  ./quartz/bootstrap-cli.mjs build -d ../../Main
else
  ./quartz/bootstrap-cli.mjs build -d "${1}"
fi
git add .
git commit -m "auto add notes date: [$(date)]"
git push
