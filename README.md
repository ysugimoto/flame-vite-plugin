# flame-vite-plugin

This is vite frontend tool plugin for [flame](https://github.com/ysugimoto/flame).
Generate individual manifest file for the CodeIgniter that aims to sync backend and frontend assets.

## Installation

You can install via npm registry.

```shell
npm install -D flame-vite-plugin
```

## Setup

After the installation, import and use this plugin with configuration in `vite.config.js`.

```js
import { defineConfig } from 'vite'
import flame from 'flame-vite-plugin'

export default defineConfig({
  plugins: [
    flame({
        input: 'src/main.js'
    })
  ]
})
```

And then you can generate manifest by running `vite` command.

## Configuration

The `flame-vite-plugin` accepts some configuration object.

| Key | Type                                | Required | Default             | Descirption                                     |
|:---:|:-----------------------------------:|:--------:|:-------------------:|:------------------------------------------------|
| input | string or Array<string> or Object | Yes      | -                   | Input files to transform and list to manifest   |
| keepViteManifest | boolean                | No       | false               | Keep vite's manifest like `.vite/manifest.json` |
| manifestPath     | string                 | No       | config.build.ourDir | Save path of flame manifest file                |

Here is the full configurations.

```js
import { defineConfig } from 'vite'
import flame from 'flame-vite-plugin'

export default defineConfig({
  plugins: [
    flame({
        input: [
            'src/main.js',
            'src/index.css',
            'src/index.js',
        ],
        keepViteManifest: false,
        manifestPath: '../public',
    }),
  ]
})
```

## Alias

On the backend side (CodeIgniter), asset file will be loaded via `input` configration value like:

```php
<?php echo flame("src/main.js");?>
```

But it's annoying the specify the filename like `src/main.js`, so you can declare an alias for the input path.

```js
import { defineConfig } from 'vite'
import flame from 'flame-vite-plugin'

export default defineConfig({
  plugins: [
    flame({
        input: {
            'src/main.js': 'main',
            'src/index.css': 'css',
            'src/index.js': 'index',
        },
        keepViteManifest: false,
        manifestPath: '../public',
    }),
  ]
})
```

The `input` option can accept an Object - key is filepath and value is alias - and the backend could specify by alias value with `@` prefix:

```php
<?php echo flame("@main");?>
```

Then the [flame](https://github.com/ysugimoto/flame) will resolve `@main` with `src/main.js`.
It's useful for developing backend without taking care of asset filename, just manage as the alias name.

## Contribution

- Fork this repository
- Customize / Fix problem
- Send PR :-)
- Or feel free to create issues for us. We'll look into it

## Author

Yoshiaki Sugimoto <sugimoto@wnotes.net>

## License

MIT
