(function () {
  'use strict';

  var DEVICE = {
    ID: {
      VENDOR : 0x2123,
      PRODUCT: 0x1010
    },

    CMD: {
      UP   : 0x02,
      DOWN : 0x01,
      LEFT : 0x04,
      RIGHT: 0x08,
      FIRE : 0x10,
      STOP : 0x20,
      RESET: 'd2000,l8000'
    },

    MISSILES: {
      NUMBER         : 4,
      RELOAD_DELAY_MS: 4500
    }
  };

  var _ = require('underscore'), usb = require('node-usb/usb.js');

  var launcher = usb.find_by_vid_and_pid(DEVICE.ID.VENDOR, DEVICE.ID.PRODUCT)[0];

  if (!launcher) {
    throw 'Launcher not found - make sure your Thunder Missile Launcher is plugged in to a USB port';
  }

  var launcherInterface = launcher.interfaces[0];
  if (launcherInterface.isKernelDriverActive()) {
    launcherInterface.detachKernelDriver();
  }
  launcherInterface.claim();
  process.on('exit', launcherInterface.release);

  function execute(cmd, duration, callback) {
    launcher.controlTransfer(0x21, 0x09, 0x0, 0x0, new Buffer([0x02, cmd, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
      function (data) {
        if (!_.isNumber(duration)) {
          return;
        }
        if (!_.isFunction(callback) && cmd !== DEVICE.CMD.STOP) {
          callback = controller.stop;
        }
        if (_.isFunction(callback)) {
          _.delay(callback, duration);
        }
      }
    );
  }

  function trigger(callback, p1, p2) {
    return function () {
      callback.call(this, p1, p2);
    };
  }

  var controller = {};

  controller.u = controller.up = function (duration, callback) {
    execute(DEVICE.CMD.UP, duration, callback);
  };

  controller.d = controller.down = function (duration, callback) {
    execute(DEVICE.CMD.DOWN, duration, callback);
  };

  controller.l = controller.left = function (duration, callback) {
    execute(DEVICE.CMD.LEFT, duration, callback);
  };

  controller.r = controller.right = function (duration, callback) {
    execute(DEVICE.CMD.RIGHT, duration, callback);
  };

  controller.s = controller.stop = function (callback) {
    execute(DEVICE.CMD.STOP, 0, callback);
  };

  controller.f = controller.fire = function (number, callback) {
    number = _.isNumber(number) && number >= 0 && number <= DEVICE.MISSILES.NUMBER ? number : 1;
    if (number === 0) {
      controller.stop(callback);
    } else {
      execute(DEVICE.CMD.FIRE, DEVICE.MISSILES.RELOAD_DELAY_MS, trigger(controller.fire, number - 1, callback));
    }
  };

  controller.e = controller.execute = function (commands, callback) {
    if (_.isString(commands)) {
      controller.execute(commands.split(','), callback);
    } else if (commands.length === 0) {
      controller.stop(callback);
    } else {
      var command = commands.shift();
      var number = command.length > 1 ? parseInt(command.substring(1), 10) : null;
      // todo - handle z and s
      controller[command[0]].call(this, number, trigger(controller.execute, commands, callback));
    }
  };

  controller.z = controller.reset = function (callback) {
    controller.execute(DEVICE.CMD.RESET, callback);
  };

  module.exports = controller;
})();
