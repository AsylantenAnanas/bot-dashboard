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
- [API Endpoints](#api-endpoints)
- [Frontend](#frontend)
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
- **Other Libraries**:
  - `express-session` for session management
  - `cors` for Cross-Origin Resource Sharing
  - `http-proxy-middleware` for proxying requests
  - `dotenv` for environment variable management

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
cd server
npm install
```

### Install Frontend Dependencies

```bash
cd ../client
npm install
```

## Environment Variables

Rename the `.env.example` file in the `client` and `server` directory.

**Replace the placeholders** with your actual information.

## Running the Application

### Start the Backend Server

```bash
cd server
npm start
```

The server will run on `http://localhost:4000`.

### Start the Frontend Development Server

In a new terminal window:

```bash
cd client
npm start
```

The React app will run on `http://localhost:3000`.

### Build Frontend for Production

To build the React app for production:

```bash
cd client
npm run build
```

The built files will be served by the Express server.

## API Endpoints

### Authentication

- **POST** `/api/login`: Authenticate user with username and password.
- **POST** `/api/logout`: Logout the current user.

### Accounts

- **GET** `/api/accounts`: Retrieve all accounts for the logged-in user.
- **POST** `/api/accounts`: Create a new account.
- **POST** `/api/accounts/:id`: Update an existing account.
- **POST** `/api/accounts/:id/delete`: Delete an account.

### Servers

- **GET** `/api/servers`: Retrieve all server configurations.
- **POST** `/api/servers`: Create a new server configuration.
- **POST** `/api/servers/:id`: Update a server configuration.
- **POST** `/api/servers/:id/delete`: Delete a server configuration.

### Clients (Bots)

- **GET** `/api/clients`: Retrieve all clients (bots) for the logged-in user.
- **POST** `/api/clients`: Create a new client (bot).
- **POST** `/api/clients/:clientId`: Update a client.
- **GET** `/api/clients/:clientId`: Retrieve details of a specific client.
- **POST** `/api/clients/:clientId/delete`: Delete a client.
- **POST** `/api/clients/:clientId/start`: Start a bot.
- **POST** `/api/clients/:clientId/stop`: Stop a bot.
- **POST** `/api/clients/:clientId/rejoin`: Rejoin a bot.
- **POST** `/api/clients/:clientId/chat`: Send a chat message to a bot.
- **GET** `/api/clients/:clientId/messages`: Retrieve chat messages from a bot.
- **GET** `/api/clients/:clientId/export`: Export chat logs.
- **GET** `/api/clients/:clientId/players`: Retrieve the list of players on the server.
- **GET** `/api/clients/:clientId/playerAmount`: Retrieve the number of players on the server.
- **POST** `/api/clients/:clientId/hooks`: Set hooks for a client.
- **GET** `/api/clients/:clientId/hooks`: Get hooks for a client.

### Hooks

- **GET** `/api/hooks/events`: Retrieve available hook events.
- **GET** `/api/hooks/types`: Retrieve available hook types.

### Export Logs

- **GET** `/api/exportAllLogs`: Download logs for all clients.

## Frontend

The frontend is built with React and utilizes React Router for client-side routing. The main entry point is `client/src/App.js`, which defines the routes for the application:

- `/` and `/login`: **Login Page**
- `/dashboard`: **Dashboard Page**
- `/accounts`: **Accounts Management Page**
- `/servers`: **Servers Management Page**
- `/clients`: **Clients (Bots) Management Page**
- `/clients/:clientId`: **Client Details Page**

### Main Frontend Files

- **App.js**: Defines the main routes of the application.
- **Pages**: Located in `client/src/pages/`, each page corresponds to a specific route.
  - `LoginPage.js`
  - `DashboardPage.js`
  - `AccountsPage.js`
  - `ServersPage.js`
  - `ClientsPage.js`
  - `ClientDetailsPage.js`

## TODO

- Finish the server side code for the hooks
- Fix prismarine viewer proxy
- Add some structure to the server files
- Add Bedrock support
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

- **Discord**: web.wizard
- **GitHub**: [AsylantenAnanas](https://github.com/AsylantenAnanas)
