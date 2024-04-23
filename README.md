# XSH include

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

[Documentation](https://miragecraft.com/@/page/gFGr5LUEipdjouz1)
