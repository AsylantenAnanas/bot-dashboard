# Minecraft Bot Dashboard

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-v14.0.0-green.svg)
![React](https://img.shields.io/badge/react-v17.0.2-blue.svg)

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [TODO](#todo)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Introduction

**Minecraft Bot Dashboard** is a comprehensive full-stack application designed to manage Minecraft bots efficiently. This application features a React-based frontend dashboard and an Express.js backend API, enabling users to create bots that can join Minecraft servers, perform specific tasks, and integrate advanced functionalities such as ChatGPT responses and autoshop modules. Leveraging Socket.io for real-time communication, the platform provides extensive control over bot behaviors through customizable hooks.

## Features

- **User Authentication**: Secure login and session management.
- **Bot Management**: Create, start, stop, and monitor Minecraft bots.
- **Server Configuration**: Manage Minecraft server details.
- **Account Management**: Handle bot accounts with ease.
- **Real-time Updates**: Receive live updates on bot activities and player lists via Socket.io.
- **Hooks System**: Customize bot behavior by hooking into Mineflayer events.
- **Module Integration**: Enhance bots with ChatGPT responses and autoshop modules.
- **Chat and Logs**: Interact with bots through chat and export logs.
- **Proxy Viewer**: Access bot viewers directly from the dashboard.

## Tech Stack

- **Frontend**: React, React Router
- **Backend**: Express.js, Node.js
- **Database**: MySQL
- **Real-time Communication**: Socket.io
- **Minecraft Libraries**:
  - `mineflayer` for bot management and interaction
  - `mineflayer-pathfinder` for pathfinding and navigation
  - `prismarine-viewer` for Minecraft viewer integration

## Architecture

The application follows a client-server architecture:

- **Backend (Express.js)**: Handles API requests, manages bot lifecycles, interacts with the database, and serves the React frontend in production.
- **Frontend (React)**: Provides a user-friendly dashboard for managing bots, servers, accounts, and viewing real-time data.
- **Database (MySQL)**: Stores user data, accounts, server configurations, and client (bot) details.
- **Real-time Communication (Socket.io)**: Facilitates real-time updates between the server and frontend.

## Installation

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **MySQL Database**

### Clone the Repository

```bash
git clone https://github.com/AsylantenAnanas/bot-dashboard.git
cd bot-dashboard
```

### Install Backend Dependencies

```bash
npm install
```

### Install Frontend Dependencies

```bash
cd ./src/client
npm install
```

## Environment Variables

Rename the `.env.example` file in the `client` and `server` directory.

**Replace the placeholders** with your actual information.

## Running the Application

### Start the Backend Server

```bash
cd ../../
npm start
```

The server will run on `http://localhost:4000`.

### Start the Frontend Development Server

In a new terminal window:

```bash
cd ./src/client
npm start
```

The React app will run on `http://localhost:3000`.

### Build Frontend for Production

To build the React app for production:

```bash
cd ./src/client
npm run build
```

The built files will be served by the Express server.

## TODO

- In progress: Finish the server side code for the hooks
- Trying: Fix prismarine viewer proxy
- In progress: Add Bedrock support
- In progress: Add proxy to the clients
- ...

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. **Fork the Repository**:

   Click the "Fork" button at the top right of the repository page.

2. **Clone the Forked Repository**:

   ```bash
   git clone https://github.com/AsylantenAnanas/bot-dashboard.git
   cd bot-dashboard
   ```

3. **Create a New Branch**:

   ```bash
   git checkout -b feature/YourFeatureName
   ```

4. **Make Your Changes**:

   Implement your feature or fix.

5. **Commit Your Changes**:

   ```bash
   git commit -m "Add YourFeatureName"
   ```

6. **Push to the Branch**:

   ```bash
   git push origin feature/YourFeatureName
   ```

7. **Open a Pull Request**:

   Go to the original repository and click "Compare & pull request".

## License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this project as per the license terms.

## Contact

For any inquiries or support, please contact:

- **Discord**: [web.wizard](https://discord.com/users/913878824951873536)
- **GitHub**: [AsylantenAnanas](https://github.com/AsylantenAnanas)
