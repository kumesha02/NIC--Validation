# NIC Validation System

A complete National Identity Card (NIC) Validation System for Sri Lanka using React (Frontend) and Node.js (Backend) with Microservices Architecture and MySQL database.

## Project Overview

This system validates Sri Lankan National Identity Card numbers according to both old format (9 digits + V/X) and new format (12 digits). It provides functionality for single NIC validation as well as batch processing through CSV file uploads.

## Architecture

The project follows a microservices architecture:

### Backend Services

- **API Gateway** (Port 8080): Main entry point for all client requests
- **Auth Service** (Port 8081): Handles authentication and JWT management
- **NIC Validation Service** (Port 8082): Core NIC validation logic
- **File Processing Service** (Port 8083): CSV file handling and batch processing
- **Dashboard Service** (Port 8084): Analytics and metrics
- **Report Service** (Port 8085): PDF/CSV/Excel report generation

### Frontend

- React 18 SPA styled with Tailwind CSS
- Recharts for interactive visualisations
- React Router DOM v6 for routing
- Formik + Yup for form handling and validation
- React Hot Toast for notifications

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- MySQL (v8+)
- Docker and Docker Compose (optional)

### Environment Variables

- Copy `backend/.env.example` to `backend/.env` and adjust credentials (database, JWT secret, email provider, etc.).
- Copy `frontend/.env.example` to `frontend/.env` and adjust `VITE_API_URL` if required.

### Local Development

```bash
# Backend (from project root)
cd backend
npm run install-all     # installs dependencies for every microservice
npm run start-all       # runs all services with concurrently

# Frontend (separate terminal)
cd frontend
npm install
npm run dev             # launches the web app at http://localhost:3000
```

The API gateway exposes all endpoints under `http://localhost:8080/api`.

### Docker Compose

```bash
cd backend
docker-compose up --build
```

This command provisions MySQL, all microservices, the API gateway, and the Vite dev server. The application becomes available at:

- Frontend: http://localhost:3000
- API Gateway: http://localhost:8080/api

## Features

- User authentication and authorization
- Single NIC validation
- Batch validation via CSV upload (up to 4 files simultaneously)
- Detailed validation results with age, gender, and birthday extraction
- Dashboard with statistics and visualizations
- Report generation in PDF, CSV, and Excel formats
- Token revocation on logout with JWT blacklist validation
- File management (list, delete) and paginated record browsing with search/sort
- Downloadable reports and NIC record exports in CSV format

## NIC Validation Rules

### Old Format (9 digits + V/X)
- Example: 923456789V or 923456789X
- First 2 digits: Year (92 = 1992 or 1892 depending on century logic)
- Next 3 digits: Day of year (001-366 for males, 501-866 for females)
- Last 4 digits: Serial number
- Last character: V or X

### New Format (12 digits)
- Example: 199212345678
- First 4 digits: Full year (1992)
- Next 3 digits: Day of year (001-366 for males, 501-866 for females)
- Last 5 digits: Serial number
