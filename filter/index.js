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
let bugatchiQuery = `CREATE OR REPLACE VIEW bugatchi AS
SELECT
  "product_id"
    , "begin_date"
    , "currency"
    , "discount_type"
    , "long_description"
    , "manufacturer"
    , "manufacturer_part_number"
    , "name"
    , "pixel"
    , "primary_category"
    , "product_url"
    , "productimage_url"
    , "retail_price"
    , "sale_price"
    , "secondary_category"
    , "shipping_availability"
    , "shipping_information"
    , "short_description"
    , "sku_number"
    , "upc"
FROM
  products.manufacturers
WHERE (("product_id" <> 'HDR') AND ("manufacturer" = 'Bugatchi'))`;

exports.handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  console.log('remaining time =', context.getRemainingTimeInMillis());
  let AthenaParams = {
    QueryString: bugatchiQuery,
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
      TopicArn: `arn:aws:sns:us-east-1:${process.env.AWS_ACCOUNT_ID}:filterQueryId`,
      Subject: "Filter Query ID"
    };
    await sns.publish(params).promise();
  } catch (err) {
    console.log(err);
    return err;
  }

  return data;
};
