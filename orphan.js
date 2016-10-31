// Copyright 2016 FanDuel, Inc.

'use babel';

import fs from 'fs';
import path from 'path';
import filewalker from 'filewalker';
import mm from 'micromatch';
import untildify from 'untildify';
import contains from 'contains-path';

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
    '**/*.babel.js',
    'node_modules',
    '.git',
    'gulp',
    'dist'
  ]
};

export default function orphan(dot, onDone, options = {}) {
  const filesGraph = {};
  const orphanFiles = [];

  // Get config
  const orphanrcPath = path.join(dot, '.orphanrc');
  const orphanrc = fs.existsSync(orphanrcPath) ? require(orphanrcPath) : defaultOrphanrc;

  // Normalize config
  const rootDir = absolutify(options.rootDir ? options.rootDir : orphanrc.rootDir, dot);
  const tilde = absolutify(options.tilde ? options.tilde : orphanrc.tilde, dot);
  const entryFiles = (options.entryFiles ? options.entryFiles : orphanrc.entryFiles).map(f => absolutify(f, dot));
  const uses = options.uses ? options.uses : orphanrc.uses;
  const ignores = options.ignores ? options.ignores : orphanrc.ignores;

  // Build graph
  filewalker(rootDir)
    .on('file', (p, s) => {
      const filePath = path.join(rootDir, p);

      if (ignores.some(i => mm.isMatch(filePath, i) || contains(filePath, i.replace('**/*', '')))) {
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
      entryFiles.forEach(f => visit(f, filesGraph, tilde));
      for (const f in filesGraph) {
        if (!filesGraph[f].visited) {
          orphanFiles.push(f);
        }
      }
      onDone(orphanFiles);
    })
    .walk();
}

function absolutify(target, dir) {
  return path.resolve(dir, untildify(path.normalize(target)));
}

function importsOf(file, tilde) {
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

function visit(file, filesGraph, tilde) {
  if (!filesGraph[file]) {
    console.log(`${file} does not exist or was ignored`);
    return;
  }

  if (filesGraph[file].visited) {
    return;
  }

  filesGraph[file].visited = true;
  importsOf(file, tilde).forEach(f => visit(f, filesGraph, tilde));
}
