# БорИскра — Welding Work Tracker

A mobile-first React Native (Expo) app for tracking welding production work, built with Firebase Realtime Database for live sync across all devices.

## Stack

- **Frontend**: Expo (React Native) with Expo Router v6 (file-based routing)
- **Backend**: Express.js (landing page + API server on port 5000)
- **Database**: Firebase Realtime Database (real-time sync)
- **State**: React Context + Firebase listeners
- **Fonts**: Rubik (Google Fonts via @expo-google-fonts/rubik)
- **Animations**: react-native-reanimated
- **Keyboard**: react-native-keyboard-controller

## App Structure

```
app/
  _layout.tsx         # Root layout: fonts, providers, auth redirect
  index.tsx           # Login screen (name entry + role selection)
  (tabs)/
    _layout.tsx       # Tab bar (NativeTabs on iOS 26+, Tabs fallback)
    records.tsx       # Records tab: add/view/edit/delete welding records
    chat.tsx          # Chat tab: real-time team messaging
    products.tsx      # Products tab: manage product list

context/
  AppContext.tsx      # Firebase init, user auth state, products subscription

constants/
  colors.ts           # Dark theme with orange accent (#F97316)
```

## Firebase Config

- Project: iskra-ppm
- Database URL: https://iskra-ppm-default-rtdb.europe-west1.firebasedatabase.app
- Collections: `records`, `products`, `chat`

## User Roles

- **Сварщик (Welder)**: Can add, view, edit/delete own records; view chat/products
- **Руководитель (Manager)**: PIN `1234`; full access including delete any record, manage products

## Running

- Frontend: `npm run expo:dev` (port 8081)
- Backend: `npm run server:dev` (port 5000)
