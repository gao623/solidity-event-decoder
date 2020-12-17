// const { default: Web3 } = require('web3');
const Web3 = require('web3');

class Decoder {
  constructor(abi) {
    this.abi = abi;
    this.web3 = new Web3();
    this.keywords = ['byte', 'int'];
    this.hash = this.web3.utils.keccak256; // ALIAS is => this.web3.utils.sha3;
    this.knownEvents = this._parseAbiEvent();
  }

  _parseAbiEvent() {
    let knownEvents = {};
    this.abi.forEach(item => {
      if (item.type === "event") {
        let argvType = item.inputs.map(one => one.type);
        var eventString = this._makeFuncString(item.name, ...argvType);
        var eventSignature = this.hash(eventString);
        knownEvents[eventSignature] = {
          eventString: eventString,
          abiEntry: item
        },
        knownEvents[item.name] = knownEvents[eventSignature];
      }
    });
    return knownEvents;
  }
  _makeFuncString(func, ...argv) {
    if (argv.length) {
      return `${func}(${argv.join(",")})`
    }
    return `${func}()`
  }
  decodeSimple(event, data, topics) {
    let theEvent = this.abi.filter(item => item.type === "event" && item.name === event)[0];
    if (!theEvent) {
      throw new Error(`Not found the EVENT: ${theEvent}`);
    }

    return this.web3.eth.abi.decodeLog(theEvent.inputs, data, topics.slice(1));
  }
  decode(topics, data, options) {
    options = Object.assign({}, options);
    if (options.event) {
      if (!this.knownEvents[options.event]) {
        throw new Error(`Not found the EVENT: ${options.event}`);
      }
      if (topics[0]) {
        let hashEvent = this.hash(this.knownEvents[options.event].eventString);
        if (topics[0] !== hashEvent) {
          throw new Error(`Invalid EVENT topics: ${topics[0]}`);
        }
      }
      return this.web3.eth.abi.decodeLog(this.knownEvents[options.event].abiEntry.inputs, data, topics.slice(1));
    }

    if (!this.knownEvents[topics[0]]) {
      throw new Error(`Invalid EVENT hash: ${topics[0]}`);
    }
    console.log("funcString:", this.knownEvents[topics[0]].eventString, this.hash(this.knownEvents[topics[0]].eventString))
    return this.web3.eth.abi.decodeLog(this.knownEvents[topics[0]].abiEntry.inputs, data, topics.slice(1));
  }

}

module.exports = Decoder;
