const _include = (()=>{
'use strict';

let log = [];

return (html)=>{
  let script = document.currentScript;

  // DOM insertion allow <script> to trigger
  html = document.createRange().createContextualFragment(html);

  // prepare base url
  let base = (script.getAttribute('src') ?? '').trim().split("?")[0];
  let prefix = '';
  let limit;
  if (base.includes('//')) {
    prefix = base.substring(0, base.indexOf('//')+2);
    base = base.substring(base.indexOf('//')+2);
    limit = 1;
  } else
  if (base.startsWith('/')) {
    prefix = '/';
    base = base.substring(1);
    limit = 0;
  } else
  if (base.startsWith('./')) {
    base = base.substring(2)
  }
  base = base.split('/');
  base.pop(); // remove filename

  // remap relative linked assets
  html.querySelectorAll('[href]').forEach((e)=>{
    e.setAttribute('href', resolve(e.getAttribute('href')))
  });
  html.querySelectorAll('[src]').forEach((e)=>{
    e.setAttribute('src', resolve(e.getAttribute('src')))
  });
  html.querySelectorAll('[srcset]').forEach((e)=>{
    let srcset = e.getAttribute('srcset').replace(/\s\s+/g, ' ').split(',');
    srcset.forEach((src)=>{
      src = src.trim().split(' ');
      src[0] = resolve(src[0]);
      src = src.join(' ');
    })
    e.setAttribute('srcset', srcset.join(','))
  }); 
  html.querySelectorAll('object[data]').forEach((e)=>{
    e.setAttribute('data', resolve(e.getAttribute('data')))
  });
  html.querySelectorAll('form[action]').forEach((e)=>{
    e.setAttribute('action', resolve(e.getAttribute('action')))
  });
  html.querySelectorAll('style').forEach((e)=>{
    e.innerHTML = css_remap(e.innerHTML);  
  });
  html.querySelectorAll('[style]').forEach((e)=>{
    e.setAttribute('style', css_remap(e.getAttribute('style')))
  });

  // <include-once> function
  html.querySelectorAll('include-once').forEach((e)=>{
    let entry = e.getAttribute('title') ?? script.src;
    if (log.includes(entry)) {
      e.remove()
    } else {
      log.push(entry);
      e.replaceWith(...e.childNodes)
    }
  });

  // set up ancestry
  let ancestry = new Set(script.dataset.injected?.split(',').filter(Boolean) ?? []);

  if (!!script.src)
    ancestry.add(index(script.src));

  html.querySelectorAll('script').forEach((e)=>{
    // add ancestry
    e.setAttribute('data-injected', [...ancestry].join(','));
    // skip if inline script
    if (!e.src) return;
    // disable async
    if (!e.hasAttribute('async')) e.async = false;
    // enforce uniqueness
    if (e.hasAttribute('data-unique') && log.includes(e.src)) e.remove();
    // if looping, propagate
    if (script.hasAttribute('data-loop')) {
      e.setAttribute('data-loop', '')
    }
    // else prevent infinite loop
    else if (ancestry.has(index(e.src))) {
      throw new Error('Infinite include loop terminated');
    }
  })


  if (document.readyState === 'loading') {
    let links = html.querySelectorAll('link[rel=stylesheet]');
    // use "blocking" attribute (Chrome)
    if ('blocking' in document.createElement('link')) {
      links.forEach((e)=>{
        e.setAttribute('blocking','render');
      });
    }
    // document.write fallback
    else if (!script.hasAttribute('data-injected')) {
      links.forEach((e)=>{
        e.replaceWith(write(e));
      })
    }
  }

  script.replaceWith(html);


  function write(e){
    return document.createRange().createContextualFragment(`
      <script>
        document.write(\`${e.outerHTML}\`);
        document.currentScript.remove()
      </script>
    `)
  }

  function index(str) {
    if (log.includes(str)) {
      return (log.indexOf(str)+1).toString();
    } else {
      log.push(str);
      return log.length.toString();
    }
  }

  function css_remap(str) {
    return str.replaceAll(/url\(("|')?(.*?)\1\)/gi,
        (str,quotes='',url)=>`url(${quotes}${resolve(url)}${quotes})`); 
  }

  function resolve(path) {
    path = path.trim();
    // ignore non-relative path
    if (
      path.includes('//') ||
      path.startsWith('/') ||
      path.startsWith('data:')
    ) {return path}
    // remove current directory reference
    if (path.startsWith('./')) {
      path = path.subString(2)
    }
    // count backtracks
    let backtrack = 0;
    while (path.startsWith('../')) {
      path = path.substring(3);
      backtrack++;
    }
    // enforce backtrack limit
    if (!!limit && backtrack > base.length - limit) {
      throw new Error('Cannot resolve path');
    } 
    // apply backtracking to base path
    let bridge = [...base];
    while (backtrack > 0) {
      if (bridge.length !== 0 && bridge.slice(-1) !== '..') {
        bridge.pop()
      } else {
        bridge.push('..')
      }
      backtrack--
    }
    // construct final path
    return prefix + bridge.join('/') + ((!!bridge.length) ? '/' : '') + path
  }

}

})();


// data parser (JSON alternative)
_include.data = (()=>new Function('return '+document.currentScript.innerHTML.trim())());
