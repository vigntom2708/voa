function fullTitle (pageTitle = '') {
  const baseTitle = 'Vote Application'

  if (pageTitle.length === 0) { return baseTitle }

  return pageTitle + ' | ' + baseTitle
}

module.exports = { fullTitle }
