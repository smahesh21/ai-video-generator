// Loaded only by the local render worker before Remotion and its dependencies.
// Keep console-only child tools from opening transient windows on Windows.
if (process.platform === 'win32') {
  const childProcess = require('node:child_process');
  const {syncBuiltinESMExports} = require('node:module');
  const spawn = childProcess.spawn;
  const exec = childProcess.exec;

  childProcess.spawn = function hiddenSpawn(file, args, options) {
    if (Array.isArray(args)) return spawn.call(this, file, args, {...options, windowsHide: true});
    return spawn.call(this, file, {...(options ?? args), windowsHide: true});
  };
  childProcess.exec = function hiddenExec(command, options, callback) {
    if (typeof options === 'function') return exec.call(this, command, {windowsHide: true}, options);
    return exec.call(this, command, {...options, windowsHide: true}, callback);
  };
  syncBuiltinESMExports();
}
