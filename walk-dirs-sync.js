'use strict';  /*! alfalabs.net (c)2018.7.4 */
const fs = require('fs-extra');
const path = require('path');
const mm = require('micromatch');

module.exports = walkDirsSync;

/** walk directory recursively finding only files or folders matching condition
 *  and runs function onCondition to operate on a file or dir matching conditon
 * 
 * @param {String} rootDir - start folder
 * @param {Object} callbacks { 
 *                      condition(stat, lstat, dirItem) - REQUIRED function defining the condition criteria
 *                          examples:
 *                          condition: function(stat, lstat, dirItem){
                                return true; // all files and dirs
                                return stat.isDirectory(); // all dirs
                                return !stat.isDirectory() && dirItem.endsWith('.js'); // all javascript files
                                return stat.isDirectory() && lstat.isSymbolicLink(); // all dirs that are symlinks
                            },
 *                      onCondition(dirItem, _opts) - OPTIONAL function, do something with the dirItem
 *                      getDirIgnore(dirItemPath) reads file containing ignore list in the folder (like .npmignore) and returns array
 *                      log(dirItemPath, type)
 *                  }
 * @param {Object} opts - {
 *                      makeArr: default true,  block folder array creation to save memory when only onCondition is needed
 *                      recursive: default true,
 *                  } 
 * 
 * for internal recursive use:
 * @param {} dirsArr - for internal recursive use
 * @param {} count - pass object by reference
 * @param {} ignoreList - pass ignoreList from parent folder
 * 
 * @returns {Array} array of folders matching condition or if makeArr:false, number of items matching condition
 */
function walkDirsSync(rootDir, callbacks, opts, dirsArr, count, ignoreList){

    if (!dirsArr) dirsArr = [];
    count = count || {in: 0, out:0}; // count has to be an object to be passed by reference recursively
    opts = Object.assign({makeArr:true, recursive:true}, opts); // set default values

    var dirs =  fs.readdirSync(rootDir);
    dirs.forEach(function(dirItem){
       
        var dirItemPath = path.join(rootDir, dirItem);

        if (!isIgnored(ignoreList, dirItem)){

            var stat = fs.statSync(dirItemPath);
            var lstat = fs.lstatSync(dirItemPath);

            var ok = callbacks.condition(dirItemPath, {dirItem, stat, lstat} );
            if (ok) {
                // 1. run callback
                runOnCondition(dirItemPath, {stat, lstat});
                // 2. process subfolders
                if (stat.isDirectory() && opts.recursive) {
                    var dirIgnore = typeof callbacks.getDirIgnore==='function' ? callbacks.getDirIgnore(dirItemPath) : null;
                    walkDirsSync(dirItemPath, callbacks, opts, dirsArr, count, dirIgnore);
                }
                // 3. log
                log(dirItemPath, 'in');
            } else {
                count.out++; 
                log(dirItemPath, 'out-byCondition');} // ignored by condition
        } else {
            count.out++; 
            log(dirItemPath, 'out-byNpmignore'); // ignored by npmignore
        }
    });

    return opts.makeArr ? dirsArr : count; // EXIT -- >


    function isIgnored(ignoreList, dirItem){
        if (!ignoreList) return false;
        return mm.isMatch(dirItem, ignoreList);
        //return ignoreList.includes(dirItem);
    }

    function runOnCondition(dirItemPath, _opts){
        count.in++;
        if(opts.makeArr) dirsArr.push(dirItemPath);
        if(typeof callbacks.onCondition==='function') callbacks.onCondition(dirItemPath, _opts);
    }

    function log(){
        if (typeof callbacks.log==='function') callbacks.log.apply(this, arguments);
    }
}