console.log('Loading function');
const aws = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
let athena = new aws.Athena({
  apiVersion: '2017-05-18',
  endpoint: new aws.Endpoint('https://athena.us-east-1.amazonaws.com'),
});

let snsConfig = {
  region: process.env.REGION
};

if (process.env.STAGE === 'local') {
  snsConfig = {
    ...snsConfig,
    endpoint: "http://127.0.0.1:4002",
  }
}

const sns = new aws.SNS(snsConfig);

let data;
let categoriesQuery = `CREATE OR REPLACE VIEW categories AS 
SELECT
  IF(("subcategory" IS NULL), "category", "subcategory") "subcategory"
, "category"
FROM
  bugatchi
GROUP BY "category", "subcategory"
ORDER BY "category" ASC`;

exports.handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  console.log('remaining time =', context.getRemainingTimeInMillis());
  let AthenaParams = {
    QueryString: categoriesQuery,
    ResultConfiguration: {
      OutputLocation: `s3://${process.env.ATHENA_S3_BUCKET}-${process.env.STAGE}/results/`
    },
    QueryExecutionContext: {
      Database: 'products'
    }
  };
  try {
    data = await athena.startQueryExecution(AthenaParams).promise();
    const params = {
      Message: data.QueryExecutionId,
      TopicArn: `arn:aws:sns:us-east-1:${process.env.AWS_ACCOUNT_ID}:categoriesQueryId`,
      Subject: "Categories Query ID"
    };
    await sns.publish(params).promise();
  } catch (err) {
    console.log(err);
    return err;
  }

  return data;
};
