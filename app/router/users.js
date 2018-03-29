const express = require('express')
const R = require('ramda')
const validator = require('validator')
const paginate = require('express-paginate')
const User = require('../models/user')
const { createView } = require('../helpers/application-helper')
const usersView = require('../assets/javascript/users')
const routing = require('../../lib/routing')
const mailer = require('../../lib/mailer')

const renderer = res => page => res.render('application', page)

function userParams (params) {
  const fields = ['username', 'email', 'password', 'passwordConfirmation']
  const pickOrBlank = R.compose(
    R.pick(fields),
    R.merge(R.__, params),
    R.mergeAll,
    R.map(x => ({ [x]: '' }))
  )

  return pickOrBlank(fields)
}

const view = {
  index (options) {
    const page = usersView.index(options)
    return createView({ title: 'Users', options, page })
  },

  show (options) {
    const page = usersView.show(options)
    return createView({ title: 'Show Users', options, page })
  },

  new (options) {
    const page = usersView.new(options)
    return createView({ title: 'Signup', options, page })
  },

  edit (options) {
    const page = usersView.edit(options)
    return createView({ title: 'Edit User', options, page })
  }
}

const actions = {
  index (req, res, next) {
    if (!req.session.user) {
      req.session.flash = { danger: 'Please log in' }
      return res.redirect('/login')
    }

    return User.count()
      .then(userCount => {
        if (req.skip >= userCount) {
          req.skip = req.skip - req.query.limit
          res.locals.paginate.page = res.locals.paginate.page - 1
        }

        return Promise.all([
          User.find().limit(req.query.limit).skip(req.skip).lean(),
          userCount
        ])
      })
      .then(([users, userCount]) => {
        const pageCount = Math.ceil(userCount / req.query.limit)

        res.locals.users = users
        res.locals.pageCount = pageCount
        res.locals.userCount = userCount
        res.locals.pages = paginate.getArrayPages(req)(7, pageCount, req.query.page)

        req.session.state = { users: req.originalUrl }

        renderer(res)(view.index(res.locals))
      })
      .catch(next)
  },

  show (req, res, next) {
    const id = req.params.id

    if (!validator.isMongoId(id)) { return next('route') }

    return User.findById(id)
      .then(user => {
        res.locals.user = user
        renderer(res)(view.show(res.locals))
      })
      .catch(next)
  },

  new (req, res) {
    res.locals.user = new User()
    return renderer(res)(view.new(res.locals))
  },

  create (req, res, next) {
    const user = new User(userParams(req.body))

    return user.save((err, who) => {
      if (err && err.errors) {
        res.locals.user = user
        res.locals.errors = err.errors
        return renderer(res)(view.new(res.locals))
      }

      if (err) { return next(err) }

      mailer.accountActivation(who, (err, info) => {
        if (err) { return next(err) }
      })

      req.session.flash = { info: 'Please check your email to activate account.' }
      return res.redirect('/')
    })
  },

  edit (req, res, next) {
    const id = req.params.id

    if (!validator.isMongoId(id)) { return next() }

    if (!req.session.user) {
      req.session.flash = { danger: 'Please log in' }
      return res.redirect('/login')
    }

    if (req.session.user._id !== req.params.id) {
      return res.redirect('/')
    }

    return User.findById(id)
      .then(user => {
        res.locals.user = user
        renderer(res)(view.edit(res.locals))
      })
      .catch(next)
  },

  update (req, res, next) {
    const id = req.params.id

    if (!validator.isMongoId(id)) { return next() }

    if (!req.session.user) {
      req.session.flash = { danger: 'Please log in' }
      return res.redirect('/login')
    }

    if (req.session.user._id !== req.params.id) {
      return res.redirect('/')
    }

    function updateUser (err, user) {
      if (err) { return next(err) }

      user.set(userParams(req.body))
      user.save((err) => {
        if (err && err.errors) {
          res.locals.user = user
          res.locals.errors = err.errors
          return renderer(res)(view.edit(res.locals))
        }

        if (err) { return next(err) }

        req.session.flash = { success: 'Profile updated' }
        return res.redirect(`/users/${user.id}`)
      })
    }

    return User.findById(id, updateUser)
  },

  delete (req, res, next) {
    const id = req.params.id
    if (!validator.isMongoId(id)) { return next() }

    if (!req.session.user) {
      req.session.flash = { danger: 'Please log in' }
      return res.redirect('/login')
    }

    if (!req.session.user.admin) {
      return res.redirect('/')
    }

    return User.findByIdAndRemove(id)
      .then(user => {
        req.session.flash = { success: `User '${user.username}' deleted` }
        return res.redirect(req.session.state.users)
      })
      .catch(next)
  }
}

function createUserRouter () {
  const to = routing.create(actions, view)

  const router = express.Router()

  router.get('/', to('index'))
  router.get('/new', to('new'))
  router.get('/:id', to('show'))
  router.get('/:id/edit', to('edit'))

  router.post('/', to('create'))
  router.patch('/:id', to('update'))
  router.delete('/:id', to('delete'))

  return { to, router }
}

module.exports = createUserRouter()