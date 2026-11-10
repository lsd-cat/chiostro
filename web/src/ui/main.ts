// Entry point: the shell boots, then the module for the app the path names runs.
import {app} from './shell.js';
await import(`./apps/${app}.js`);
