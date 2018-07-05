'use strict';
const dateFormat = require('dateformat');
const path = require('path');
const fs = require('fs');

module.exports = function(logDir, logNames){

    var logs={};

    logNames.forEach(function(logName){
        logs[logName] = {path: path.join(logDir, logName +'-'+ dateFormat(Date.now(),'yyyy-mm-dd') + '.log')};
    });

    return {

        writeLine: function(logName, textLine){
            textLine += '\n';
            var _logFilePath = logs[logName].path;
            fs.appendFile(_logFilePath, textLine, (err) => {
                if (err) console.error(`writeToLog() file:${_logFilePath}`, err);
            });
        }

    };

};