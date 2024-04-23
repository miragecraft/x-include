# X-Include

Cross-site HTML include via `<script>` tags in the manner of JSONP.

PHP includes without the server.

*Basic features:*

- Bypass CORS, usable with `file://` protocol
- Retains the synchronous programming model
- Parser-blocking for FOUC suppression

*Advanced features:*

- Preserves order-of-evaluation for nested includes during page parsing
- `data-dir` attribute allows specifying include base directory
- `link()` function to remap relative paths inside includes
- `data` and `template` variables for passing data to include files
- `<include-once>` tag allowing smarter resource management
- Detect and block infinite include loops (can be bypassed)

*The following just works, even from your local drive:*

```html
<!DOCTYPE html>
<html>
<head>
  <script src="js/x-include.js" data-dir="../includes"></script>
  <script>include('head.js', {title: "Hello World"})</script>
</head>
<body>
  <script>include('header.js')</script>
  <main>
    <h1>Lorem Ipsum</h1>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed pellentesque neque vitae varius facilisis.</p>
  </main>
  <script>include('footer.js')</script>
</body>
</html>
```
```js
// head.js
include.html(x=>`
  <title>${x.data.title}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/svg+xml" href="${x.link("../img/favicon.svg")}">
  <link rel="stylesheet" media="screen" href="${x.link("../css/style.css")}">
`)
``

[Documentation](https://miragecraft.com/@/page/gFGr5LUEipdjouz1)
