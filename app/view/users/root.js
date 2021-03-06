const PaginationBar = require('../helpers/pagination')
const w = require('../helpers')
const h = require('../helpers/hyperscript')
const dateFormat = require('dateformat')

const { div, h3, a, time, p } = h

function AdminDeleteLink ({ current, user }) {
  const author = user.username

  if (user.admin) { return null }
  if (user.protected) { return null }

  if (current && current.admin) {
    return a('.btn.btn-outline-dark.btn-sm', {
      href: w.path({ author }),
      'data-method': 'delete',
      'data-confirm': 'You shure?'
    }, 'Delete')
  }
}

function UserCard ({ user, current }) {
  const author = user.username

  return div('.d-flex.flex-row', [
    div('.pr-3', [ w.Gravatar({ user, size: 48 }) ]),

    div('.card.w-100.border-0', [
      h3('.h5.font-weight-normal.card-title', [
        a({ href: w.path({ author }) }, author)
      ]),

      p('.card-text', [ 'Polls: ', user.polls ]),

      w.Email({ className: 'small', user, linkClass: 'card-text text-muted mr-3' }),

      p('.card-text.text-muted.small', [
        'Joined on ',
        time(dateFormat(user.activatedAt, 'mediumDate'))
      ])
    ]),

    div([ p([ AdminDeleteLink({ current, user }) ]) ])
  ])
}

function UsersList (options) {
  const { users, session } = options
  const current = session.user
  const info = `Result: ${options.usersCount} users`
  const path = '/search'
  const menuItem = options.menuItem

  return div('.voa-board', [
    div('.voa-item.p-0', [
      w.InfoBar({ info, menuItem }, Dropdown({ path }))
    ]),

    users.map(user => (
      div('.voa-item', { key: user._id }, [ UserCard({ user, current }) ])
    ))
  ])
}

function Dropdown ({ path }) {
  return div('.dropdown-menu.dropdown-menu-right', { 'aria-labelledby': 'dropdownMenuButton' }, [
    a('.dropdown-item', { href: `${path}?type=user&s=&o=desc` }, 'Best match'),
    a('.dropdown-item', { href: `${path}?type=user&s=joined&o=desc` }, 'Most recently joined'),
    a('.dropdown-item', { href: `${path}?type=user&s=joined&o=asc` }, 'Least recently joined'),
    a('.dropdown-item', { href: `${path}?type=user&s=polls&o=desc` }, 'Most polls'),
    a('.dropdown-item', { href: `${path}?type=user&s=polls&o=asc` }, 'Fewest polls')
  ])
}

module.exports = function Index (options) {
  return div('.main.container.my-5', [
    w.MessageDesk(options.flash),
    div('.row.justify-content-center', [
      div('.col-3', [ w.SortGroup(options) ]),
      div('.col-7', [ UsersList(options) ])
    ]),
    PaginationBar(options)
  ])
}
