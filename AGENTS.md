# Local Preview

Zed's Live Server extension is the local preview server for this repository.

- Do not start `server.js`, a development server, or any other local server automatically.
- Do not create a local preview process or provide a localhost URL unless the user explicitly requests it.
- Do not launch a browser, take screenshots, or perform browser-based visual checks unless the user explicitly requests them. The user verifies visual changes in Zed Live Server.
- Use lightweight static checks, such as syntax validation, by default.
