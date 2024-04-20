# HTML include

Cross site, synchronous HTML include via the `<script>` tag in the manner of JSONP.

*Basic features:*

- Bypass CORS, usable with `file://` protocol
- Synchronous
- Parser-blocking

*Advanced features:*

- `data-dir` attribute allows specifying include base directory
- `link()` function to remap relative paths inside includes
- `data` and `template` variables for passing data to include files
- `<include-once>` tag allowing smarter resource management
- Detect and block infinite include loops (can be bypassed)

## Table of Contents

1. [Intended use cases](#intended)
2. [Basic usage and data passing](#basic)
3. [Passing HTML via `<template>`](#template)
4. [`<include-once>` tag](#once)
5. [Infinite loop detection](#loop)
6. [Async and defer for included scripts](#async)8. [FOUC prevention](#fouc)
7. [Syntax Highlighting](#highlight)
8. [Tips and tricks](#tricks)

## Intended use cases<a id='intended'></a>

Ideal for creating complex HTML documents, such as documentations, that can be viewed from local storage without using a static site generator.

It can also be used for apps, but CORS restriction means the use cases are limited.

## Basic usage and data passing<a id='basic'></a>

Include files are loaded using via the `include()` function inside an inline script tag.

It accepts the URL of the include file, relative to the data-dir (include folder location), and an optional data object used to pass data to the included file.

This data object will be passed via `JSON.stringify()` so functions need to be passed via the `<template>` method instead.

Data-dir is set either in the `data-dir` attribute of the script tag that loads the `include.js` library , or can be hard coded in the `include.js` file itself.

```html
<!DOCTYPE html>
<html>
<head>
  <!-- initialize and define the relative path (from the include.js) to the include folder -->
  <script src="js/include.js" data-dir="../includes"></script>
  <!-- include file, optionally pass an object as the second argument -->
  <script>include('head.js', {title: "Hello World"})</script>
</head>
<body>
  <main>
    <article>
      <h1>Lorem Ipsum</h1>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed pellentesque neque vitae varius facilisis.</p>
      <p>Morbi ut urna bibendum, molestie lectus et, cursus dui. Aliquam erat volutpat. Ut nec mi id tortor fermentum scelerisque. Suspendisse congue porta libero, a elementum mauris ullamcorper et.</p>
    </article>
  </main>
</body>
</html>
```

The `include.html()` function is used inside the include file to print HTML to the page.

You can either pass a string, or a function with 3 helpers available - `link`, `data` and `template`.

`link` and `data` are demonstrated below:

```js
// head.js
// the link() function takes a path relative to the include file, and maps it to the host HTML file
include.html(x=>`
  <title>${x.data.title}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/svg+xml" href="${x.link("../img/favicon.svg")}">
  <link rel="stylesheet" media="screen" href="${x.link("../css/style.css")}">
`)
```

Alternatively, with destructuring parameters

```js
include.html(({link, data})=>`
  <title>${data.title}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/svg+xml" href="${link("../img/favicon.svg")}">
  <link rel="stylesheet" media="screen" href="${link("../css/style.css")}">
`)
```

Note that JavaScript inside the include file will run before those in the included HTML in the same file.

## Passing HTML via `<template>` <a id='template'></a>

This method utilizes the `<template>` tag, you must place the template right before the include script.

The advantage of this method is that you do not need to escape unsafe characters.

Example shown below:

```html
<template>
  <h1>Title</h1>
  <span>Subtitle</div>
  <p>Praesent nec magna gravida, maximus purus eget, lobortis neque.</p>
  <p>Nulla consectetur auctor turpis, id interdum libero placerat ac. Aliquam ullamcorper, justo sit amet vestibulum imperdiet, lorem ligula pulvinar velit, in dapibus ligula ipsum a enim.</p>
</template>
<script>include('prose.js')</script>
```

```js
// prose.js
include.html(({template})=>`
  <section class="prose">
    ${template.innerHTML}
  </section>
`);
```

## `<include-once>` tag <a id='once'></a>

In order to prevent resources and unique content from being included multiple times, a `<include-once>` custom element is provided with optional `title` attribute.

### Include once within the same script file

When used by itself without an `id`, the content of the `<include-once>` element will only be rendered once for the same include file.

This apples to multiple occurrences within the file itself, as well as multiple includes targeting the file.

```js
// duplicate.js
include.html(`
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

### Include once everywhere

By providing an unique `id`, the content of the `<include-once>` element is associated with the ID provided, this allows you to include only one copy of the content across multiple include files, and lets you use multiple `<include-once>` elements, with different IDs, within the same include file.

```js
// duplicate1.js
include.html(`
  <include-once id="lorem-ipsum">
    <p>Unique</p>
  </include-once>
  <p>One</p>
`)
// duplicate2.js
include.html(`
  <include-once id="lorem-ipsum">
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

## Infinite loop detection <a id='loop'></a>

By default, the include function will stop any infinite include loops (circular include reference) it detects.

If you want to apply advanced logic within an include script, and allow circular reference, then you can disable this behavior by adding the attribute `data-loop` to the script tag.

## Async and defer for included scripts <a id='async'></a>

As all dynamically inserted script tags are async by default, the include function automatically change async to false.

However, if you are including a script tag with `async` attribute, it will be left alone.

Therefore, included scripts will behave exactly like how they would if they exists on the host page natively, and both `async` and `defer` attributes work as you expect.

## FOUC prevention <a id='fouc'></a>

Flash of unstyled content (FOUC) is prevented by loading HTML synchronously in a script and render-blocking manner.

This is done by directly injecting `<script>` tags with `async` set to `false` for external scripts (inline scripts are always synchronous). External stylesheets are loaded either with the attribute `blocking="render"` [(MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#blocking) which is currently supported only by Chrome, or with `document.write`.

*Limitation*:

External stylesheets critical for site layout should not be inside nested includes, as `document.write` isn't allowed from `an asynchronously-loaded external script`.

Yes, the include function flips the async property to false, but the browser doesn't care and still consider them to be asynchronously-loaded.

## Syntax highlighting <a id='highlight'></a>

Various editors have plugins/extensions available for template literal (multiline string) syntax highlighting (ex. [VS Code](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)), making editing HTML strings much easier.

## Tips and tricks <a id='tricks'></a>

Calculate the correct path to the `include.js` file using `window.location.href`.

```html
<script>
  let root='root_folder';
  let src="js/include.js"
  let dir="../includes";

  let d=document, s=d.createElement('script');
  s.dataset.dir=dir;
  s.src='../'.repeat(window.location.href.split('/').reverse().indexOf(root)-1)+src;
  d.write(s.outerHTML);
  d.currentScript.remove();
</script>
```

Pro
- No need to update src URL when moving directory level

Con
- More Verbose
- Need to do project wide find and replace when root folder name changes
