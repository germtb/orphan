#! /usr/bin/env babel-node
import orphan from './orphan';
import commandLineArgs from 'command-line-args';

const dot = process.env.PWD;
const optionDefinitions = [
  { name: 'rootDir', alias: 'r', type: String },
  { name: 'tilde', alias: 't', type: String },
  { name: 'entryFiles', alias: 'e', type: String, multiple: true },
  { name: 'uses', alias: 'u', type: String, multiple: true },
  { name: 'ignores', alias: 'i', type: String, multiple: true }
];
const options = commandLineArgs(optionDefinitions) || {};

orphan(dot, orphans => orphans.forEach(o => console.log(o)), options);
