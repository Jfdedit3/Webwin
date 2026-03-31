# Webwin Hub

Webwin Hub is a Windows desktop application hub built with Electron.

## What it does

- Curated catalog of open-source Windows applications
- Search by name, publisher, tags, and category
- Category filters
- Project details side panel
- Direct download flow tracked inside the app
- External links for project website and repository
- Windows installer build with electron-builder

## Run locally

```bash
npm install
npm run start
```

## Build for Windows

```bash
npm install
npm run build
```

The generated installer is created in the `release` folder.

## Main files

```text
main.js
preload.js
src/
  renderer/
    index.html
    styles.css
    app.js
    apps-data.js
```
