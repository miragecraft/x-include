'use strict';

const include = (()=>{

  let log = [];

  let f = (src,data) => {
    f.this(`<script src="${f.root}${src}">${JSON.stringify(data)}</script>`);
  }

  f.this = (html)=>{

    let self = document.currentScript;

    if (typeof html === 'function') {

      let params = (()=>{
        let _p = {};
        return {
          get link() {
            return _p.link ??= f.link();
          },
          get data() {
            return _p.data ??= data();
          },
          get dom() {
            return _p.dom ??= template();
          }
        }
      })();

      html = html(params);
    }

    // DOM insertion allow <script> to trigger
    html = document.createRange().createContextualFragment(html);

    html.querySelectorAll('include-once').forEach((e)=>{
      let entry = e.getAttribute('title') ?? self.src;
      if (log.includes(entry)) {
        e.remove()
      } else {
        log.push(entry);
        e.replaceWith(...e.childNodes)
      }
    });

    let ancestry = new Set(self.dataset.injected?.split(',').filter(Boolean) ?? []);

    if (!!self.src) ancestry.add(index(self.src));

    let scripts = html.querySelectorAll('script');

    scripts.forEach((e)=>{
      e.setAttribute('data-injected', [...ancestry].join(','));
      if (!e.src) return;
      if (!e.hasAttribute('async')) e.async = false;
      if (e.hasAttribute('data-unique') && log.includes(e.src)) e.remove();
      if (self.hasAttribute('data-loop')) {
        e.setAttribute('data-loop', '')
      }
      else if (ancestry.has(index(e.src))) {
        throw new Error('Infinite include loop terminated');
      }
    });

    // simple loader
    let required = html.querySelector('required-js');
    if (!!required) {
      let last = required.querySelector('script:last-of-type');
      last.onload = f.resolve;
      required.replaceWith(...required.childNodes)
    } else {
      f.resolve();
    }

    // FOUC mitigation for external CSS
    if (document.readyState === 'loading') {

      // force evaluate via inline document.write
      scripts.forEach((e)=>{e.replaceWith(write(e))})

      let links = html.querySelectorAll('link[rel=stylesheet]');
      // use "blocking" attribute (Chrome)
      if ('blocking' in document.createElement('link')) {
        links.forEach((e)=>{
          e.setAttribute('blocking','render');
        });
      }
      // document.write fallback
      else if (!self.hasAttribute('data-injected')) {
        links.forEach((e)=>{
          e.replaceWith(write(e));
        })
      }
    }

    self.replaceWith(html);

    function write(e){
      let str = e.outerHTML.replace('</script>', '</scr\` + \`ipt>');
      return document.createRange().createContextualFragment(`
        <script>
          document.write(\`${str}\`);
          document.currentScript.remove()
        </script>
      `)
    }

    function index(str) {
      let i = log.indexOf(str)+1;
      if (!i) i = log.push(str);
      return i.toString();
    }

    function data() {
      return JSON.parse(self.innerHTML.trim())
    }

    function template() {
      let prev = self.previousElementSibling;
      if (!prev.matches('template')) {
        throw new Error('Missing <template> before the include <script>');
      }
      return prev.parentElement.removeChild(prev);
    }

  }

  f.link = ()=>{

    let base = (document.currentScript.getAttribute('src') ?? '').trim();
    let prefix = '';

    if (base.includes('//')) {
      let split = 1+base.indexOf('/', 2+base.indexOf('//'));
      prefix = base.substring(0, split);
      base = base.substring(split);
    } else
    if (base.startsWith('/')) {
      prefix = '/';
      base = base.substring(1);
    } else
    if (base.startsWith('./')) {
      base = base.substring(2)
    } else
    if (base.startsWith('../')) {
      let split = 3+base.lastIndexOf('../');
      prefix = base.substring(0, split);
      base = base.substring(split); 
    }

    base = base.split('/');
    base.pop();

    return function(path) {

      if (!path) return;

      path = path.trim();

      if (
        path.includes('//') ||
        path.startsWith('/') ||
        path.startsWith('data:')
      ) {return path}

      if (path.startsWith('./')) {
        path = path.subString(2)
      }
      path = base.concat(path.split('/'));

      let total = path.indexOf('..');
      if (total>0) {
        let intent = path.lastIndexOf('..')-total+1;
        let actual = Math.min(total,intent);
        path.splice(total-actual,actual*2);
      }

      /* simpler but less efficient
      for (let i = path.indexOf('..'); i>0; i = path.indexOf('..')) {
        path.splice(i-1,2)
      }
      */

      path = prefix + path.join('/');

      if (path.indexOf('../') > 0) {
        throw new Error('Cannot resolve path');
      } 



      return path
    }
  }

  let root = document.currentScript.getAttribute('data-root');
  f.root = (!!root) ? f.link()(root) + '/' : '';

  f.loading = true;

  f.resolve = () => {
    f.loading = false;
    document.dispatchEvent(new Event('loaded'));
  }

  f.ready = (callBack) => {

    let _ready = (callBack) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callBack)
      } else {
        callBack()
      }
    }

    let isReady = () => {_ready(() => {callBack()})}

    if (f.loading) {
      document.addEventListener('imported', isReady)
    } else {
      isReady();
    }
  };

  return f;

})();