# Dynamic electricity price

### This homey app is still in testing. Do not rely on correct behaviour yet.

There are  2 triggers:
1. electricity price lower than:
2. electricity price higher than:

Every hour the electricity prices are checked and a trigger is triggered when a condition is met. If the the trigger is still met the next hour, no new trigger is triggered. During app start triggers are tested and triggered.
Each trigger returns a 'token' containing the current electricity price.

## Installation

Please read https://apps.developer.homey.app/ to get started with homey app development before trying out this app.

```
git clone https://github.com/ronaldderksen/com.derksen.energy.git
cd com.derksen.energy
npm install
homey app install
```

## Enever prijzenfeeds
This app uses the Enever prijzenfeeds, see https://enever.nl/prijzenfeeds/ You need to register for a token.
During app startup 1 call is done and after that 1 call each day. So this app is doing its best to stay within the requests limits. But no guarantee, use at your own risk.

## Example
[![Flow](https://flow-api.athom.com/api/flow/O-RFdA/image)](https://homey.app/f/O-RFdA/)
