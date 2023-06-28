'use strict';

const Homey = require('homey');
const http = require('http.min');
const cron = require('node-cron');
const luxon = require('luxon');

//const testMode = true

class DerksenEnergy extends Homey.App {

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
    var currentElectricityPrice = this.extractElectricityPrice();
    if (currentElectricityPrice) {
      this.electricityPriceLowerThanTrigger.trigger( { "electricity_price": currentElectricityPrice, "prev_price": this.prevElectricityPrice },
                                               { 'electricity_price': currentElectricityPrice, "prev_price": this.prevElectricityPrice } );

      this.electricityPriceHigherThanTrigger.trigger( { "electricity_price": currentElectricityPrice, "prev_price": this.prevElectricityPrice },
                                                { 'electricity_price': currentElectricityPrice, "prev_price": this.prevElectricityPrice } );

      this.prevElectricityPrice = currentElectricityPrice
    }
    if (this.currentHour() > 15 && this.stroomprijs_morgen == null) {
      this.refreshTomorrow();
    }
  }

  async onInit() {
    this.log('App has been initialized');

    const thisSave = this;
    this. prevElectricityPrice = null;
    this.stroomprijs_vandaag = null;
    this.stroomprijs_morgen = null;
    this.token = this.homey.settings.get('token');
    this.supplier = this.homey.settings.get('supplier');

    this.refreshToday();

    this.homey.settings.on("set", (key) => {
      this.log('setting.on set ' + key);
      if (key === 'token') {
        this.token = this.homey.settings.get('token');
      } else if (key === 'supplier') {
        this.supplier = this.homey.settings.get('supplier');
      }
      this.refreshToday();
    })

    // Lower
    this.electricityPriceLowerThanTrigger = this.homey.flow.getTriggerCard('electricity_price_lower_than');

    this.electricityPriceLowerThanTrigger.on("update", () => {
      this.log("electricityPriceLowerThanTrigger update");
      this.electricityPriceLowerThanTrigger.getArgumentValues().then((args) => {
        thisSave.log(args);
      });
    });

    this.electricityPriceLowerThanTrigger.registerRunListener(async (args, state) => {
      this.log("registerRunListener");
      thisSave.log('args',args);
      thisSave.log('state',state);
      var ret = false;
      if (state.prev_price === null && state.electricity_price < args.electricity_price) {
        ret = true
      } else if (state.prev_price !== null && state.electricity_price < args.electricity_price && state.prev_price >= args.electricity_price) {
        ret = true;
      }
      if (ret) {
        thisSave.log('electricityPriceLowerThanTrigger TRUE args=',args,'state=',state);
      }
      return ret;
    });

    // Higher
    this.electricityPriceHigherThanTrigger = this.homey.flow.getTriggerCard('electricity_price_higher_than');

    this.electricityPriceHigherThanTrigger.on("update", () => {
      this.log("electricityPriceHigherThanTrigger update");
      this.electricityPriceHigherThanTrigger.getArgumentValues().then((args) => {
        thisSave.log(args);
      });
    });

    this.electricityPriceHigherThanTrigger.registerRunListener(async (args, state) => {
      this.log("registerRunListener");
      thisSave.log('args',args);
      thisSave.log('state',state);
      var ret = false;
      if (state.prev_price === null && state.electricity_price > args.electricity_price) {
        ret = true
      } else if (state.prev_price !== null && state.electricity_price > args.electricity_price && state.prev_price <= args.electricity_price) {
        ret = true;
      }
      if (ret) {
        thisSave.log('electricityPriceHigherThanTrigger TRUE args=',args,'state=',state);
      }
      return ret;
    });

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

}

module.exports = DerksenEnergy;
