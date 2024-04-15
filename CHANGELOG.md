# Change Log

All notable changes to the "inlinecsstofile" extension will be documented in this file.

## [1.0.1] - 15.04.2024

### FIXED

- Imports are not added to HTML file when in React or Angular component.

* Fixed problem with file being created even after choosing "Move to file" option

* Fixed indexer, it wasn't working properly when nesting occured.

### CHANGED

- Searching for .css files now doesn't look outside "src" folder thus ignores node_modules's .css files.

## RELEASED

- Initial release 1.0.0
