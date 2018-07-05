# node-modules-prod
### prepare `node_modules` for production, convert symlinks, remove clutter

## install
`npm i node-modules-prod --save-dev`
## why
`node_modules` packages contain a lot of clutter, test folders, examples, documentation etc. Production site will never use them.  
Small files containing just a few lines like .gitignore or .npmignore are taking a  whloe allocation unit on a disk, that's why a 10Mb node_modules  folder by size, may take 18Mb of disk space.  
Local packages are stored as symbolic links in `node_modules` - great for development, but `npm install` on PROD  will leave them as symbolic links, which will be broken once pushed to server. 

This utility will:
- convert symlink folders to actual folders
- strip unneeded files and folders to bare minimum (`Raspberry Pi` friendly)
- ignore packages listed as devDependencies 
## gulp use example
```javascript
const copyNodeModules = require('node-modules-prod');

var dest = 'BUILD';

gulp.task('copy-node-modules', function(cb){

    copyNodeModules(
        './',        // sourceRoot relative to DEV root
        dest,        // destinationRoot relative to DEV root
        {},          // use default options
        cb           // callback for gulp task
    );
});
```
### default options
```javascript
quiet: true             // do not show progress in console, (progress shows only folder names)
logIgnored: false       // do not show ignored items in console (in magenta color)
noDevDependencies: true,// do not copy devDependencies (as per package.json)
useNpmignore: true,     // use npmignore file in each folder to exclude files
noIgnoreList: false,    // use ignore.js list
packageDir:'',          // dir name for package.json when not in dev root
logToFile: false        // for debugging, logfiles are created in LOG/ folder
 ```
### NOTE:
The `node-modules-prod` only copies  existing folders form DEV `node_modules` to BUILD folder.  
1. Run `npm install` in DEV, to make sure that all your dependencies in `node_modules` are in working order for target operating system!
2. Make sure not to change default options to exclude unneeded folders and files from copying:
```javascript
noDevDependencies: true, // do not copy devDependencies (form package.json)
useNpmignore: true,      // use npmignore file in each folder to exclude files
```
3. If symlinks are in `package.json`, do NOT run `npm install` in BUILD folder!
4. The `node-modules-prod` aggresively excludes unneeded files saving a lot of space. Excluded files can be listed in console (color cyan- excluded by npmignore, magenta - other than npmignore) with `<-` mark, by using `logIgnored:true` option. Exclusion list is in [ignore.js](https://github.com/alfalabs/node-modules-prod/blob/master/ignore.js) file. Readme and License files are excluded too. Check licensing requirements for each package.

## when `node_modules` and `package.json` is in a subfolder of dev root folder
- do NOT append that subfolderName to `dest`
- add `options.packageDir=subfolderName` to tell where to look for `package.json` otherwise devDependencies exclusion will not work.
```javascript
const copyNodeModules = require('node-modules-prod');
var dest = 'BUILD';

gulp.task('copy-npm-modules', function(cb){

    copyNodeModules(
        './subfolderName',              // sourceRoot relative to DEV root
        dest,                           // destinationRoot relative to DEV root
        'node_modules',                 // dirName
        {                               // options:
            packageDir: 'subfolderName';// tell that package.json is in this subfolder
        }, 
        cb                              // callback for gulp task
    );
});
```
## console
copying progress is shown in console  with options `{quiet:false}` only folders are shown. (there are too many files to show) Additionally option `{logIgnored: true}` will show ignored files.
```javascript
source -> destionation      // default color 
ignored <-                  // magenta {logIgnored:true}
symbolicLink => folder      // blue
```
## debugging your build

use option `{logToFile: true}` to create file logs for copying operation. Folder `LOG/` must exist in DEV root prior to running the task. Separate log files for excluded items will be created, for: 
- `excluded-byCondition` excluded because item is listed in `devDependencies` or in `ignore.js` list 
- `excluded-byNpmignore` excluded because items match `.npmignore` patterns.   
File `.npmignore` in some module may contain patterns that are not correctly interpreted by  [micromatch](https://www.npmjs.com/package/micromatch)

## aboul symbolic links
To check if you have symbolic links in node_modules, look for little link arrows on the folder icon in file explorer:  
<img src="symlinks.png">  



## related: bower_components
to remove unneeded files and folders from `bower_components` try [bower-purge](https://www.npmjs.com/package/bower-purge).   
[Polymer 2](https://www.polymer-project.org/2.0/docs/devguide/feature-overview) components are great! Don't bother with Polymer 3 (for C!# or C--).
## requirements
NodeJS v8 and gulp v3 (tested on Win7)
