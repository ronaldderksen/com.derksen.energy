'use strict';

const Homey = require('homey');
const fetch = require('node-fetch');

class MyApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('com.derksen.enever has been initialized');
  }

}

module.exports = MyApp;
