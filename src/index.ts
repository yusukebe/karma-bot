import { Hono } from 'hono'
import { bodyParse } from 'hono/body-parse'

declare let KV_KARMA: KVNamespace
declare const SLACK_TOKEN: string
declare const RESPONSE_TYPE: string

const PREFIX = 'v1:karma:'

const app = new Hono()

app.post('*', bodyParse())

app.post('*', async (c) => {
  const { token, text } = c.req.parsedBody

  if (!(token == SLACK_TOKEN)) return responseUsage()
  if (!text) return responseUsage()

  const result = parse(text)
  if (!result) return responseUsage()

  const message = await karma(result.name, result.operation)

  const data = {
    text: message,
    response_type: RESPONSE_TYPE,
  }
  return c.json(data)
})

const responseUsage = () => {
  return new Response(JSON.stringify({ text: 'Usage: {name}++' }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  })
}

const parse = (text: string) => {
  text = text.trim()
  const regex = /^([0-9a-zA-Z]+)(\+\+|\-\-)/
  const result = text.match(regex)
  if (!result) return null
  const name = result[1]
  const operation = result[2]
  return { name: name, operation: operation }
}

const karma = async (name: string, operation: string) => {
  const key = PREFIX + name
  const value = await KV_KARMA.get(key)

  let karma = value != null ? parseInt(value) : 0

  if (operation == '++') {
    karma = karma + 1
  } else {
    karma = karma - 1
  }
  await KV_KARMA.put(key, `${karma}`)

  return `${name} : ${karma}`
}

app.fire()
