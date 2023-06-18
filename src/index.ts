import express, { Express, Request, Response } from 'express'
import dotenv from 'dotenv'
import bodyParser from "body-parser"
import { v4 as uuid } from 'uuid';
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
import * as path from 'path'
import DynamoDB, { QueryInput } from 'aws-sdk/clients/dynamodb'

dotenv.config()

const port = process.env.PORT
const dynamoEnpoint = process.env.DYNAMO_ENDPOINT
const region = process.env.DYNAMO_REGION
const apiVersion = process.env.API_VERSOION
const accessKeyID = process.env.ACCESS_KEY_ID
const secretKey = process.env.SECRET_KEY

const user = {
	admin: {
		firstName: "john",
		lastName: "doe"
	}
}

// const nav_bar = [
// 	"Home", "Deadman",
// ]

const nav_bar = {
	"Threshold": "/" , 
	"Deadman": "deadman/",
}

const table_head_thresold = [
	"check_id", "noti_id", "mac_address", "message", "type", "timestamp"
]

const table_head_deadman = [
	"alert_id", "message", "check_name", "_time"
]

const dynamoClient: DynamoDB = new DynamoDB({
	endpoint: dynamoEnpoint,
	region: region,
	apiVersion: apiVersion,
	accessKeyId: accessKeyID,
	secretAccessKey: secretKey
});

const app: Express = express()

console.log(path.join(__dirname, 'public'))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use('/public', express.static(path.join(__dirname, 'public')));
app.engine('ejs', require('ejs').renderFile);
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs');

let dataSerialize = (obj: any) => {
	const kayDB = ["_check_id", "_notification_rule_id", "mac_address", "_message", "_type", "_status_timestamp"]
	const keyRender: { [Key in string]: string } = {
		"_check_id": "check_id",
		"_notification_rule_id": "noti_id",
		"mac_address": "mac_address",
		"_message": "message",
		"_type": "type",
		"_status_timestamp": "timestamp"
	}
	const data: { [Key in string]: any } = {}
	for (const key in obj) {
		if (kayDB.includes(key))
			data[keyRender[key]] = obj[key]
	}
	return data
}

app.get('/', async (req: Request, res: Response) => {
	console.log(`index api is called`)
	const params: QueryInput = {
		TableName: "alert_log",
		ProjectionExpression: "#checkID, #notiID, #macAddress, #typeCheck, #timeStamp, #message",
		ExpressionAttributeNames: {
			"#checkID": "_check_id",
			"#notiID": "_notification_rule_id",
			"#macAddress": "mac_address",
			"#typeCheck": "_type",
			"#timeStamp": "_status_timestamp",
			"#message": "_message"
		},
		FilterExpression: "#typeCheck = :typeCheck",
		ExpressionAttributeValues: { ":typeCheck": { "S": "threshold" } },
		Limit: 100,
	};
	let items: any = [];
	try {
		console.log(`Trying to scan table`)
		await dynamoClient.scan(params, (err, data) => {
			if (err) {
				console.log(`dynamo error: ${err}`)
			} else {
				console.log(`last evaluate key: ${data.LastEvaluatedKey}`)
				for (let item in data.Items) {
					items.push(dataSerialize(unmarshall(data.Items[parseInt(item)])))
				}
			}
		}).promise()
	} catch (err) {
		console.log("Failure", err)
	}
	res.render("index", {
		user: user,
		nav_bar: nav_bar,
		table_head: table_head_thresold,
		table_row: items,
	})

});

app.get('/deadman/', async (req: Request, res: Response) => {
	const params: QueryInput = {
		TableName: "alert_log",
		ProjectionExpression: "#alertID, #typeCheck, #timeStamp, #message",
		ExpressionAttributeNames: {
			"#alertID": "alert_id",
			"#typeCheck": "check_name",
			"#timeStamp": "_time",
			"#message": "message"
		},
		FilterExpression: "#typeCheck = :typeCheck",
		ExpressionAttributeValues: { ":typeCheck": { "S": "Deadman" } },
		Limit: 100,
	};
	let items: any = [];
	try {
		console.log(`Trying to scan table`)
		await dynamoClient.scan(params, (err, data) => {
			if (err) {
				console.log(`dynamo error: ${err}`)
			} else {
				console.log(`last evaluate key: ${data.LastEvaluatedKey}`)
				for (let item in data.Items) {
					// TODO: create function convert key map render table
					items.push(unmarshall(data.Items[parseInt(item)]))
				}
			}
		}).promise()
	} catch (err) {
		console.log("Failure", err)
	}
	res.render("index", {
		user: user,
		nav_bar: nav_bar,
		table_head: table_head_deadman,
		table_row: items,
	})

});

app.post('/webhook/', (req: Request, res: Response) => {
	console.log(`Web hook API: incoming`)
	console.log(req.body)
	let body = {}
	if (req.body._measurement == "notifications") {
		let { _source_timestamp, _status_timestamp } = req.body
		console.log(`${_source_timestamp / 1000}, ${_status_timestamp / 1000}`, typeof (_source_timestamp), typeof (_status_timestamp))

		body = { ...req.body, ...{ "_source_timestamp": _source_timestamp / 1000, "_status_timestamp": _status_timestamp / 1000 } }
	}
	else body = req.body
	const params = {
		TableName: "alert_log",
		Item: marshall({ 'alert_id': uuid(), ...body } || {}),
	};
	dynamoClient.putItem(params, (err, data) => {
		if (err) {
			console.log("Error", err);
		} else {
			console.log("Table Created", data);
		}
	})
	res.send('Express + TypeScript Server')
});

app.get("/alerts/all/", async (req: Request, res: Response) => {
	var params = {
		TableName: "alert_log"
	};

	dynamoClient.scan(params, (err, data) => {
		if (err) {
			console.log(`dynamo error: ${err}`);
		} else {
			var items: any = [];
			let i = 0
			for (let item in data.Items) {
				if (i < 1)
					items.push(unmarshall(data.Items[parseInt(item)]));
				else break
				i++
			}

			// res.type('application/json');
			// res.send(items);
			res.type('application/json');
			res.send(items);
		}
	});
})

app.get("/alerts/list/", async (req: Request, res: Response) => {
	var params = {
		TableName: "alert_log"
	};

	dynamoClient.scan(params, (err, data) => {
		if (err) {
			console.log(`dynamo error: ${err}`);
		} else {
			var items: any = [];
			let i = 0
			for (let item in data.Items) {
				if (i < 1)
					items.push(unmarshall(data.Items[parseInt(item)]));
				else break
				i++
			}
			res.type('application/json');
			res.send(items);
		}
	});
})

app.post('/create_alert_table/', (req: Request, res: Response) => {
	console.log(`create table is called`)
	var params = {
		AttributeDefinitions: [
			{
				AttributeName: 'alert_id',
				AttributeType: 'S'
			},
		],
		KeySchema: [
			{
				AttributeName: 'alert_id',
				KeyType: 'HASH'
			},
		],
		ProvisionedThroughput: {
			ReadCapacityUnits: 1,
			WriteCapacityUnits: 1
		},
		TableName: 'alert_log',
		StreamSpecification: {
			StreamEnabled: false
		}
	};

	// Call DynamoDB to create the table
	dynamoClient.createTable(params, (err, data) => {
		res.type('application/plain_text');
		if (err) {
			console.log("Error", err);
			return res.send(`create table faild: ${err}`)
		} else {
			console.log("Table Created", data);
			return res.send(`create table success: ${data}`)
		}
	});
})

app.get("/alert/:id/", async (req: Request, res: Response) => {
	var params = {
		Key: {
			"CUSTOMER_ID": {
				"N": req.params.id
			}
		},
		TableName: "alert_log"
	};

	// dynamoClient.scan(params, (err, data) => {
	//     if (err) {
	//         console.log(`dynamo error: ${err}`);
	//     } else {
	//         var items: any = [];
	//         for (var i in data.Items)
	//             items.push(data.Items[i]['id']);
	//             console.log(i)
	//         res.type('application/json');
	//         res.send(items);
	//     }
	// });
	dynamoClient.getItem(params, (err, data) => {
		if (err) console.log(err, err.stack); // an error occurred
		else console.log(data);
	});
})

app.listen(port, () => {
	console.log(`⚡️[server]: Server is running at http://localhost:${port}`)
})