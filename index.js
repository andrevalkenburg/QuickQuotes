// Set up polyfills
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import process from 'process';
global.process = process;

// Import web-streams-polyfill
import * as webStreams from 'web-streams-polyfill';
global.ReadableStream = webStreams.ReadableStream;
global.WritableStream = webStreams.WritableStream;
global.TransformStream = webStreams.TransformStream;

// URL polyfill
import 'react-native-url-polyfill/auto';

// Now load and register the app
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
