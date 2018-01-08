import test from 'ava'
import db from '../helpers/database'
import User from '../../app/models/user'

db.setup(User)

const login = {
  username: 'foo',
  email: 'foo@example.com',
  password: 'abc123',
  passwordConfirmation: 'abc123'
}

test.before(() => {
  const user = new User(login)
  return user.save()
})

test.cb('username should be unique', t => {
  const user = new User(login)
  user.validate(v => {
    t.truthy(v.errors.username)
    t.end()
  })
})

test.cb('email should be unique', t => {
  const user = new User(login)
  user.validate(v => {
    t.truthy(v.errors.email)
    t.end()
  })
})

test.cb('should not authenticate if wrong username', t => {
  const username = 'wrongfoo'
  const password = login.password
  User.authenticate(username, password, (err, user) => {
    t.truthy(err)
    t.end()
  })
})

test.cb('should not authenticate if wrong email', t => {
  const email = 'foowrong@example.com'
  const password = login.password
  User.authenticate(email, password, (err, user) => {
    t.truthy(err)
    t.end()
  })
})

test.cb('should not authenticate if wrong password', t => {
  const username = login.usernam
  const password = 'wrong'
  User.authenticate(username, password, (err, user) => {
    t.truthy(err)
    t.end()
  })
})

test.cb('should authenticate if correct username password', t => {
  const username = login.username
  const password = login.password
  User.authenticate(username, password, (err, user) => {
    t.ifError(err)
    t.end()
  })
})

test.cb('should authenticate if correct email password', t => {
  const email = login.email
  const password = login.password
  User.authenticate(email, password, (err, user) => {
    t.ifError(err)
    t.end()
  })
})