'use strict';

const { Driver } = require('homey');

class EneverPrijzenfeeds extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Enever prijzenfeeds Driver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return [
      // Example device data, note that `store` is optional
      {
        name: 'Enever prijzenfeeds',
        data: {
          id: 'enever-prijzenfeeds',
        },
      },
    ];
  }

}

module.exports = EneverPrijzenfeeds;
