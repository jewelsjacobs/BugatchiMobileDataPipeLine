console.log('Loading function');
let aws = require('aws-sdk');
let athena = new aws.Athena({
  apiVersion: '2017-05-18',
  endpoint: new aws.Endpoint('https://athena.us-east-1.amazonaws.com'),
});
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
  let params = {
    QueryString: bugatchiQuery,
    ResultConfiguration: {
      OutputLocation: `s3://${process.env.ATHENA_S3_BUCKET}-${process.env.STAGE}/results`
    },
    QueryExecutionContext: {
      Database: 'products'
    }
  };
  try {
    data = await athena.startQueryExecution(params).promise();
  } catch (err) {
    console.log(err);
    return err;
  }

  return data;
};
