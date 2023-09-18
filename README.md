# HTML XS Include

Cross site HTML include via &lt;script> tag in the manner of JSONP, primarily to allow its use via the `file://` protocol.

*Basic features:*

- Bypass CORS, usable with `file://` protocol.
- Synchronous
  - Prevent FOUC
  - Simple dependency management
- Dynamically remap relative paths inside includes
 
*Advanced features:*

- `<include-once>` tag allowing smarter resource management
- Detect and block infinite include loops (can be bypassed)

## Documentation

1. [Basic usage](#basic)
2. [Advanced usage](#advanced)
3. [Syntax Highlighting](#highlight)
4. [Using `<include-once>` tag](#once)
5. [Infinite loop detection](#loop)
6. [Relative path remapping](#remap)
7. [FOUC prevention](#fouc)

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

### Advanced usage  <a id='advanced'></a>

When providing a source for external script, the script tag content is ignored.

But we can use this ignored content as data carrier to elegantly send data to the included file.

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

Ok, this is nice and all, but JSON doesn't support multiline strings, what can you do if you want to send large chunks of HTML to the include file?

You can just throw string literal in the script tag by itself, and use Function constructor to parse it instead of `JSON.parse()`.

The Function constructor is a slightly safer version of `eval()`, as such should be used with restraint. In this use case though it does make sense.

```html
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
let data = new Function(`return ${document.currentScript.innerHTML.trim()}`)();
_include(`
  <article class="${data.theme}">
    ${data.html}
  </article>
`);
```

Another way to include HTML is to utilize the template tag.

Since the include is done synchronously, the corresponding script tag needs to be placed after the template tag as the DOM beyond the current script tag has not been created yet.

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
let prev = document.currentScript.previousElementSibling;
let content = prev.innerHTML;
_include(/*syntax:html*/`
    <section class="prose">
      ${content}
    </section>
`);
prev.remove();
```

I'm sure there are more methods, which one you utilize depending on the situation and your preference.

### Syntax highlighting <a id='highlight'></a>

Various editors have plugins/extensions available for template literal (multiline string) syntax highlighting (ex. [VS Code](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)), making editing HTML strings much easier.

### Using `<include-once>` tag <a id='once'></a>

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

### FOUC prevention <a id='fouc'></a>

Flash of unstyled content (FOUC) is prevented by loading HTML synchronously in a script and render-blocking manner.

This is done by directly injecting `<script>` tags with `async` set to `false` for external scripts (inline scripts are always synchronous). External stylesheets are loaded either with the attribute `blocking="render"` [(MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#blocking) which is currently supported only by Chrome, or with `document.write`.

*Limitation*: External stylesheets critical for site layout should not be inside nested includes, as `document.write` isn't allowed from `an asynchronously-loaded external script`.

### Infinite loop detection <a id='loop'></a>

By default, the include function will stop any infinite include loops (circular include reference) it detects.

If you want to apply advanced logic within an include script, and allow circular reference, then you can disable this behavior by adding the attribute `data-loop` to the script tag.

### Relative path remapping <a id='remap'></a>

Relative path remapping allows you to include the same HTML from different directory levels without breaking links to assets.

It works by detecting currentScript's `src` attribute, then parse the included HTML string and reconcile all the relative path detected based on the aforementioned `src` value.

The logic is as followed, first the HTML string is parsed into a documentFragment, and then it will try to detect relative path within the following:

 - `href`, `src` and `srcset` attributes
 - `<object>` element's `data` attribute
 - `<form>` element's `action` attribute
 - `<style>` element and `style` attributes containing `url()` (with optional single or double quotes)

By utilizing the HTML parser, paths that are part of the text (such as within code blocks) are excluded from remapping.
