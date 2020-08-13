const fs = require('fs');
const path = require('path');
const { compile, parse } = require('svelte/compiler');

const extensions = ['.svelte', '.html'];
let compileOptions = {};

function capitalise(name) {
  return name[0].toUpperCase() + name.slice(1);
}

function register(options = {}) {
  if (options.extensions) {
    extensions.forEach(deregisterExtension);
    options.extensions.forEach(registerExtension);
  }

  compileOptions = Object.assign({}, options);
  delete compileOptions.extensions;
}

function deregisterExtension(extension) {
  delete require.extensions[extension];
}

function registerExtension(extension) {
  require.extensions[extension] = function (module, filename) {
    const name = path
      .parse(filename)
      .name.replace(/^\d/, '_$&')
      .replace(/[^a-zA-Z0-9_$]/g, '');

    const options = Object.assign({}, compileOptions, {
      filename,
      name: capitalise(name),
      generate: 'ssr',
      format: 'cjs',
    });

    let raw = fs.readFileSync(filename, 'utf-8');

    // const parsedAst = parse(raw, { filename });
    // console.log(parsedAst);

    const replacements = [
      [/(isDev)/gim, () => process.env.NODE_ENV === 'production' || true],
      [
        /<([a-zA-Z]+)\s+hydrate-client={([^]*?})}/gim,
        (match) => `<div class="needs-hydration" data-component="${match[1]}"  data-data={JSON.stringify(${match[2]})}`,
      ],
    ];

    for (const replacement of replacements) {
      const matches = raw.matchAll(replacement[0]);

      for (const match of matches) {
        raw = raw.replace(match[0], replacement[1](match));
      }
    }

    const { js, warnings } = compile(raw, options);

    if (options.dev) {
      warnings.forEach((warning) => {
        console.warn(`\nSvelte Warning in ${warning.filename}:`);
        console.warn(warning.message);
        console.warn(warning.frame);
      });
    }

    return module._compile(js.code, filename);
  };
}

registerExtension('.svelte');
registerExtension('.html');

module.exports = register;
