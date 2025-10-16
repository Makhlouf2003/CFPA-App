# CFPA Application Backend

Welcome to the CFPA Application Backend. This document provides all the necessary information to set up and run the backend server locally.

## Table of Contents

1.  [Prerequisites](#prerequisites)
2.  [Database Setup](#database-setup)
3.  [Project Installation](#project-installation)
4.  [Running the Server](#running-the-server)
5.  [API Documentation](#api-documentation)

---

## Prerequisites

Before you begin, make sure you have the following software installed on your machine:

- **Node.js**: This is a JavaScript runtime environment. You can download it from [nodejs.org](https://nodejs.org/).
- **XAMPP**: This is a free and open-source cross-platform web server solution stack package developed by Apache Friends, consisting mainly of the Apache HTTP Server, MariaDB database, and interpreters for scripts written in the PHP and Perl programming languages. You can download it from [apachefriends.org](https://www.apachefriends.org/index.html).

---

## Database Setup

The application uses a MySQL database to store all its data. We will use **XAMPP** with **phpMyAdmin** to set up the database.

### Step 1: Start XAMPP

1.  Open the **XAMPP Control Panel**.
2.  Start the **Apache** and **MySQL** modules.

### Step 2: Create the Database

1.  Open your web browser and navigate to `http://localhost/phpmyadmin/`.
2.  Click on the **New** button in the left sidebar.
3.  Enter a database name (e.g., `cfpa_db`) and click **Create**.

### Step 3: Import the Database Schema

1.  Select the database you just created from the left sidebar.
2.  Click on the **Import** tab at the top of the page.
3.  Click on **Choose File** and select the `src/cfpa_schema.sql` file from this project.
4.  Scroll down and click the **Go** button to import the schema. This will create all the necessary tables for the application.

### Step 4: Configure the Database Connection

1.  In the root directory of the project, in the file named `.env`.
2.  Copy the contents of the `.env.example` file into your `.env` file.
3.  Update the values in the `.env` file to match your local database configuration:

    ```
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=
    DB_NAME=cfpa_db
    ```

---

## Project Installation

1.  Open your terminal or command prompt.
2.  Navigate to the root directory of the project (`/server`).
3.  Run the following command to install all the required dependencies:

    ```bash
    npm install
    ```

---

## Running the Server

Once the installation is complete, you can start the backend server.

1.  In your terminal, from the project's root directory, run the following command:

    ```bash
    npm run dev
    ```

2.  If everything is set up correctly, you should see a message indicating that the server is running, for example:

    ```
    Server is running on port 8080.
    ```

The backend is now running and ready to accept requests from the frontend application.

---

## API Documentation

To help you understand and test the available API endpoints, we have created a detailed API documentation file.

- **File Location**: `APIDocs.md`

This file contains information on all the available routes, including:

- The HTTP method (POST, GET, PUT, DELETE)
- The required request headers (like `x-access-token` for authentication)
- The expected request body (for POST and PUT requests)
- Example responses for success and error cases

Please refer to this document to understand how to interact with the backend API.
