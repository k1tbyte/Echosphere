# Echosphere

A modern video streaming platform with real-time group watching capabilities, built with cutting-edge technologies.

## Features

- 🎥 High-quality video streaming with HLS support
- 👥 Real-time group watching sessions
- 🖼️ Automatic video thumbnail generation
- 🔄 Advanced video processing pipeline
- 📦 MinIO integration for efficient storage
- 🎯 Automatic codec detection
- ⚡ Progressive video loading
- 🌙 Dark theme by default
- 🔒 Secure authentication system

## Tech Stack

### Backend
- ASP.NET Core 9.0
- SignalR for real-time communication
- PostgreSQL with Entity Framework Core 9.0
- MinIO for object storage
- FFmpeg (Xabe.FFmpeg) for video processing
- JWT Authentication
- AutoMapper for object mapping
- Swagger/OpenAPI for API documentation

### Frontend
- Next.js 15.3.2
- React 19.1.0
- TypeScript 5
- Tailwind CSS 4
- Bun package manager
- Radix UI components
- HLS.js for video playback
- Plyr for video player
- Zustand for state management
- SWR for data fetching
- NextAuth.js for authentication

## Prerequisites

- Docker and Docker Compose
- Git

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/k1tbyte/Echosphere.git
cd Echosphere
```

2. Configure environment variables:
   - Copy `Backend/.env.example` to `Backend/.env.production`
   - Copy `Frontend/.env.example` to `Frontend/.env.production`
   - Update the environment variables as needed

3. Start the application:
```bash
docker compose up
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- MinIO Console: http://localhost:9001

## Development

### Backend
- Built with ASP.NET Core 9.0
- Uses Entity Framework Core for database operations
- Implements SignalR for real-time features
- Handles video processing and streaming
- JWT-based authentication
- Swagger/OpenAPI documentation

### Frontend
- Modern Next.js 15.3.2 application
- React 19.1.0 with TypeScript
- Tailwind CSS 4 for styling
- Dark theme by default
- Responsive design
- Real-time updates with SignalR
- Video playback with HLS.js and Plyr

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 