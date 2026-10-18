# Naming

## Booleans

A boolean's name says it is a yes-or-no question: start it with `is`, `has`, `can`, `should`, `include` or a similar verb, and say what is true. This applies to variables, parameters, options, signals, computed values and functions that return a boolean.

| Not this        | But this                                            |
| --------------- | --------------------------------------------------- |
| `nsfw`          | `isNsfw` (the piece is NSFW)                        |
| `nsfw` (option) | `includeNsfw` (the request should return NSFW rows) |
| `on`            | `isOn`                                              |
| `loadingMore`   | `isLoadingMore`                                     |
| `failed`        | `hasFailed`                                         |
| `showImage`     | `isImageShown` (`showImage()` reads like an action) |
| `noindex`       | `isHiddenFromSearch`                                |
| `loaded(el)`    | `isLoaded(el)`                                      |

Pick the prefix that matches the meaning: `includeNsfw` asks for NSFW rows, while `isNsfw` would claim the request itself is NSFW.

Stored Firestore fields and the data endpoints' JSON (`Image.nsfw`, `published`, `ImageFile.animated`, `transparent`) keep their names: renaming them means migrating data. Don't add new unprefixed boolean fields there either.
