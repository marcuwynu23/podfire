# Dockly Agent

Connects to the web app via **WebSocket** and registers as a deploy agent. The app sends deploy jobs to connected agents; the agent runs clone, build, push, and stack deploy and streams logs/status back. No database required in the agent.

## Setup

1. **Point to the web app**
   ```env
   APP_URL=http://localhost:3000
   ```
   The agent connects to `ws://localhost:3000/ws/agent` and registers.

2. **Optional**
   - `AGENT_NAME` — display name when registered (default: dockly-agent)
   - `DOCKER_REGISTRY` — leave unset for local images only

3. **Install**
   ```bash
   npm install
   ```

## Run

```bash
npm start
```

Or `npm run dev` (same). Keep the agent running. When you click **Deploy** in the web app, the app sends the job to a connected agent. The agent must be running and registered before you can deploy.
