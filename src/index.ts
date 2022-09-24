import { Context, Hono } from 'hono'
import { validator } from 'hono/validator'

const PREFIX = 'v1:karma:'

type Bindings = {
  KV_KARMA: KVNamespace
  SLACK_TOKEN: string
  RESPONSE_TYPE: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.post(
  '*',
  validator(
    (v, c) => ({
      token: v.body('token').isEqual(c.env.SLACK_TOKEN),
      text: v.body('text').isRequired(),
    }),
    {
      done: (result, c) => {
        if (result.hasError) {
          console.log(result.messages)
          return responseUsage(c)
        }
      },
    },
  ),
  async (c) => {
    const res = c.req.valid()

    const result = parse(res.text)
    if (!result) return responseUsage(c)

    const message = await karma(c.env.KV_KARMA, result.name, result.operation)

    const data = {
      text: message,
      response_type: c.env.RESPONSE_TYPE,
    }
    return c.json(data)
  },
)

const karma = async (kv: KVNamespace, name: string, operation: string) => {
  const key = PREFIX + name
  const value = await kv.get(key)

  let karma = value != null ? parseInt(value) : 0

  if (operation == '++') {
    karma = karma + 1
  } else {
    karma = karma - 1
  }
  await kv.put(key, `${karma}`)

  return `${name} : ${karma}`
}

const responseUsage = (c: Context) => {
  return c.json({ text: 'Usage: {name}++' })
}

const parse = (text: string) => {
  const regex = /^([0-9a-zA-Z]+)(\+\+|\-\-)/
  const result = text.trim().match(regex)
  if (!result) return null
  const name = result[1]
  const operation = result[2]
  return { name, operation }
}

export default app
