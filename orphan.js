#! /usr/bin/env node
var fs = require('fs');
var path = require('path');
var filewalker = require('filewalker');
var commandLineArgs = require('command-line-args')
var mm = require('micromatch');
var untildify = require('untildify');

var importRegex = /[import|export][\s\S]*?from.*?(['"])([.~].*?)(\1)/g;
var files = {};

var defaultOrphanrc = {
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
    '**/*.babel.js'
  ],
  excludeFolders: [
    'node_modules',
    '.git',
    'gulp'
  ]
};

// Get config
var dot = process.env.PWD;
try {
  var orphanrc = require(path.join(dot, '.orphanrc'));
} catch(e) {
  console.log('orphanrc does not existing or it is using wrong syntax ' + process.env.PWD);
  console.log('Using default orphanrc');
  orphanrc = defaultOrphanrc;
}

var rootDir = orphanrc.rootDir
var tilde = orphanrc.tilde
var entryFiles = orphanrc.entryFiles;
var uses = orphanrc.uses;
var ignores = orphanrc.ignores;
var excludeFolders = orphanrc.excludeFolders;

// Take input overrides
var optionDefinitions = [
  { name: 'rootDir', alias: 'r', type: String },
  { name: 'tilde', alias: 't', type: String },
  { name: 'entryFiles', alias: 'e', type: String, multiple: true },
  { name: 'uses', alias: 'u', type: String, multiple: true },
  { name: 'ignores', alias: 'i', type: String, multiple: true },
  { name: 'excludeFolders', alias: 'f', type: String, multiple: true }
];

var options = commandLineArgs(optionDefinitions);

if (options.rootDir) {
  rootDir = path.resolve(dot, options.rootDir);
}
if (options.tilde) {
  tilde = path.resolve(dot, options.tilde);
}
if (options.entryFiles) {
  entryFiles = options.entryFiles;
}
if (options.uses) {
  uses = options.uses;
}
if (options.ignores) {
  ignores = options.ignores;
}
if (options.excludeFolders) {
  excludeFolders = options.excludeFolders;
}

// Normalize config
rootDir = absolutify(rootDir, dot);
tilde = absolutify(tilde, dot);
entryFiles = entryFiles.map(f => absolutify(f, dot));
excludeFolders = excludeFolders.map(f => f[f.length - 1] === '/' ? f : f + '/');
excludeFolders = excludeFolders.map(f => f[0] === '/' ? f : '/' + f);

// Build graph
filewalker(rootDir)
  .on('file', function(p, s) {
    var filePath = path.join(rootDir, p);

    for (var ignore of ignores) {
      if (mm.isMatch(filePath, ignore)) {
        return;
      }
    }

    for (var folder of excludeFolders) {
      if (filePath.includes(folder)) {
        return;
      }
    }

    if (!uses.some(x => mm.isMatch(filePath, x))) {
      return;
    }

    files[filePath] = {
      visited: false
    };
  })
  .on('done', function() {
    function visit(file) {
      if (!files[file]) {
        console.log(`${file} does not exist or was ignored`);
        return;
      }

      if (files[file].visited) {
        return;
      }

      files[file].visited = true;

      for (var importedFile of importsOf(file)) {
        visit(importedFile);
      }
    }

    for (var f of entryFiles) {
      visit(f);
    }

    for (var f in files) {
      if (!files[f].visited) {
        console.log(f);
      }
    }
  })
  .walk();

function absolutify(target, dir) {
  target = path.normalize(target);
  target = untildify(target);
  target = path.resolve(dir, target);
  return target;
}

function importsOf(file) {
  var imports = [];
  var data = fs.readFileSync(file, 'utf8');
  var match = null;

  while ((match = importRegex.exec(data)) != null ) {
    var importedFile = match[2];

    if (importedFile[0] === '~') {
      importedFile = importedFile.replace('~', tilde);
    } else {
      importedFile = path.resolve(path.dirname(file), importedFile);
    }

    if (fs.existsSync(importedFile) && fs.lstatSync(importedFile).isDirectory()) {
      if (!fs.existsSync(importedFile + '.js')) {
        importedFile += '/index.js';
      }
    }

    if (!path.extname(importedFile)) {
      importedFile += '.js';
    }

    imports.push(importedFile);
  }

  return imports;
}
