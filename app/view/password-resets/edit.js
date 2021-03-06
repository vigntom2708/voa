const w = require('../helpers')
const h = require('../helpers/hyperscript')

const { div, h1, input, button } = h

function EditPassword ({ name, placeholder, errors }) {
  const options = w.maybeError({
    className: 'form-control',
    type: 'password',
    name,
    placeholder
  }, errors)

  return div('.form-group', [
    input('#edit-password', options)
  ])
}

function ResetPassword ({ user, token, errors, csrfToken }) {
  const action = `/passwordResets/${token}`

  return div('.main', [
    h1('.page-header', 'Reset password'),
    div('.d-flex.justify-content-center', [
      div('.w-30', [
        w.FormFor('#reset-password.reset-password', { action }, [
          input({ type: 'hidden', name: '_method', value: 'patch' }),
          input({ type: 'hidden', name: '_csrf', value: csrfToken }),
          input({ type: 'hidden', name: 'email', value: user.email }),

          EditPassword({
            name: 'password',
            placeholder: 'password',
            errors
          }),

          EditPassword({
            name: 'passwordConfirmation',
            placeholder: 'confirmation',
            errors
          }),

          button('.btn.btn-block.btn-primary.my-3', { type: 'submit' }, 'Submit')
        ])
      ])
    ])
  ])
}

module.exports = ResetPassword
