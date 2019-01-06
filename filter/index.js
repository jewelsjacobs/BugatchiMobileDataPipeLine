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
let bugatchiQuery = `CREATE OR REPLACE VIEW bugatchi AS SELECT "product_id" ,
         "begin_date" ,
         "manufacturer_part_number" ,
         "name" ,
         "pixel" ,
         "product_url" ,
         "productimage_url" ,
         "retail_price" ,
         "sale_price" ,
         "short_description" as "description",
         "sku_number" ,
         "upc" ,
         split_part("secondary_category", '~~', 1) AS "category" , 
         split_part("secondary_category", '~~', 2) AS "subcategory" , 
         replace("shipping_information", ':', ' ') AS "shipping_info",
         Coalesce(
         try(date_parse("begin_date", '%Y-%m-%d %H:%i:%s')),
         try(date_parse("begin_date", '%Y-%m-%d')),
         try(CAST("begin_date" AS timestamp))
       )  as "date_timestamp"
FROM products.manufacturers
WHERE "product_id" <> 'HDR'
        AND "manufacturer" = 'Bugatchi'
        AND "shipping_availability" = 'in-stock'
        AND "currency" = 'USD'
        AND "discount_type" = 'amount'
        AND "primary_category" = 'Apparel & Accessories'
        AND "shipping_availability" = 'in-stock'`;

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
