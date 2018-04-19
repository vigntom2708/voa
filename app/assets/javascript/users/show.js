const h = require('react-hyperscript')
const hh = require('hyperscript-helpers')
const { Gravatar, Email, FormFor } = require('../../../helpers/view-helper')
const dateFormat = require('dateformat')

const { div, h2, h3, p, a, input, form, time, button } = hh(h)

function UserInfo ({ user }) {
  return div('.card.border-0', [
    Gravatar({ user, size: '160px', className: 'card-img-top' }),
    div('.card-body.px-0', [
      h2('.h3.card-title', user.username)

    ]),

    div('.card-footer.bg-white.py-4.px-0', [ Email({
      user,
      className: 'card-text'
    }) ])
  ])
}

function FilterPools (options) {
  const { user } = options
  const query = options.userQuery || {}

  return div('.d-flex', [
    form('.w-100.mr-2', {
      action: `/users/${user._id}`,
      method: 'get'
    }, [
      input('.form-control.filter-pools.', {
        type: 'search',
        placeholder: 'Search user pools...',
        'aria-label': 'Search',
        name: 'q',
        defaultValue: query.q
      }),

      input('.hidden', { type: 'submit' })
    ]),

    form({
      action: `/users/${user._id}`,
      method: 'get'
    }, [
      input({ type: 'hidden', name: 'q', value: '' }),
      button('.btn.btn-outline-secondary', {
        type: 'submit',
        className: query.q ? '' : 'hidden'
      }, 'Clear Filter')
    ])
  ])
}

function PollCard ({ poll }) {
  return div('.card.w-100.border-0', [
    div('.card-body', [
      h3('.h4.font-weight-normal', [
        a('.card-title.card-link', { href: `/polls/${poll._id}` }, poll.name)
      ]),
      p('.card-text', poll.description),
      p('.card-text.small', [
        'Updated on ',
        time(dateFormat(poll.updatedAt, 'mediumDate'))
      ])
    ])
  ])
}

function PollList (options) {
  const { user } = options

  return div('.voa-board', [
    div('.voa-item.py-0.pb-4', [ FilterPools(options) ]),

    user.pollList.map(poll => (
      div('.voa-item', { key: poll._id }, [
        PollCard({ poll })
      ])
    ))
  ])
}

module.exports = function Index (options) {
  return div('.main.container.my-5', [
    div('.row.justify-content-center', [
      div('.col-3', [ UserInfo(options) ]),
      div('.col-5', [ PollList(options) ])
    ])
  ])
}
