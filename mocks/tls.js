// Mock tls module for React Native
module.exports = {
  connect: () => null,
  TLSSocket: class TLSSocket {
    constructor() {}
    connect() {}
    on() {}
    write() {}
    end() {}
  }
}; 