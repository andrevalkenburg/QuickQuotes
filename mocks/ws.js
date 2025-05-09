// Mock WebSocket implementation for React Native
const { EventEmitter } = require('events');

class WebSocket extends EventEmitter {
  constructor(url, protocols) {
    super();
    this.url = url;
    this.protocols = protocols;
    this.readyState = 0;
  }

  send(data) {
    // No-op implementation
  }

  close() {
    // No-op implementation
  }
}

module.exports = WebSocket;
module.exports.WebSocket = WebSocket; 