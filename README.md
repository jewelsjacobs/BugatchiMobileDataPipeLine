# BugatchiMobileDataPipeLine

This is a serverless data pipeline that:

- Runs nightly scheduled lambda to pull a headerless pipe delimited file from an external FTP drive to an S3 bucket
- Runs lambdas that run Athena queries to clean up data into csv file
- Runs lambda to import csv to DynamoDB

IMPORTANT - this won't work unless the Athena Settings have the s3 bucket defined as: `s3:\\bugatchi-athena-dev\results`. I'd like to somehow make this dynamic but I haven't figured out how.

Uses the [Serverless Framework](https://serverless.com/)
 
   with a number of plugins:
   - [serverless-pseudo-parameters](https://github.com/svdgraaf/serverless-pseudo-parameters)
   - [serverless-plugin-lambda-dead-letter](https://github.com/gmetzker/serverless-plugin-lambda-dead-letter)
   - [serverless-plugin-tracing](https://github.com/alex-murashkin/serverless-plugin-tracing)
   - [serverless-plugin-existing-s3](https://github.com/matt-filion/serverless-external-s3-event)
   - [serverless-s3-remover](https://github.com/sinofseven/serverless-s3-remover)
  
   for local development:
   - [serverless-dynamodb-local](https://github.com/99xt/serverless-dynamodb-local)
   - [serverless-offline-scheduler](https://github.com/ajmath/serverless-offline-scheduler)
   - [serverless-offline](https://github.com/dherault/serverless-offline)
   - [serverless-s3-local](https://github.com/ar90n/serverless-s3-local)
   - [serverless-offline-sns](https://github.com/mj1618/serverless-offline-sns)
   
**Includes lambda layer for upgrading to node v11.7.0.**
- See https://github.com/lambci/node-custom-lambda for custom runtime arns and https://serverless.com/framework/docs/providers/aws/guide/layers/ on using layers in the serverless framework.

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
serverless s3deploy --stage dev
```

Production:

IMPORTANT - this won't work unless the Athena Settings have the s3 bucket defined as: `s3:\\bugatchi-athena-production\results`. I'd like to somehow make this dynamic but I haven't figured out how.

```bash
serverless deploy --stage production
serverless s3deploy --stage production

```
