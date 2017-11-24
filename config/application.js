const path = require('path')
const express = require('express')
const createDbConnection = require('../lib/db')
const router = require('./router')
const compression = require('compression')
const bodyParser = require('body-parser')
const helmet = require('helmet')
const validator = require('express-validator')

function createApp ({ config, log }) {
  const app = express()

  createDbConnection(log)

  app.set('view engine', 'ejs')
  app.set('views', path.resolve(config.root, 'app', 'view', 'layouts'))

  app.use('/public', express.static(path.resolve(config.root, 'public')))

  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(validator())
  app.use(helmet())

  if (config.env === 'production') {
    app.use(compression())
  }

  app.use('/', router(config, log))

  if (config.env === 'development') {
    require('reload')(app)
  }

  app.use((req, res, next) => {
    log.warn(`404: Page(${req.url}) not found`)
    res.status(404)
    res.sendFile(path.resolve(config.root, 'public', '404.html'))
  })

  app.use((err, req, res, next) => {
    if (res.headersSend) { return next(err) }

    log.warn(`500: ${err.stack}`)
    res.status(500)
    res.sendFile(path.resolve(config.root, 'public', '500.html'))
  })

  return app
}

module.exports = createApp
