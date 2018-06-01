const koa = require('koa')
const Router = require('koa-router')
const router = new Router()
const bodyParser = require('koa-bodyparser')
const app = new koa()

// log request URL:
app.use(async (ctx, next) => {
  console.log(`Process ${ctx.request.method} ${ctx.request.url}...`)
  await next()
})

router.get('/', (ctx, next) => {
  if (ctx.query) {
    let data = ctx.query.data
    try {
      let obj = JSON.parse(data)
      console.dir(obj.a)
    } catch (e) {
      console.dir(e)
    }
  }
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(3000)
