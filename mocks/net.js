// Mock net module for React Native
module.exports = {
  createConnection: () => null,
  Socket: class Socket {
    constructor() {}
    connect() {}
    on() {}
    write() {}
    end() {}
  }
}; 