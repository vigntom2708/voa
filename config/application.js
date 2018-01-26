const path = require('path')
const express = require('express')
const compression = require('compression')
const helmet = require('helmet')
const session = require('express-session')
const csrf = require('csurf')
const routes = require('./router')
const createAssetsList = require('../lib/assets-list')
const log = require('../lib/logger')
const methodOverride = require('method-override')
const MongoStore = require('connect-mongo')(session)
const mongoose = require('mongoose')

function createApp ({ config }) {
  const app = express()

  app.locals.title = 'Votting Application'
  app.locals.env = config.env
  app.locals.assets = createAssetsList(config.env)

  if (config.secretKey.length < 128) {
    throw new Error('Broken secret keys')
  }

  const sessionOptions = {
    name: 'voa-session',
    secret: config.secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  }

  if (config.env === 'production') {
    app.set('trust proxy', 1)
    sessionOptions.cookie.secure = true
  }

  app.set('view engine', 'ejs')
  app.set('views', path.resolve(config.root, 'app', 'view', 'layouts'))

  app.use('/public', express.static(path.resolve(config.root, 'public')))

  app.use(helmet())
  app.use(express.urlencoded({ extended: false }))
  app.use(express.json())
  app.use(session(sessionOptions))
  app.use(csrf({ cookie: false }))
  app.use(methodOverride('_method'))

  if (config.env === 'production') {
    app.use(compression())
  }

  app.use('/', routes())

  if (config.env === 'development') {
    require('reload')(app)
  }

  app.use((req, res, next) => {
    log.warn(`404: Page(${req.url}) not found`)
    res.status(404)
    res.sendFile(path.resolve(config.root, 'public', '404.html'))
  })

  app.use((err, req, res, next) => {
    if (err.code !== 'EBADCSRFTOKEN') { return next(err) }

    log.warn(`422: Can't verify csrf token authenticity`)
    res.status(422)
    res.sendFile(path.resolve(config.root, 'public', '422.html'))
  })

  app.use((err, req, res, next) => {
    if (res.headersSend) { return next(err) }

    log.warn('500: ', err.stack)
    res.status(500)
    res.sendFile(path.resolve(config.root, 'public', '500.html'))
  })

  return app
}

module.exports = createApp
