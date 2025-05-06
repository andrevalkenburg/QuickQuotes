# QuickQuote Dashboard

A mobile dashboard for plumbers/tradesmen to manage their quotes. Built with React Native, Expo, and NativeWind.

## About

This is a front-end only implementation of a dashboard screen for a plumbing app called QuickQuote. The dashboard allows tradesmen to manage their quotes across different stages: Draft, Sent, Accepted, Scheduled Work, and Complete.

## Features

- Tab navigation between 5 different quote statuses
- "New Quote" button in the Draft section to add a new quote
- "Send Final Quote" button in the Scheduled Work section
- "Download Invoice" button in the Complete section
- Tailwind-style styling via NativeWind

## File Structure

- `App.js` - Main entry file that renders the DashboardScreen
- `screens/DashboardScreen.js` - The main dashboard with the 5 tabs
- `components/QuoteCard.js` - Reusable card component for quote items
- `components/TabSelector.js` - UI to switch between the five sections

## How to Run

1. Make sure you have Expo CLI installed: `npm install -g expo-cli`
2. Install dependencies: `npm install`
3. Start the Expo development server: `npx expo start`
4. Scan the QR code with the Expo Go app on your phone, or run on an emulator

## Notes

This is a front-end only implementation. All button actions are currently simulated with `console.log()` statements and mock data is used instead of a backend connection. 