<div align="center">
  <h1> PodFire </h1>
</div>

<p align="center">
  <img src="https://img.shields.io/github/stars/marcuwynu23/podfire.svg" alt="Stars Badge"/>
  <img src="https://img.shields.io/github/forks/marcuwynu23/podfire.svg" alt="Forks Badge"/>
  <img src="https://img.shields.io/github/issues/marcuwynu23/podfire.svg" alt="Issues Badge"/>
  <img src="https://img.shields.io/github/license/marcuwynu23/podfire.svg" alt="License Badge"/>
</p>

**PodFire** is an open-source Platform-as-a-Service (PaaS) that deploys GitHub repositories as Dockerized applications. It provides a web dashboard, live logs, and automated deploy agents for easy self-hosting and management of services.

---

## Features

* **Dashboard** — Manage services, trigger deployments, and view logs.
* **Deploy Agents** — Automatically deploy repositories as Docker stacks.
* **Service Management** — Define services from GitHub repos with optional environment variables and configuration.
* **Live Logs** — Monitor deployments and service status in real-time.
* **Automated Deploys** — Optionally enable auto-deploy on new commits.

---

## Project Structure

```
podfire/
├── app/       # Web dashboard and management interface
├── agent/     # Deploy agents handling deployments
├── README.md  # Project documentation
├── DEVELOP_GUIDE.md  # Development and setup instructions
└── .gitignore
```

---

## Prerequisites

* **Docker** and **Docker Swarm** initialized.
* Network configuration for deployed services.

---

## Quick Start

1. Set up the dashboard and configure environment variables.
2. Run deploy agents to connect with the dashboard.
3. Link a GitHub repository, define a service, and deploy.
4. Monitor deployments and service status from the dashboard.

For detailed setup and troubleshooting, see **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)**.

---

## License

[LICENSE](./LICENSE)

