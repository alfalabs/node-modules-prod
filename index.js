'use strict'; /*! alfalabs.net (c)2018 */
const fs = require('fs-extra');
const path = require('path');
const mm = require('micromatch');
const ignoreArr = require('./ignore');
const walkDirsSync = require('./walk-dirs-sync');
const log2file = require('./log-2-file');


/**
 * 
 * @param {*} sourceRoot - development folder where original node_modules with symlinks are
 * @param {*} destinationRoot - build folder 
 * @param {*} dirName - name of folder to copy from sourceRoot to destinationRoot
 * @param {*} options {
 *                  quiet: do not show progress in console, progress shows only folder names
 *                  noDevDependencies: do not copy devDependencies as per package.json
 *                  useNpmignore
 *                  noIgnoreList
 *                  packageDir - OPTIONAL, dir name for package.json when not in dev root
 *                  logIgnored - show ignored items in console (magenta - ignored by condition, cyan - ignored by .npmignore)
 *                  logToFile
 *             }
 * @param {*} cb for gulp task
 */
module.exports = function(sourceRoot, destinationRoot, options, cb){

    options = Object.assign({ // set default values
            quiet: true,
            noDevDependencies: true, 
            useNpmignore: true,
            packageDir:''
        }, options); 
    var dirName ='node_modules';
    var symLinkCount=0;

    var devDependencies;
    var packagePath = path.join(process.cwd(), options.packageDir, 'package.json'); 
    if (options.noDevDependencies) {
        devDependencies = require(packagePath).devDependencies; 
    }
    console.log(`[node-modules-prod] processing '${path.join(sourceRoot,dirName)}'  ${devDependencies ? '' : 'devDependencies not found'}`);  // ${packagePath}

    devDependencies = devDependencies || {};

   
    // // prevent overwriting existing symlink folders:
    // 
    // if (fs.existsSync(path.join(destinationRoot, sourceRoot, dirName))) {
    //     var msg=`destination folder already exists: '${path.join(destinationRoot, dirName)}' symlinks are unpredictable.`;
    //     console.log('\x1b[31m ERROR:');
    //     console.error(msg); 
    //     console.log('\x1b[0m');
    //     throw (msg);
    // }
    var ignoreLst = ignoreListSplit(ignoreArr);
   
    var logF;
    if(options.logToFile){logF = log2file('./LOGS', ['copied', 'excluded-byCondition', 'excluded-byNpmignore']);}

    var walkDirCallbacks = {

        /** condition to match for each directory item, file or subdirectory */
        condition: function(dirItemPath, opts){

            // // global
            // if(Array.isArray(options.globalIgnore) && options.globalIgnore.includes(opts.dirItem)) {prntIgnored(); return false;}

            // ignore.js list
            if (!options.noIgnoreList){
                var ignore = opts.stat.isDirectory() ? ignoreLst.dirs : ignoreLst.files;
                if(mm.isMatch(opts.dirItem, ignore, {nocase:true})) {prntIgnored(); return false;}
            }
            // devDependencies
            if (!options.noDevDependencies) return true;
            if (opts.stat.isDirectory()){
                var dirItemName = path.parse(dirItemPath).name;
                if (devDependencies[dirItemName]) {prntIgnored(); return false;}  // do not include devDependencies
            }
            return true;

            function prntIgnored(){
                if(options.logIgnored) console.log(`\x1b[35m ${dirItemPath}  <- \x1b[0m`);
                //if(options.logToFile) logF.writeLine('excluded', dirItemPath);
            }
        },

        onCondition: function(dirItemPath, opts){
            // do not copy folders, this will not allow to use npmignore in each folder
            // instead copy each file and filter it against npmignore

            if (!opts.stat.isDirectory()){
                
                var dirItemName = path.parse(dirItemPath).name;
                var _source = dirItemPath;
                var dest = path.join(destinationRoot, dirItemPath);
                //if(!options.quiet) console.log(_source, ' -> ', dest); // log every file
                if(options.logToFile) logF.writeLine('copied', _source, ' -> ', dest);
              
                try{
                    fs.copySync(_source, dest, {dereference: true}); // copy and dereference -break symbolic link
                } catch(err){console.error('copySync', err);}
            } else {
                var c='', a='->';
                if (opts.lstat.isSymbolicLink()) {c='\x1b[34m'; a='=>'; symLinkCount++;}
                var msg = `${dirItemPath}  ${a}  ${path.join(destinationRoot, dirItemPath)}`;
                if(!options.quiet) 
                    console.log(`${c} ${msg} \x1b[0m`); // log only dirs
                if(options.logToFile) logF.writeLine('copied', msg);
            }
        },

        getDirIgnore: function(dirItemPath){
            if (!options.useNpmignore) return null;

            var npmIgnore;
            try {
                var fd = path.join(dirItemPath, '.npmignore');
                npmIgnore = fs.readFileSync(fd, 'utf8');
            } catch(err){}
            if (npmIgnore){
                npmIgnore = npmIgnore.replace(/,/g, '');
                npmIgnore = npmIgnore.replace(/(?:\r\n|\r|\n)/g, ',');
                npmIgnore = npmIgnore.split(',');
            }
            return npmIgnore; // returns Array or falsy
        },

        log: function(){
            // var args = [].slice.call(arguments);
            var dirItemPath = arguments[0];
            var type = arguments[1];
            if(options.logToFile){
                switch (type){
                    case 'in': break;
                    case 'out-byCondition': logF.writeLine('excluded-byCondition', dirItemPath); break;
                    case 'out-byNpmignore': logF.writeLine('excluded-byNpmignore', dirItemPath); break;
                    // default: 
                }
            }
            if(options.logIgnored && type==='out-byNpmignore') console.log(`\x1b[36m ${dirItemPath}  <- \x1b[0m`); 
        }
    };
    var root = path.join(sourceRoot, dirName);

    var count = walkDirsSync(root, walkDirCallbacks, {makeArr:false, useNpmignore: options.useNpmignore});

    console.log('--------------------------------------------------------');
    console.log(`processed ${count.in} items,  excluded ${count.out},  symlinks ${symLinkCount}`);
    console.log('--------------------------------------------------------');
    
    cb();


    /** helpers */

    function ignoreListSplit(lst){

        var ignore = {files:[], dirs:[]};

        lst.forEach(function(item){
            if (item.endsWith('/')) ignore.dirs.push(item.slice(0, -1));
            else ignore.files.push(item);
        });
        return ignore;
    }
};