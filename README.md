# orphan

Find orphan (unimported) files in your project! Like that! isn't it nice?

Just `cd` to the root folder of your application and run `orphan`. There is a sensitive bunch of default parameters which you can override via cli or with a config file called `.orphanrc` (also located at the root folder of your  application). Here is an example of an `.orphanrc` (which also happens to be the default config):

```javascript
module.exports = {
  rootDir: '.',
  tilde: '.',
  entryFiles: [
    './index.js'
  ],
  uses: [
    '**/*.js'
  ],
  ignores: [
    '**/*.test.js',
    '**/*.spec.js',
    '**/*.config.js',
    '**/*.babel.js',
    'node_modules',
    '.git',
    'gulp',
    'dist'
  ]

}
```

In case you are not familiar with it, `tilde` refers to the path used by `babel-plugin-require-root-rewrite`, so it's an optional parameter.

You can also use the following arguments to override `.orphanrc` and the default config:

| arg        | long         | short | type           |
|------------|--------------|-------|----------------|
| rootDir    | --rootDir    | -r    | String         |
| tilde      | --tilde      | -t    | String         |
| entryFiles | --entryFiles | -e    | Array<String>  |
| uses       | --uses       | -u    | Array<String>  |
| ignores    | --ignores    | -i    | Array<Strings> |

For example, to also use css files you could use:
```bash
orphan -u '**/*/js' '**/*/css'
```

