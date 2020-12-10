import query from 'component-query'
import closest from 'component-closest'
import matches from 'component-matches-selector'
import './stylesheet.css'

/**
 * constants
 */
const ROUTER_MODE = {
  HASH: 'hash',
  HISTORY: 'history',
}
const CONTAINER_CLASSNAME = 'docsify-scroll-container'
const WRAPPER_CLASSNAME = 'docsify-scroll-wrapper'

/**
 * basic utilities
 */
function toArray(elements) {
  return Array.prototype.slice.call(elements)
}
function findChapter(element) {
  const container = closest(element, 'div > ul > li')
  return query('p', container)
}
function findHyperlink(element) {
  return element.href ? element : query('a', element)
}
function isALinkTo(path, element) {
  if (arguments.length === 1) {
    return (element) => isALinkTo(path, element)
  }
  return decodeURIComponent(element.getAttribute('href').split('?')[0]) === decodeURIComponent(path)
}


/**
 * core renderer
 */
class Link {
  constructor(element) {
    if (!element) {
      return
    }
    this.chapter = findChapter(element)
    this.hyperlink = findHyperlink(element)
  }
  toJSON() {
    if (!this.hyperlink) {
      return
    }
    return {
      name: this.hyperlink.innerText,
      href: this.hyperlink.getAttribute('href'),
      chapterName: this.chapter && this.chapter.innerText || ''
    }
  }
}

function pagination(vm, { crossChapter, routerMode }) {
  try {
    const path = routerMode === ROUTER_MODE.HISTORY ?
      vm.route.path :
      `#${vm.route.path}`
    const all = toArray(query.all('.sidebar li a')).filter((element) => !matches(element, '.section-link'))
    const active = all.find(isALinkTo(path))
    const group = toArray((closest(active, 'ul') || {}).children)
      .filter((element) => element.tagName.toUpperCase() === 'LI')
    const index = crossChapter
      ? all.findIndex(isALinkTo(path))
      : group.findIndex((item) => {
        const hyperlink = findHyperlink(item)
        return hyperlink && isALinkTo(path, hyperlink)
      })

    const links = crossChapter ? all : group

    return {
      prev: new Link(links[index - 1]).toJSON(),
      next: new Link(links[index + 1]).toJSON(),
    }
  } catch (error) {
    return {}
  }
}

const TEMPALTES = {
  container() {
    return `<div class="${CONTAINER_CLASSNAME}"></div>`
  },
  wrapper() {
    return `<div class="${WRAPPER_CLASSNAME}"></div>`
  },
  scrollup(pre) {
    if (!pre) return null;
    return (
      `<div class='mouse-area mouse-out-area'>
        <a href=${pre.href}>
          <div id="mouse-scroll">
            <div>
              <span class="up-arrow-1"></span>
              <span class="up-arrow-2"></span>
              <span class="up-arrow-3"></span>
            </div>
            <div class="mouse">
              <div class="mouse-in mouse-out"></div>
            </div>
          </div>
        </a>
      </div>`
    )
  },
  scrolldown(next) {
    return (
      `<div class='mouse-area'>
        <a href=${next.href}>
          <div id="mouse-scroll">
            <div class="mouse">
              <div class="mouse-in"></div>
            </div>
            <div>
              <span class="down-arrow-1"></span>
              <span class="down-arrow-2"></span>
              <span class="down-arrow-3"></span>
            </div>
          </div>
        </a>
      </div>`
    )
  }

}

function scrollTo(offset, callback) {
  const fixedOffset = offset.toFixed(),
      onScroll = function () {
          if (window.pageYOffset.toFixed() === fixedOffset) {
              window.removeEventListener('scroll', onScroll)
              callback()
          }
      }

  window.addEventListener('scroll', onScroll)
  onScroll()
  window.scrollTo({
      top: offset,
      behavior: 'smooth'
  })
}
/**
 * installation
 */
export function install(hook, vm) {
  window.onscroll = function (ev) {
    let pagi = pagination(vm, {
      crossChapter: true,
      routerMode: 'hash'
    })
    let { next, prev } = pagi;
    // scroll top
    // if (window.scrollY === 0 && prev) {
    //   window.history.pushState({}, null, prev.href);
    //   scrollTo(120, () => {
    //     window.dispatchEvent(new HashChangeEvent("hashchange"));
    //   })
    // }
    // scroll bottom
    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight && next) {
      window.history.pushState({}, null, next.href);
      scrollTo(document.querySelector('.markdown-section').firstElementChild.offsetTop, () => {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      })
    }
  };

  function render() {
    const container = query(`.${CONTAINER_CLASSNAME}`)
    const wrapper = query(`.${WRAPPER_CLASSNAME}`)
    if (!container) {
      return
    }
    const pagi = pagination(vm, {
      crossChapter: true,
      routerMode: 'hash'
    })

    wrapper.innerHTML = TEMPALTES.scrollup(pagi.prev)
    container.innerHTML = TEMPALTES.scrolldown(pagi.next)
  }

  hook.afterEach((html) => TEMPALTES.wrapper() + html + TEMPALTES.container());
  hook.doneEach(() => render())

}
