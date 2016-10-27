'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = orphan;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _filewalker = require('filewalker');

var _filewalker2 = _interopRequireDefault(_filewalker);

var _micromatch = require('micromatch');

var _micromatch2 = _interopRequireDefault(_micromatch);

var _untildify = require('untildify');

var _untildify2 = _interopRequireDefault(_untildify);

var _containsPath = require('contains-path');

var _containsPath2 = _interopRequireDefault(_containsPath);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('babel-register');

var importRegex = /[import|export][\s\S]*?from.*?(['"])([.~].*?)(\1)/g;
var defaultOrphanrc = {
  rootDir: '.',
  tilde: '.',
  entryFiles: ['./index.js'],
  uses: ['**/*.js'],
  ignores: ['**/*.test.js', '**/*.spec.js', '**/*.config.js', '**/*.babel.js', 'node_modules', '.git', 'gulp']
};

function orphan(dot, onDone) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var filesGraph = {};
  var orphanFiles = [];

  // Get config
  console.log('dot:', dot);
  var orphanrcPath = _path2.default.join(dot, '.orphanrc');
  console.log('orphanrcPath:', orphanrcPath);
  var orphanrc = _fs2.default.existsSync(orphanrcPath) ? require(orphanrcPath) : defaultOrphanrc;
  console.log('orphanrc:', orphanrc);

  // Normalize config
  var rootDir = absolutify(orphanrc.rootDir, dot);
  console.log('rootDir:', rootDir);
  var tilde = absolutify(orphanrc.tilde, dot);
  console.log('tilde:', tilde);
  var entryFiles = orphanrc.entryFiles.map(function (f) {
    return absolutify(f, dot);
  });
  console.log('entryFiles:', entryFiles);
  var uses = orphanrc.uses;
  console.log('uses:', uses);
  var ignores = orphanrc.ignores;
  console.log('ignores:', ignores);

  // Build graph
  (0, _filewalker2.default)(rootDir).on('file', function (p, s) {
    var filePath = _path2.default.join(rootDir, p);

    if (ignores.some(function (i) {
      return _micromatch2.default.isMatch(filePath, i) || (0, _containsPath2.default)(filePath, i.replace('**/*', ''));
    })) {
      return;
    }

    if (!uses.some(function (x) {
      return _micromatch2.default.isMatch(filePath, x);
    })) {
      return;
    }

    filesGraph[filePath] = {
      visited: false
    };
  }).on('done', function () {
    entryFiles.forEach(function (f) {
      return visit(f, filesGraph, tilde);
    });
    for (var f in filesGraph) {
      if (!filesGraph[f].visited) {
        orphanFiles.push(f);
      }
    }
    onDone(orphanFiles);
  }).walk();
}

function absolutify(target, dir) {
  return _path2.default.resolve(dir, (0, _untildify2.default)(_path2.default.normalize(target)));
}

function importsOf(file, tilde) {
  var imports = [];
  var data = _fs2.default.readFileSync(file, 'utf8');
  var match = null;

  while ((match = importRegex.exec(data)) != null) {
    var importedFile = match[2];
    importedFile = importedFile.replace('~', tilde); // Deals with ~ being used in imports
    importedFile = _path2.default.resolve(_path2.default.dirname(file), importedFile);

    if (_fs2.default.existsSync(importedFile) && _fs2.default.lstatSync(importedFile).isDirectory()) {
      if (_fs2.default.existsSync(importedFile + '.js')) {
        importedFile += '.js';
      } else {
        importedFile += '/index.js';
      }
    }

    importedFile = _path2.default.extname(importedFile) ? importedFile : importedFile + '.js';

    imports.push(importedFile);
  }

  return imports;
}

function visit(file, filesGraph, tilde) {
  if (!filesGraph[file]) {
    console.log(file + ' does not exist or was ignored');
    return;
  }

  if (filesGraph[file].visited) {
    return;
  }

  filesGraph[file].visited = true;
  importsOf(file).forEach(function (f) {
    return visit(f, filesGraph, tilde);
  });
}

