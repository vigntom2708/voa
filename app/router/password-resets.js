const express = require('express')
const validator = require('validator')
const User = require('../models/user')
const template = require('../view/password-resets')
const { logIn } = require('../view/helpers/session')
const { path } = require('../view/helpers')
const log = require('../../lib/logger')
const mailer = require('../../lib/mailer')
const routing = require('../../lib/routing')
const voaView = require('../../lib/view')

const data = {
  new: { title: 'Forgot password' },
  edit: { title: 'Reset password' }
}

const view = voaView.bind(template, data)

function pipe (...fs) {
  return x => {
    let nextArg = x

    for (let i = 0; i < fs.length; i++) {
      nextArg = fs[i](nextArg)
      if (!nextArg) { return nextArg }
    }

    return nextArg
  }
}

function checkExpiration (user) {
  return ({ req, res }) => {
    if (isExpired(user)) { return redirectWhenExpired({ req, res }) }
    return { req, res }
  }
}

function isExpired (user) {
  const twoHour = 7200000
  if (Date.now() - user.resetCreatedAt > twoHour) {
    return true
  }
  return false
}

function redirectWhenExpired ({ req, res }) {
  req.session.flash = { danger: 'Password reset has expired.' }
  return res.redirect('/passwordResets/new')
}

function renderEdit (user, token) {
  return ({ req, res }) => {
    res.locals.user = user
    res.locals.token = token
    return res.render('application', view.edit(res.locals))
  }
}

function invalidReset (msg, res) {
  if (msg) { log.warn(msg) }
  return res.redirect('/')
}

const actions = {
  create (req, res, next) {
    const email = req.body.email.toString()

    if (!validator.isEmail(email)) {
      return emailNotFound('Email Validation error')
    }

    function emailNotFound (msg) {
      if (msg) { log.warn(msg) }
      res.locals.email = email
      res.locals.errors = {
        email: { message: 'Wrong email', type: 'danger' }
      }

      return res.render('application', view.new(res.locals))
    }

    return User.findOne({ email }, (err, user) => {
      if (err) { return next(err) }
      if (!user) { return emailNotFound() }

      return User.createResetDigest(user, (err, userTo) => {
        if (err) { return next(err) }

        mailer.passwordReset(userTo, (err, info) => {
          if (err) { return next(err) }
        })

        req.session.flash = { info: 'Email sent with password reset instructions' }
        return res.redirect('/')
      })
    })
  },

  edit (req, res, next) {
    const email = req.query.email.toString()
    const token = req.params.token.toString()
    const authenticate = User.authenticateBy('reset')

    if (!validator.isEmail(email)) { return invalidReset() }

    return authenticate(email, token, (err, user) => {
      if (err) { return next(err) }
      if (!user) { return invalidReset('User not found.', res) }
      if (!user.activated) { return invalidReset('User not activated.', res) }

      return pipe(checkExpiration(user), renderEdit(user, token))({ req, res })
    })
  },

  update (req, res, next) {
    const token = req.params.token.toString()
    const email = req.body.email.toString()
    const password = req.body.password.toString()
    const confirmation = req.body.passwordConfirmation.toString()
    const authenticate = User.authenticateBy('reset')

    if (!validator.isEmail(email)) { return invalidReset() }

    function invalidReset (msg) {
      if (msg) { log.warn(msg) }
      return res.redirect('/')
    }

    return authenticate(email, token, (err, user) => {
      if (err) { return next(err) }
      if (!user) { return invalidReset('User not found.') }
      if (!user.activated) { return invalidReset('User not activated.') }
      if (isExpired(user)) { return redirectWhenExpired({ req, res }) }

      user.set({ password, passwordConfirmation: confirmation, resetDigest: '' })

      res.locals.user = user

      return user.save((err, who) => {
        if (err && err.errors) {
          res.locals.errors = err.errors
          res.locals.token = token
          return res.render('application', view.edit(res.locals))
        }

        if (err) { return next(err) }

        return logIn(req, user, err => {
          if (err) { return next(err) }
          req.session.flash = { success: 'Password has been changed.' }
          return res.redirect(path({ author: user.username }))
        })
      })
    })
  }
}

module.exports = (function createRouter () {
  const to = routing.create(actions, view)
  const router = express.Router()

  router.get('/new', to('new'))
  router.get('/:token/edit', to('edit'))

  router.post('/', to('create'))
  router.patch('/:token', to('update'))

  return { to, router }
}())
