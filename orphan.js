#! /usr/bin/env babel-node
import fs from 'fs';
import path from 'path';
import filewalker from 'filewalker';
import commandLineArgs from 'command-line-args';
import mm from 'micromatch';
import untildify from 'untildify';

const filesGraph = {};
const importRegex = /[import|export][\s\S]*?from.*?(['"])([.~].*?)(\1)/g;
const defaultOrphanrc = {
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
const dot = process.env.PWD;
const orphanrcPath = path.join(dot, '.orphanrc');
const orphanrc = fs.existsSync(orphanrcPath) ? require(orphanrcPath) : defaultOrphanrc;

// Take input
const optionDefinitions = [
  { name: 'rootDir', alias: 'r', type: String },
  { name: 'tilde', alias: 't', type: String },
  { name: 'entryFiles', alias: 'e', type: String, multiple: true },
  { name: 'uses', alias: 'u', type: String, multiple: true },
  { name: 'ignores', alias: 'i', type: String, multiple: true },
  { name: 'excludeFolders', alias: 'f', type: String, multiple: true }
];
const options = commandLineArgs(optionDefinitions);

// Normalize config
const rootDir = absolutify(options.rootDir ? options.rootDir : orphanrc.rootDir, dot);
const tilde = absolutify(options.tilde ? options.tilde : orphanrc.tilde, dot);
const entryFiles = (options.entryFiles ? options.entryFiles : orphanrc.entryFiles).map(f => absolutify(f, dot));
const uses = options.uses ? options.uses : orphanrc.uses;
const ignores = options.ignores ? options.ignores : orphanrc.ignores;
const excludeFolders = (options.excludeFolders ? options.excludeFolders : orphanrc.excludeFolders)
  .map(f => f[f.length - 1] === '/' ? f : f + '/')
  .map(f => f[0] === '/' ? f : '/' + f);

// Build graph
filewalker(rootDir)
  .on('file', (p, s) => {
    const filePath = path.join(rootDir, p);

    if (ignores.some(i => mm.isMatch(filePath, i))) {
      return;
    }

    if (excludeFolders.some(f => filePath.includes(f))) {
      return;
    }

    if (!uses.some(x => mm.isMatch(filePath, x))) {
      return;
    }

    filesGraph[filePath] = {
      visited: false
    };
  })
  .on('done', () => {
    entryFiles.forEach(f => visit(f));
    for (const f in filesGraph) {
      if (!filesGraph[f].visited) {
        console.log(f);
      }
    }
  })
  .walk();

function absolutify(target, dir) {
  return path.resolve(dir, untildify(path.normalize(target)));
}

function importsOf(file) {
  const imports = [];
  const data = fs.readFileSync(file, 'utf8');
  let match = null;

  while ((match = importRegex.exec(data)) != null ) {
    let importedFile = match[2];
    importedFile = importedFile.replace('~', tilde); // Deals with ~ being used in imports
    importedFile = path.resolve(path.dirname(file), importedFile);

    if (fs.existsSync(importedFile) && fs.lstatSync(importedFile).isDirectory()) {
      if (fs.existsSync(importedFile + '.js')) {
        importedFile += '.js';
      } else {
        importedFile += '/index.js';
      }
    }

    importedFile = path.extname(importedFile) ? importedFile : importedFile + '.js';

    imports.push(importedFile);
  }

  return imports;
}

function visit(file) {
  if (!filesGraph[file]) {
    console.log(`${file} does not exist or was ignored`);
    return;
  }

  if (filesGraph[file].visited) {
    return;
  }

  filesGraph[file].visited = true;
  importsOf(file).forEach(f => visit(f));
}
