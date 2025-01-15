# Bot-Dashboard

**Express-React Application with Socket.io Integration**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-14.17.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-17.0.2-blue.svg)

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Server Setup](#server-setup)
  - [Client Setup](#client-setup)
- [Running the Application](#running-the-application)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Introduction

Welcome to the **Bot-Dashboard with Socket.io Integration**! This project is a full-stack web application built with an Express.js backend and a React frontend. It leverages Socket.io for real-time communication, enabling dynamic interactions between the server and clients. The application includes user authentication, account management, server and client handling, and real-time updates.

## Features

- **User Authentication**: Secure login and logout functionality with session management.
- **Account Management**: Create, update, and delete user accounts.
- **Server Configuration**: Manage server settings, including hostname, version, and NPC configurations.
- **Client Management**: Handle client bots with functionalities to start, stop, and rejoin bots.
- **Real-Time Communication**: Utilize Socket.io for real-time updates on terminal messages and player statuses.
- **Hooks Integration**: Add and manage hooks for client bots.
- **Export Logs**: Download chat logs and export all client logs as HTML files.
- **Admin Dashboard**: Comprehensive admin panel for managing categories, items, shops, clans, guides, and more.
- **Responsive Frontend**: User-friendly interface built with React and Ant Design components.

## Technologies Used

- **Backend**:
  - [Express.js](https://expressjs.com/)
  - [Socket.io](https://socket.io/)
  - [MySQL](https://www.mysql.com/)
  - [Express-Session](https://www.npmjs.com/package/express-session)
  - [HTTP-Proxy-Middleware](https://github.com/chimurai/http-proxy-middleware)
  - [Cors](https://www.npmjs.com/package/cors)

- **Frontend**:
  - [React](https://reactjs.org/)
  - [React Router](https://reactrouter.com/)
  - [Ant Design](https://ant.design/)
  - [Axios](https://axios-http.com/)

## Project Structure

```
project-root/
├── client/
│   ├── build/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.jsx
│   └── package.json
├── server/
│   ├── db/
│   ├── hooksConfig.js
│   ├── botManager.js
│   ├── helper.js
│   ├── server.js
│   └── package.json
├── .env
├── README.md
└── package.json
```

- **client/**: Contains the React frontend application.
- **server/**: Contains the Express.js backend application.
- **.env**: Environment variables for configuration.
- **README.md**: Project documentation.

## Installation

### Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/en/) (v14 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [MySQL](https://www.mysql.com/) Database

### Server Setup

1. **Navigate to the server directory**:

   ```bash
   cd server
   ```

2. **Install server dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment Variables**:

   Create a `.env` file in the `server/` directory and add the following:

   ```env
   PORT=4000
   DB_HOST=your_db_host
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   SESSION_SECRET=your_session_secret
   ```

4. **Set Up the Database**:

   - Create a MySQL database using the name specified in `DB_NAME`.
   - Import or create the necessary tables (`users`, `accounts`, `servers`, `clients`, etc.) as per your application requirements.

### Client Setup

1. **Navigate to the client directory**:

   ```bash
   cd client
   ```

2. **Install client dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment Variables**:

   Update the a `axiosInstance.js` file in the `client/api/` directory to include your correct api endpoint

## Running the Application

### Start the Server

1. **Navigate to the server directory**:

   ```bash
   cd server
   ```

2. **Start the server**:

   ```bash
   npm start
   ```

   The server will run on [http://localhost:4000](http://localhost:4000).

### Start the Client

1. **Open a new terminal and navigate to the client directory**:

   ```bash
   cd client
   ```

2. **Start the React application**:

   ```bash
   npm start
   ```

   The React app will run on [http://localhost:3000](http://localhost:3000).

### Build for Production

To build the React frontend for production:

```bash
cd client
npm run build
```

This will create a `build/` directory with optimized production files, which are served by the Express.js backend.

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a new branch**

   ```bash
   git checkout -b feature/YourFeature
   ```

3. **Commit your changes**

   ```bash
   git commit -m "Add your feature"
   ```

4. **Push to the branch**

   ```bash
   git push origin feature/YourFeature
   ```

5. **Open a Pull Request**

Please ensure your code follows the project's coding standards and includes relevant tests.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For any questions or suggestions, please contact [web.wizard](https://discord.com/users/279936883277168640) on Discord.

---

*Happy Coding!*
