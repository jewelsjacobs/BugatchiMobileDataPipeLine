console.log('Loading function');
const aws = require('aws-sdk');
const awsXRay = require('aws-xray-sdk-core');
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
let manufacturersQuery = `CREATE EXTERNAL TABLE \`manufacturers\`(
       \`product_id\` string COMMENT 'from deserializer',
       \`name\` string COMMENT 'from deserializer',
       \`sku_number\` string COMMENT 'from deserializer',
       \`primary_category\` string COMMENT 'from deserializer',
       \`secondary_category\` string COMMENT 'from deserializer',
       \`product_url\` string COMMENT 'from deserializer',
       \`productimage_url\` string COMMENT 'from deserializer',
       \`buy_url\` string COMMENT 'from deserializer',
       \`short_description\` string COMMENT 'from deserializer',
       \`long_description\` string COMMENT 'from deserializer',
       \`discount\` string COMMENT 'from deserializer',
       \`discount_type\` string COMMENT 'from deserializer',
       \`sale_price\` string COMMENT 'from deserializer',
       \`retail_price\` string COMMENT 'from deserializer',
       \`begin_date\` string COMMENT 'from deserializer',
       \`blank1\` string COMMENT 'from deserializer',
       \`manufacturer\` string COMMENT 'from deserializer',
       \`blank2\` string COMMENT 'from deserializer',
       \`blank3\` string COMMENT 'from deserializer',
       \`manufacturer_part_number\` string COMMENT 'from deserializer',
       \`brand\` string COMMENT 'from deserializer',
       \`shipping_information\` string COMMENT 'from deserializer',
       \`shipping_availability\` string COMMENT 'from deserializer',
       \`upc\` string COMMENT 'from deserializer',
       \`blank4\` string COMMENT 'from deserializer',
       \`currency\` string COMMENT 'from deserializer',
       \`blank5\` string COMMENT 'from deserializer',
       \`pixel\` string COMMENT 'from deserializer')
       ROW FORMAT SERDE
       'org.apache.hadoop.hive.serde2.OpenCSVSerde'
       WITH SERDEPROPERTIES (
            'separatorChar'='|')
            STORED AS INPUTFORMAT
            'org.apache.hadoop.mapred.TextInputFormat'
            OUTPUTFORMAT
            'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
            LOCATION
            's3://${process.env.FTP_S3_BUCKET}-${process.env.STAGE}/'
            TBLPROPERTIES (
            'classification'='csv')`;

let deleteQuery = `DROP TABLE IF EXISTS manufacturers;`;

exports.handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  console.log('remaining time =', context.getRemainingTimeInMillis());
  const AthenaParams = {
    QueryString: manufacturersQuery,
    ResultConfiguration: {
      OutputLocation: `s3://${process.env.ATHENA_S3_BUCKET}-${process.env.STAGE}/results/`
    },
    QueryExecutionContext: {
      Database: 'products'
    }
  };
  const DeleteQueryString = {
    QueryString: deleteQuery
  };
  const DeleteParams = {...AthenaParams, ...DeleteQueryString};
  try {
    await athena.startQueryExecution(DeleteParams).promise();
    data = await athena.startQueryExecution(AthenaParams).promise();
    const params = {
      Message: data.QueryExecutionId,
      TopicArn: `arn:aws:sns:us-east-1:${process.env.AWS_ACCOUNT_ID}:transformQueryId`,
      Subject: "Transform Query ID"
    };
    await sns.publish(params).promise();
  } catch (err) {
    console.log(err);
    return err;
  }

  return data;
};
