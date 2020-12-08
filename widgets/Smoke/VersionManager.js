define(['jimu/shared/BaseVersionManager'], function (BaseVersionManager) {
  function VersionManager() {
    this.versions = [{
      version: '1.0',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '1.1',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '1.2',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '1.3',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '1.4',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '2.0Beta',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '2.0',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '2.0.1',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '2.1',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '2.2',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '2.3',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '2.4',
      upgrader: function upgrader(oldConfig) {
        var newConfig = oldConfig;
        newConfig.timeFormat = "auto";

        return newConfig;
      }
    }, {
      version: '2.5',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '2.6',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '2.7',
      upgrader: function upgrader(oldConfig) {
        return oldConfig;
      }
    }, {
      version: '2.8',
      upgrader: function upgrader(oldConfig) {
        var newConfig = oldConfig;
        newConfig.autoPlay = true;
        //newConfig.playback = false;

        return newConfig;
      }
    }];
  }

  VersionManager.prototype = new BaseVersionManager();
  VersionManager.prototype.constructor = VersionManager;
  return VersionManager;
});
