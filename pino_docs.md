pino-logflare
A transport for Pino that sends messages to Logflare.

Features
Supports all Pino log levels
Automatic batching of logs
Custom payload transformation
Vercel Edge Runtime support
Error handling
TypeScript support
Note

pino-logflare v0.5.0 and above is Pino +v7 compatible and remains backwards compatible.

Installation
npm install pino pino-logflare
Usage
Pino +v7 compatible transport.

const pino = require("pino")
const transport = pino.transport({
  target: "pino-logflare",
  options: {
    apiKey: "your-api-key",
    sourceToken: "your-source-token",
    // either sourceToken or sourceName can be provided. sourceToken takes precedence.
    // sourceName: "my.source.name",
    // handle errors on the client side
    onError: { module: "my_utils", method: "handleErrors" },
    // transform events before sending
    onPreparePayload: { module: "my_utils", method: "handlePayload" },
  },
})
const logger = pino(transport)

logger.info("Hello Logflare!")
Handle Errors
Create a separate module that contains the exported function. Error information, usually an Error instance, is received as the second argument.

// my_utils.js
export const handleErrors = (events, error) => {...}
Provide the target module and method to be used for the handleErrors option.

// my_logger.js
const pino = require("pino")

const transport = pino.transport({
  target: "pino-logflare",
  options: {
    ...,
    onError: {module: "my_utils", method: "handleErrors"},
  },
})
const logger = pino(transport)
The method will be dynamically imported on the worker thread.

Transforming Events
Create a separate module that contains the exported function. Payload metadata is received as the 2nd argument.

// my_utils.js
export const handlePayload = (events, meta) => {...}
Provide the target module and method to be used for the onPreparePayload option.

// my_logger.js
const pino = require("pino")

const transport = pino.transport({
  target: "pino-logflare",
  options: {
    ...,
    onPreparePayload: {module: "my_utils", method: "handlePayload"},
  },
})
const logger = pino(transport)
The method will be dynamically imported on the worker thread.

Package Functions
The default import should be used for all pino +v7 transport usage.

createWriteStream (deprecated)
The createWriteStream function creates a writestream. This is deprecated in favour of the default import of the package which is pino +v7 compatible.

Example usage of contentWriteStream
createPinoBrowserSend
The createPinoBrowserSend function creates a writestream to send log events from the browser.

Example:

const send = createPinoBrowserSend({
  apiKey: "API_KEY",
  sourceToken: "49e4f31e-f7e9-4f42-8c1e-xxxxxxxxxx",
})
Library Configuration Options
Option	Type	Description
apiKey	Required, string	Your Logflare API key
sourceToken	Required, string	Your Logflare source token
apiBaseUrl	Optional, string	Custom API endpoint (defaults to Logflare's API)
size	Optional, number	Number of logs to batch before sending (defaults to 1)
onPreparePayload	Optional, Object	Object with a module and method to be invoked on the worker thread. The method should transform events prior to sending.
Receives the events as the first arg and the payload metadata as the second arg
onError	Optional, Object	Object with a module and method to be invoked on the worker thread. This method is invoked on errors when sending events to the given API.
Receives the events as the first arg and the error as the second arg.
batchSize	Optional, number	Number of logs to batch before sending (defaults to 100)
batchTimeout	Optional, number	Time in milliseconds to wait before sending partial batch (defaults to 1000)
debug	Optional, boolean	Turns on debug console logs on the base HTTP client.
Note: batchSize and batchTimeout options are available only for Pino +v7.

Note: onPreparePayload and onError options only accept callbacks for up to Pino v6 with legacy API. This is deprecated, please migrate to dynamic import based callbacks.

⚠️ Deprecated Options
The following options are deprecated and will be removed in a future version:

Option	Status	Migration
transforms	Deprecated	Server-side transforms are no longer supported.
endpoint	Deprecated	Use apiBaseUrl instead
fromBrowser	Deprecated	This option is no longer necessary for the HTTP Client.
CLI
# install pino-logflare globally
$ npm install -g pino-logflare

# pipe text to be logged
$ echo "this is a test" | pino-logflare --key YOUR_KEY --source YOUR_SOURCE_ID

# with custom API URL
$ echo "this is a test" | pino-logflare --key YOUR_KEY --source YOUR_SOURCE_ID --url https://custom.logflare.app
Example with node script
Given an application index.js that logs via pino, you would use pino-logflare like so:

// index.js
const logger = require("pino")()

logger.info("hello world")

const child = logger.child({ property: "value" })
child.info("hello child!")
$ node index.js | pino-logflare --key YOUR_KEY --source YOUR_SOURCE_ID
CLI Options
You can pass the following options via cli arguments or use the environment variable associated:

Short command	Full command	Environment variable	Description
-k	--key <apikey>	LOGFLARE_API_KEY	The API key that can be found in your Logflare account
-s	--source <source>	LOGFLARE_SOURCE_TOKEN	Default source for the logs
-u	--url <url>	LOGFLARE_URL	Custom Logflare API URL (optional)
Vercel
To use pino-logflare in your Vercel project you have to configure:

Logflare Vercel integration that will handle serverless functions log events
Pino browser send function to handle log events from the browser client
Example:

import pino from "pino"
import { logflarePinoVercel } from "pino-logflare"

// create pino-logflare console stream for serverless functions and send function for browser logs
const { stream, send } = logflarePinoVercel({
  apiKey: "YOUR_KEY",
  sourceToken: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXX",
})

// create pino logger
const logger = pino(
  {
    browser: {
      transmit: {
        level: "info",
        send: send,
      },
    },
    level: "debug",
    base: {
      env: process.env.VERCEL_ENV,
      revision: process.env.VERCEL_GITHUB_COMMIT_SHA,
    },
  },
  stream,
)
Development
Setup
npm i
npm run build
npm test
npm run test.watch

# e2e tests
npm run start:api
npm run test:e2e
License
MIT