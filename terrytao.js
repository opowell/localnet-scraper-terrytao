// WordPress.com sets a formula as a picture of it (img.latex), its LaTeX the picture's alt text: the formula is read as
// that text, where it stands in its paragraph, rather than as a picture of its own. The scrape's tab is its own, so
// the page itself is changed.
function inlineFormulas(root) {
  for (const img of root.querySelectorAll('img.latex')) {
    img.replaceWith(document.createTextNode(img.getAttribute('alt') || ''))
  }
}

// A post (/2026/11/02/egoless-mathematics-in-the-ai-era/) reads as its title, a head with its author, each paragraph,
// heading, list item, code block and picture of it, then each comment, its head (see commentBlock), with its depth (its depth-N class, from 1),
// author and the author's site, and its own link, then its paragraphs. The page gives a comment's time in the blog's
// own time zone, which it does not name, so it is not read. An author's page (/author/teorth/) links to each post it
// shows. The home page, categories, tags and the archive (/2026/11/) are not read, but link to each post they show, and are marked as listings.
function parseTerryTao(_profileId) {
  if (location.hostname !== 'terrytao.wordpress.com') {
    return null
  }
  if (/^\/(?:(?:author|category|tag)\/.*|\d{4}\/(?:\d{2}\/(?:\d{2}\/)?)?)?$/.test(location.pathname)) {
    // A search's results (/?s=prime) are briefs of posts (.post-brief), each headed by a link to it.
    return listingOf(linkUrls('.post-title a[rel="bookmark"], .post-brief a[rel="bookmark"]')) ?? { listing: true }
  }
  const title = document.querySelector('.post-title')
  const body = document.querySelector('.post-content')
  if (!title || !body) {
    return null
  }
  inlineFormulas(document)
  const content = textBlocks(body, { lists: true, skip: '.sharedaddy, #jp-post-flair, .jp-relatedposts' })
  for (const comment of document.querySelectorAll('#comments .comment')) {
    const author = comment.querySelector(':scope > .comment-metadata .comment-author')
    content.push(commentBlock({
      depth: Number(comment.className.match(/\bdepth-(\d+)\b/)?.[1] || 1) - 1,
      author: author?.innerText.trim() || '[deleted]',
      authorUrl: author?.querySelector('a')?.href,
      url: comment.querySelector(':scope > .comment-metadata .comment-permalink a')?.href,
    }), ...textBlocks(comment.querySelector(':scope > .comment-content') || comment, { lists: true, skip: '.cs-rating' }))
  }
  return withAuthors({ title: title.innerText.trim(), content }, linkedAuthors('a[rel="author"]'))
}

// The parser a scrape calls.
registerParser(parseTerryTao)
