'use strict';

const Homey = require('homey');

class DerksenEnergy extends Homey.App {

  async onInit() {
    this.log('App has been initialized');
  }

}

module.exports = DerksenEnergy;
