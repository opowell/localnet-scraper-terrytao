import { afterEach, describe, expect, it } from 'vitest'
import { parserLoader, resetPage, visit } from '#scraper-test'

// The parser, evaluated with the helpers it is injected with, as a scrape runs it.
const load = parserLoader(__dirname)

afterEach(resetPage)

describe('listings', () => {
  it.each([
    ['terrytao.js', 'parseTerryTao', 'https://terrytao.wordpress.com/', '<h2 class="post-title"><a rel="bookmark" href="https://terrytao.wordpress.com/2026/11/06/a/">A post</a></h2>', 'https://terrytao.wordpress.com/2026/11/06/a/'],
  ])('%s links %s to what it lists, as the default parse finds no links on a page that is no article', async (file, parser, url, body, listed) => {
    visit(url, body)
    expect(await load(file, [parser])[parser]()).toEqual({ listing: true, links: [{ url: listed, score: 1 }] })
  })

  it.each([
    ['terrytao.js', 'parseTerryTao', 'https://terrytao.wordpress.com/'],
    ['terrytao.js', 'parseTerryTao', 'https://terrytao.wordpress.com/category/mathematics/'],
    ['terrytao.js', 'parseTerryTao', 'https://terrytao.wordpress.com/tag/ai/'],
    ['terrytao.js', 'parseTerryTao', 'https://terrytao.wordpress.com/2026/11/'],
  ])('%s marks a page it does not read, leaving its content and links to the default parse (%s %s)', async (file, name, url) => {
    const parse = load(file, [name])[name]
    visit(url, '')
    expect(await parse()).toEqual({ listing: true })
  })

  it.each([
    ['terrytao.js', 'parseTerryTao', 'https://terrytao.wordpress.com/2026/11/02/egoless/', '<h1 class="post-title">Post</h1><div class="post-content"><p>Words</p></div>'],
  ])('%s leaves a post to read (%s %s)', (file, name, url, body) => {
    visit(url, body)
    const parsed = load(file, [name])[name]()
    expect(parsed.title).toBe('Post')
    expect(parsed.listing).toBeUndefined()
  })
})

describe('sites\' own searches', () => {
  it.each([
    ['terrytao.js', 'parseTerryTao', 'https://terrytao.wordpress.com/?s=prime', '<div class="post-brief"><h3><a href="https://one.example/" rel="bookmark">One</a></h3></div>'],
  ])('%s reads its blog\'s search as a listing of the posts it found', async (file, parser, url, body) => {
    visit(url, body)
    expect(await load(file, [parser])[parser]()).toEqual({ listing: true, links: [{ url: 'https://one.example/', score: 1 }] })
  })
})

describe('blogs', () => {
  it('reads a Terence Tao post with its formulas as their LaTeX, then each comment', () => {
    const { parseTerryTao } = load('terrytao.js', ['parseTerryTao'])
    visit('https://terrytao.wordpress.com/2026/11/02/egoless-mathematics-in-the-ai-era/', `
      <div class="entry"><h1 class="post-title">Egoless Mathematics</h1>
        <div class="post-content"><p>Let <img class="latex" src="https://s0.wp.com/latex.php?latex=n" alt="{n}"> be large.</p><div class="sharedaddy"><p>Share this</p></div></div></div>
      <div id="comments" class="commentlist">
        <div class="comment depth-1" id="comment-1">
          <div class="comment-metadata"><p class="comment-permalink"><a href="https://terrytao.wordpress.com/2026/11/02/egoless-mathematics-in-the-ai-era/#comment-1">2 November, 2026 at 11:01 am</a></p>
          <p class="comment-author"><strong class="fn"><a href="http://valuevar.wordpress.com/">valuevar</a></strong></p></div>
          <div class="comment-content"><img alt="avatar" src="https://1.gravatar.com/a" width="32" height="32"><p>Fine.</p></div>
          <div class="children"><div class="comment depth-2" id="comment-2">
            <div class="comment-metadata"><p class="comment-author"><strong class="fn">Anonymous</strong></p></div>
            <div class="comment-content"><p>Agreed.</p></div>
          </div></div>
        </div>
      </div>`)
    expect(parseTerryTao()).toEqual({
      title: 'Egoless Mathematics',
      content: [
        'Let {n} be large.',
        '<comment depth="0" author="valuevar" author-url="http://valuevar.wordpress.com/" url="https://terrytao.wordpress.com/2026/11/02/egoless-mathematics-in-the-ai-era/#comment-1">',
        'Fine.',
        '<comment depth="1" author="Anonymous">',
        'Agreed.',
      ],
    })
  })
})

describe('authors', () => {
  const head = (name: string, url: string) => `<post author="${name}" author-url="${url}">`

  it.each([
    ['terrytao.js', 'parseTerryTao', 'https://terrytao.wordpress.com/2026/11/02/a/', 'https://terrytao.wordpress.com/author/ann/', `
      <h1 class="post-title">A</h1><p>by <a href="https://terrytao.wordpress.com/author/ann/" rel="author">Ann</a></p><div class="post-content"><p>Text.</p></div>`],
  ])('heads a post of %s with its author, and links to their page', (file, parser, url, authorUrl, body) => {
    visit(url, body)
    expect(load(file, [parser])[parser]()).toEqual({ title: 'A', content: [head('Ann', authorUrl), 'Text.'], links: [{ url: authorUrl, score: 1 }] })
  })
})

describe('author pages', () => {
  const ranked = (...urls: string[]) => ({ listing: true, links: urls.map((url, rank) => ({ url, score: 1 / (1 + rank / 10) })) })

  it.each([
    ['terrytao.js', 'parseTerryTao', 'https://terrytao.wordpress.com/author/teorth/', 'https://terrytao.wordpress.com/2026/11/05/one/', `
      <h1 class="post-title">Author Archive</h1><div class="post-content"><p>Browsing.</p></div>
      <h2 class="post-title"><a href="https://terrytao.wordpress.com/2026/11/05/one/" rel="bookmark">One</a></h2>`],
  ])('links an author\'s page of %s to each of their works', (file, parser, url, work, body) => {
    visit(url, body)
    expect(load(file, [parser])[parser]()).toEqual(ranked(work))
  })
})
