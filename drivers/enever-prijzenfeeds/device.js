'use strict';

const { Device } = require('homey');
const http = require('http.min');
const cron = require('node-cron');
const luxon = require('luxon');

//const testMode = true

class MyDevice extends Device {

  async refreshToday() {
    this.log('refreshToday');
    this.log('token=', this.token);

    if (this.token) {
      const thisSave = this;
      http('https://enever.nl/api/stroomprijs_vandaag.php?token=' + this.token).then(function (result) {
        thisSave.log('Code: ' + result.response.statusCode);
        if ( result.response.statusCode == 200 ) {
          const data = JSON.parse(result.data);
          if (data.data.length == 24) {
            thisSave.stroomprijs_vandaag = data.data;
          }
          thisSave.doTrigger();
        }
      })
    }
  }

  async refreshTomorrow() {
    this.log('refreshTomorrow');
    if (this.token) {
      const thisSave = this;
      http('https://enever.nl/api/stroomprijs_morgen.php?token=' + this.token).then(function (result) {
        thisSave.log('Code: ' + result.response.statusCode);
        if ( result.response.statusCode == 200 ) {
          const data = JSON.parse(result.data);
          if (data.data.length == 24) {
            thisSave.stroomprijs_morgen = data.data;
          }
        }
      })
    }
  }

  extractElectricityPrice() {
    var ret = null;
    const key = 'prijs' + this.supplier.toUpperCase();

    if (this.stroomprijs_vandaag != null) {
      if (typeof testMode !== 'undefined') {
        if (!this.index) {
          this.index = 0;
        }
        var elm = this.stroomprijs_vandaag[this.index];
        ret = parseFloat(this.stroomprijs_vandaag[this.index][key]);
        this.log('datum=', elm.datum, 'price=' + ret, 'index=' + this.index);
        this.index = this.index + 1;
        if (this.index > 23) {
          process.exit(0);
          this.index = 0;
        }
      } else {
        const ts = luxon.DateTime.now().setZone("Europe/Amsterdam").toFormat('yyyy-MM-dd HH:00:00');
        this.log(ts);
        for (const elm of this.stroomprijs_vandaag) {
          if (elm.datum == ts) {
            if (elm[key]) {
              this.log(elm[key]);
              ret = parseFloat(elm[key]);
              break;
            }
          }
        }
      }
    }
    return ret;
  }

  currentHour() {
    return parseFloat(luxon.DateTime.now().setZone("Europe/Amsterdam").toFormat('HH'));
  }

  async doTrigger() {
    this.log('doTrigger');
    
    if (this.currentHour() === 0 && this.stroomprijs_morgen != null) {
      this.stroomprijs_vandaag = this.stroomprijs_morgen;
      this.stroomprijs_morgen = null;
    }
    this.prevElectricityPrice = this.currentElectricityPrice
    this.currentElectricityPrice = this.extractElectricityPrice();
    if (this.currentElectricityPrice) {
      this.setCapabilityValue('electricity_price', this.currentElectricityPrice).catch(this.error);
      
      this.electricityPriceLowerThanTrigger.trigger(this, { "electricity_price": this.currentElectricityPrice });
      this.electricityPriceHigherThanTrigger.trigger(this, { "electricity_price": this.currentElectricityPrice });
    }
    if (this.currentHour() > 15 && this.stroomprijs_morgen == null) {
      this.refreshTomorrow();
    }

  }

  async onInit() {
    this.log('MyDevice has been initialized');

    const thisSave = this;
    this.currentElectricityPrice = null;
    const settings = this.getSettings();
    this.token = settings.token;
    this.supplier = settings.supplier;    
    this.log('token=' + this.token + ' supplier=' + this.supplier);

    // Lower
    this.electricityPriceLowerThanTrigger = this.homey.flow.getDeviceTriggerCard('electricity_price_lower_than');

    this.electricityPriceLowerThanTrigger.registerRunListener(async (args) => {
      this.log("registerRunListener Lower");
      this.log('prevElectricityPrice',args.device.prevElectricityPrice);
      this.log('currentElectricityPrice', args.device.currentElectricityPrice);
      this.log('electricity_price', args.electricity_price);
      var ret = false;
      if (args.device.prevElectricityPrice === null && args.device.currentElectricityPrice < args.electricity_price) {
        ret = true
      } else if (args.device.prevElectricityPrice !== null && args.device.currentElectricityPrice < args.electricity_price &&
                 args.device.prevElectricityPrice >= args.electricity_price) {
        ret = true;
      }
      if (ret) {
        thisSave.log('electricityPriceLowerThanTrigger TRUE');
      }
      return ret;
    });

    // Higher
    this.electricityPriceHigherThanTrigger = this.homey.flow.getDeviceTriggerCard('electricity_price_higher_than');

    this.electricityPriceHigherThanTrigger.registerRunListener(async (args) => {
      this.log("registerRunListener Higher");
      this.log('prevElectricityPrice',args.device.prevElectricityPrice);
      this.log('currentElectricityPrice', args.device.currentElectricityPrice);
      this.log('electricity_price', args.electricity_price);
      var ret = false;
      if (args.device.prevElectricityPrice === null && args.device.currentElectricityPrice > args.electricity_price) {
        ret = true
      } else if (args.device.prevElectricityPrice !== null && args.device.currentElectricityPrice > args.electricity_price &&
                 args.device.prevElectricityPrice <= args.electricity_price) {
        ret = true;
      }
      if (ret) {
        this.log('electricityPriceHigherThanTrigger TRUE');
      }
      return ret;
    });

    this.refreshToday();

    if (typeof testMode !== 'undefined') {
      const interval = setInterval(function() {
        thisSave.log('setInterval executed');
        thisSave.doTrigger();
      }, 1000);
    } else {
      cron.schedule('0 * * * *', async () => {
        thisSave.log('Schedule executed');
        thisSave.doTrigger();
      });  
    }

  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('MyDevice settings where changed');

    this.token = newSettings.token;
    this.supplier = newSettings.supplier;
    this.log('token=' + this.token + ' supplier=' + this.supplier);

    this.refreshToday();
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MyDevice has been deleted');
  }

}

module.exports = MyDevice;
