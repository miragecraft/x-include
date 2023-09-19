# HTML Include

Cross site HTML include via &lt;script> tag in the manner of JSONP.

*Basic features:*

- Bypass CORS, usable with `file://` protocol.
- Synchronous
  - Prevent FOUC
  - Simple dependency management
- Dynamically remap relative paths inside includes
 
*Advanced features:*

- `data()` and `template()` methods for passing data to include files
- `<include-once>` tag allowing smarter resource management
- Detect and block infinite include loops (can be bypassed)

*Note:*

I suck at coding, so no advanced techniques here. Also it's not optmized for speed but for clarity.

*For future consideration:*

Relative path remapping is undesirable when passing HTML data from the host page into the include file and intermix with HTML from the include file itself.

There should be a way to mark specific sections of HTML to be excluded from remapping.

I'll get to it when it becomes an issue for my own use.

## Documentation

1. [Basic usage](#basic)
2. [Async and defer for included scripts](#async)
3. [Passing data to include files](#passing)
5. [`<include-once>` tag](#once)
6. [Infinite loop detection](#loop)
7. [Relative path remapping](#remap)
8. [FOUC prevention](#fouc)
9. [Syntax Highlighting](#highlight)

### Basic usage <a id='basic'></a>

```html
<!DOCTYPE html>
<html>
<head>
  <script src="js/include.js"></script>
  <script src="includes/head.js"></script>
</head>
<body>
  <script src="includes/header.js"></script>
  <main>
    <article>
      <h1>Lorem Ipsum</h1>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed pellentesque neque vitae varius facilisis.</p>
      <p>Morbi ut urna bibendum, molestie lectus et, cursus dui. Aliquam erat volutpat. Ut nec mi id tortor fermentum scelerisque. Suspendisse congue porta libero, a elementum mauris ullamcorper et.</p>
      <p>Morbi ac odio fermentum, scelerisque sapien at, fringilla libero. Curabitur accumsan molestie dolor, vitae vestibulum quam tempus vitae. Maecenas rhoncus purus sem. Pellentesque eu urna magna. Phasellus et lectus urna.</p>
    </article>
  </main>
  <script src="includes/footer.js"></script>
</body>
</html>
```

```js
// head.js
_include(`
  <title># Replace with H1 text #</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/svg+xml" href="img/favicon.svg">
  <link rel="stylesheet" media="screen" href="css/style.css">
  <script>
    document.addEventListener('DOMContentLoaded', ()=>{
      document.title = document.querySelector('h1').innerText;
    })
  </script>
`)
```

### Async and defer for included scripts <a id='async'></a>

As all dynamically inserted script tags are async by default, the include function automatically change async to false.

However, the function check whether the `async` attribute exist, in which case it will leave async to true.

Therefore, included scripts will behave exactly like how they would if they exists on the host page natively, and both `async` and `defer` attributes work as you expect.

### Passing data to include files <a id='passing'></a>

#### 1. JSON

When providing a source for external script, the script tag content is ignored.

But we can use this ignored content as data carrier to elegantly send data to the included file.

The following example uses JSON.

```html
<script src="includes/head.js">
 {
   "title":"My Article",
   "keywords":"some,key,words",
 }
</script>
```
```js
// head.js
let data = JSON.parse(document.currentScript.innerHTML);
_include(`
  <title>${data.title}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="keywords" content="${data.keywords}"/>
  <link rel="icon" type="image/svg+xml" href="img/favicon.svg">
  <link rel="stylesheet" media="screen" href="css/style.css">
`)
```

#### 2. `data()` method

As JSON is not intended to be handwritten, it has the following usability drawbacks:

1. No multiline string support
2. Must quote object keys, adding to verbosity

So as an alternative, the `_include.data()` method is provided to parse `<script>` tag content as native JavaScript using the `Function()` constructor.

This allows you to pass data as if you're defining a variable, with all the syntactic sugar at your dispoal while preserving syntax highlighting.

```html
<!-- passing an object -->
<script src="includes/article.js">
{
  theme: 'dark',
  html: `
    <h1>Title</h1>
    <span>Subtitle</div>
    <p>Praesent nec magna gravida, maximus purus eget, lobortis neque.</p>
    <p>Nulla consectetur auctor turpis, id interdum libero placerat ac. Aliquam ullamcorper, justo sit amet vestibulum imperdiet, lorem ligula pulvinar velit, in dapibus ligula ipsum a enim.</p>
  `
}
</script>
```
```js
//article.js
let data = _include.data();
_include(`
  <article class="${data.theme}">
    ${data.html}
  </article>
`);
```

```html
<!-- passing a string -->
<script src="includes/article.js">
`
  <h1>Title</h1>
  <span>Subtitle</div>
  <p>Praesent nec magna gravida, maximus purus eget, lobortis neque.</p>
  <p>Nulla consectetur auctor turpis, id interdum libero placerat ac. Aliquam ullamcorper, justo sit amet vestibulum imperdiet, lorem ligula pulvinar velit, in dapibus ligula ipsum a enim.</p>
`
</script>
```
```js
//article.js
let data = _include.data();
_include(`
  <article>
    ${data}
  </article>
`);
```

#### 3. `template()` method

This method utilizes the `<template>` tag, you must place the template before the include script in order to make it visible to the script.

The advantage of the `_include.template()` method is that you do not need to escape unsafe characters.

Example shown below:

```html
<template>
  <h1>Title</h1>
  <span>Subtitle</div>
  <p>Praesent nec magna gravida, maximus purus eget, lobortis neque.</p>
  <p>Nulla consectetur auctor turpis, id interdum libero placerat ac. Aliquam ullamcorper, justo sit amet vestibulum imperdiet, lorem ligula pulvinar velit, in dapibus ligula ipsum a enim.</p>
</template>
<script src="includes/prose.js"></script>
```

```js
let template = _include.template();
// manipulate the template DOM as needed.
_include(/`
  <section class="prose">
    ${template.innerHTML}
  </section>
`);
template.remove();
```

### `<include-once>` tag <a id='once'></a>

In order to prevent resources and unique content from being included multiple times, a `<include-once>` custom element is provided with optional `title` attribute.

*1. Include once within the same script file*

When used by itself, the content of the `<include-once>` element is only rendered the first time the script file is included. All subsequent includes for the same include file will omit this content.

```js
// duplicate.js
_include(`
<include-once>
  <p>Unique</p>
</include-once>
<p>Repeating</p>
`)
```
```html
<script src="duplicate.js"></script>
<script src="duplicate.js"></script>
<!-- Output -->
<p>Unique</p>
<p>Repeating</p>
<p>Repeating</p>
```

*2. Include once everywhere*

By providing a unique `title` attribute, the content of the `<include-once>` element is associated with the title provided, this allows you to include only one copy of the content across multiple include files.

```js
// duplicate1.js
_include(`
<include-once title="lorem-ipsum">
  <p>Unique</p>
</include-once>
<p>One</p>
`)
// duplicate2.js
_include(`
<include-once title="lorem-ipsum">
  <p>Unique</p>
</include-once>
<p>Two</p>
`)
```
```html
<script src="duplicate1.js"></script>
<script src="duplicate2.js"></script>
<!-- Output -->
<p>Unique</p>
<p>One</p>
<p>Two</p>
```

Note: the include function does not check whether the included content sharing the same title attribute are in fact identical, it will simply discard any subsequent blocks.

### Infinite loop detection <a id='loop'></a>

By default, the include function will stop any infinite include loops (circular include reference) it detects.

If you want to apply advanced logic within an include script, and allow circular reference, then you can disable this behavior by adding the attribute `data-loop` to the script tag.

### Relative path remapping <a id='remap'></a>

Relative path remapping allows you to include the same HTML from different directory levels without breaking links to assets.

It works by detecting currentScript's `src` attribute, then parse the included HTML string and reconcile all the relative path detected based on the aforementioned `src` value.

The logic is as followed, first the HTML string is parsed into a DocumentFragment, and then it will try to detect relative path within the following:

 - `href`, `src` and `srcset` attributes
 - `<object>` element's `data` attribute
 - `<form>` element's `action` attribute
 - `<style>` element and `style` attributes containing `url()` (with optional single or double quotes)

By utilizing the DOM parser via DocumentFragment, paths that are part of the text (such as within code blocks) are excluded from remapping.

### FOUC prevention <a id='fouc'></a>

Flash of unstyled content (FOUC) is prevented by loading HTML synchronously in a script and render-blocking manner.

This is done by directly injecting `<script>` tags with `async` set to `false` for external scripts (inline scripts are always synchronous). External stylesheets are loaded either with the attribute `blocking="render"` [(MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#blocking) which is currently supported only by Chrome, or with `document.write`.

*Limitation*:

External stylesheets critical for site layout should not be inside nested includes, as `document.write` isn't allowed from `an asynchronously-loaded external script`.

Yes, the include function flips the async property to false, but the browser doesn't care and still consider them to be asynchronously-loaded.

### Syntax highlighting <a id='highlight'></a>

Various editors have plugins/extensions available for template literal (multiline string) syntax highlighting (ex. [VS Code](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)), making editing HTML strings much easier.
