/* global $ */

$.ajaxSetup({
  headers: {
    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
  }
})

$(document).on('click', 'a[data-method]', function (e) {
  e.preventDefault()
  const csrf = $('meta[name="csrf-token"]').attr('content')
  const href = e.target.getAttribute('href')
  const method = e.target.getAttribute('data-method')
  const form = $(`<form method="post" action="${href}?_method=${method}"></form>`)

  form.hide()
    .append(
      `<input name="_csrf" value="${csrf}" type="hidden" />`
    ).appendTo('body')

  form.submit()
})