# Selfbot - self bot for discord

## Install

```bash
npm install
```

## Run

```bash
npm run start
```

## How to use

Create gateway class with token and debug(optional)

```javascript
import Gateway from "./gateway";

const gateway = new Gateway("-token-", true); //debug mode is enabled
```

Receive events via "on" parameter

```javascript
gatway.on("MESSAGE_CREATE", () => {
  //TODO
});
```

Receive when opening gateway via "onopen" parameter

```javascript
gatway.onopen(() => {
  //TODO
});
```
