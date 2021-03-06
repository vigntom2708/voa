const R = require('ramda')
const express = require('express')
const paginate = require('express-paginate')
const polls = require('./polls')
const Poll = require('../models/poll')
const User = require('../models/user')
const log = require('../../lib/logger')
const mailer = require('../../lib/mailer')
const routing = require('../../lib/routing')
const template = require('../view/users')
const voaView = require('../../lib/view')

const renderer = res => page => res.render('application', page)
const defaultParams = [
  'username',
  'email',
  'password',
  'passwordConfirmation',
  'emailProtected'
]

const userParams = R.pick(defaultParams)

const data = {
  index: { title: 'Users' },
  show: { title: 'Show users' },
  new: { title: 'Signup' },
  edit: { title: 'Edit user' }
}

const view = voaView.bind(template, data)

const actions = {
  index (req, res, next) {
    const q = routing.query
    const sort = mkSortArg(req.query)
    const cond = !(req.session.user && req.session.user.admin)
    const query = q.unprotected(cond, q.search('username', req.query.q))
    const pollQuery = q.unrestricted(cond, q.search('name', req.query.q))

    function mkSortArg ({ s, o }) {
      const order = (o === 'asc') ? 'asc' : 'desc'

      if (s === 'joined') { return { activatedAt: order } }
      if (s === 'polls') { return { polls: order } }

      return {}
    }

    function sortMenuItem ({ s, o }) {
      if (s === 'joined') {
        if (o === 'asc') { return 'Least recently joined' }
        return 'Most recently joined'
      }

      if (s === 'polls') {
        if (o === 'asc') { return 'Fewest polls' }
        return 'Most polls'
      }

      return 'Best match'
    }

    return User.count(query)
      .then(usersCount => {
        if (req.skip >= usersCount) {
          req.skip = req.skip - req.query.limit
          if (req.skip < 0) req.skip = 0
          res.locals.paginate.page = res.locals.paginate.page - 1
        }

        return usersCount
      })
      .then(usersCount => {
        return Promise.all([
          User.find(query).sort(sort).limit(req.query.limit).skip(req.skip).lean(),
          usersCount,
          Poll.count(pollQuery)
        ])
      })
      .then(([users, usersCount, pollsCount]) => {
        const pageCount = Math.ceil(usersCount / req.query.limit)

        res.locals.users = users
        res.locals.pageCount = pageCount
        res.locals.usersCount = usersCount
        res.locals.pollsCount = pollsCount
        res.locals.pages = paginate.getArrayPages(req)(5, pageCount, req.query.page)
        res.locals.menuItem = sortMenuItem(req.query)
        res.locals.query = req.query

        req.session.state = { users: req.originalUrl }

        renderer(res)(view.index(res.locals))
      })
      .catch(next)
  },

  show (req, res, next) {
    const username = req.params.username
    const q = routing.query
    const query = q.search('name', req.query.q)

    return User.findOne({ username }).populate({
      path: 'pollList',
      match: query
    }).lean()
      .then(user => {
        res.locals.user = user
        res.locals.userQuery = req.query
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
    const current = req.session.user

    if (!current) {
      req.session.flash = { danger: 'Please log in' }
      return res.redirect('/login')
    }

    return User.findOne({ username: current.username })
      .then(user => {
        if (!user._id.equals(current._id)) {
          log.warn('User %s does not have privileges to edit other users', current.username)
          return res.redirect('/')
        }

        res.locals.user = user
        renderer(res)(view.edit(res.locals))
      })
      .catch(next)
  },

  update (req, res, next) {
    const { username } = req.params
    const current = req.session.user

    if (!current) {
      req.session.flash = { danger: 'Please log in' }
      return res.redirect('/login')
    }

    if (current.username !== username) {
      log.warn(`User ${current.username} attampt to modify user ${username}`)
      return res.redirect('/')
    }

    function updateUser (user) {
      const isPassword = x => x === 'password' || x === 'passwordConfirmation'
      const params = R.compose(
        R.pickBy((val, key) => !(!val && isPassword(key))),
        userParams
      )

      user.set(params(req.body))

      user.save()
        .then(user => {
          req.session.user = user
          req.session.flash = { success: 'Profile updated' }
          return res.redirect('/settings')
        })
        .catch(err => {
          if (err.errors) {
            res.locals.user = user
            res.locals.errors = err.errors
            return renderer(res)(view.edit(res.locals))
          }

          log.warn('User update error: ', err.message)
          return next(err)
        })
    }

    return User.findOne({ username })
      .then(updateUser)
      .catch(next)
  },

  delete (req, res, next) {
    const { username } = req.params
    const current = req.session.user

    if (!current) {
      req.session.flash = { danger: 'Please log in' }
      return res.redirect('/login')
    }

    if (!req.session.user.admin) {
      log.warn(`User ${current.username} attempt to delete a user ${username}`)
      return res.redirect('/')
    }

    return User.findOne({ username }).lean()
      .then(user => {
        return Poll.remove({ author: user._id })
      })
      .then((result) => {
        return User.remove({ username })
      })
      .then(result => {
        req.session.flash = { success: 'User deleted' }
        res.redirect('/search')
      })
      .catch(next)
  }
}

function createUserRouter () {
  const to = routing.create(actions, view)

  const router = express.Router()

  router.get('/:username', to('show'))

  router.post('/', to('create'))
  router.patch('/:username', to('update'))
  router.delete('/:username', to('delete'))

  router.use('/', polls.router)

  return { to, router }
}

module.exports = createUserRouter()
