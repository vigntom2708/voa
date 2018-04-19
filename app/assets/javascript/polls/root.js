const h = require('react-hyperscript')
const hh = require('hyperscript-helpers')
const w = require('../../../helpers/view-helper')
const dateFormat = require('dateformat')

const { div, h3, a, p, time, span } = hh(h)

function PollCard ({ poll }) {
  return div('.card.w-100.border-0', [
    div('.card-body.p-0', [
      h3('.h5.font-weight-normal.card-title', [
        a('.card-link', { href: `/users/${poll.author._id}` }, `${poll.author.username}`),
        span('.slash', ' / '),
        a('.card-link', { href: `/polls/${poll._id}` }, `${poll.name}`)
      ]),

      p('.card-text', poll.description),
      p('.card-text', [span('.oi.oi-star'), ` ${poll.stargazers.count}`]),
      p('.card-text.small', ['Updated on ', time(dateFormat(poll.updatedAt, 'mediumDate'))])
    ])
  ])
}

function PollsList ({ polls, pollsCount, menuItem }) {
  const info = `Result: ${pollsCount} polls`
  const path = '/polls'

  return div('.voa-board', [
    div('.voa-item.p-0', [
      w.InfoBar({ info, menuItem }),
      Dropdown({ path })
    ]),

    polls.map(x => div('.voa-item', { key: x._id }, [ PollCard({ poll: x }) ]))
  ])
}

function Dropdown ({ path }) {
  return div('.dropdown-menu.dropdown-menu-right', { 'aria-labelledby': 'dropdownMenuButton' }, [
    a('.dropdown-item', { href: `${path}?s=&o=desc` }, 'Best match'),
    a('.dropdown-item', { href: `${path}?s=stars&o=desc` }, 'Most stars'),
    a('.dropdown-item', { href: `${path}?s=stars&o=asc` }, 'Fewest stars'),
    a('.dropdown-item', { href: `${path}?s=updated&o=desc` }, 'Recently updated'),
    a('.dropdown-item', { href: `${path}?s=updated&o=asc` }, 'Least recently updated')
  ])
}

module.exports = function Index (options) {
  return div('.main.container.my-5', [
    div('.row.justify-content-center', [
      div('.col-3', [ w.SortGroup(options) ]),
      div('.col-7', [ PollsList(options) ])
    ]),
    w.PaginationStdBar(options)
  ])
}
