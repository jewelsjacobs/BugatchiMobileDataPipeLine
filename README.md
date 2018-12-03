# BugatchiMobileDataPipeLine

This is a serverless data pipeline that:

- Runs nightly scheduled lambda to pull a headerless pipe delimited file from an external FTP drive to an S3 bucket
- Runs lambda that queries Athena view to clean up data into csv file
- Runs Data Migration Service to import csv to DynamoDB

Uses the [Serverless Framework](https://serverless.com/)
 
   with a number of plugins:
   - [serverless-pseudo-parameters](https://github.com/svdgraaf/serverless-pseudo-parameters)
   - [serverless-plugin-lambda-dead-letter](https://github.com/gmetzker/serverless-plugin-lambda-dead-letter)
   - [serverless-plugin-tracing](https://github.com/alex-murashkin/serverless-plugin-tracing)
  
   for local development:
   - [serverless-offline-scheduler](https://github.com/ajmath/serverless-offline-scheduler)
   - [serverless-offline](https://github.com/dherault/serverless-offline)
   - [serverless-s3-local](https://github.com/ar90n/serverless-s3-local)

## Setup

- Install serverless clis:

```bash
npm install -g serverless
```
- Install node modules:

```bash
npm install
```

## Run

Locally:

```bash
docker-compose up -d
sls offline start 
```

## Deploy

Development:

```bash
serverless deploy --stage dev
```

Production:

```bash
serverless deploy --stage production
```
