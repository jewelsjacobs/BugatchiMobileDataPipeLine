#!/usr/bin/env bash

CURRENT_NODE_ENV= ${NODE_ENV:-development}

if [[ "$CURRENT_NODE_ENV" = "development" ]]
  then export FILENAME='43353_3555087_150235976_cmp'
       export FTP_REMOTE_PATH='/43353/'
       export FTP_HOST='aftp.linksynergy.com'
       export FTP_PASSWORD='asdf*1234'
       export FTP_PORT='21'
       export FTP_USER='jjacobs2000'
       export S3_BUCKET='bugatchi-data-files-dev'
  else export FILENAME='43353_3555087_150235976_cmp_template.txt.gz'
       export FTP_HOST='localhost'
       export FTP_PASSWORD='password'
       export FTP_PORT='21'
       export FTP_REMOTE_PATH='/43353/'
       export FTP_USER='jjacobs2000'
       export S3_BUCKET='bugatchi-data-files'
fi
