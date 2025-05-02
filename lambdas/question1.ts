import { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    const pathParameters  = event?.pathParameters;
    const role = pathParameters?.role ? pathParameters.role : undefined;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;
    const queryParams = event.queryStringParameters;
    const verbose = queryParams?.verbose ? (queryParams?.verbose === "true" ? true : false) : undefined

    console.log("Params: ", {role, movieId, verbose});

    if (typeof role === 'undefined' || typeof movieId === 'undefined') {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Invalid role and/or movieId" }),
      };
    }

    let commandOutput;

    if (verbose === true) {
      commandOutput = await client.send(
        new ScanCommand({
          TableName: process.env.TABLE_NAME,
          FilterExpression: "movieId = :a",
          ExpressionAttributeValues: {
            ":a": movieId,
          },
        })
      );

      console.log("GetCommand response: ", commandOutput);

      if (!commandOutput.Items) {
        return {
          statusCode: 404,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ Message: "Rows not found" }),
        };
      }
    } else {
      commandOutput = await client.send(
        new GetCommand({
          TableName: process.env.TABLE_NAME,
          Key: { movieId, role },
        })
      );

      console.log("GetCommand response: ", commandOutput);

      if (!commandOutput.Item) {
        return {
          statusCode: 404,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ Message: "Row not found" }),
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(commandOutput.Item || commandOutput.Items),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
