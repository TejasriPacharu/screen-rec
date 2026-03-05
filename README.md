# Screen Recorder MVP

A full-stack screen recording application with video trimming, cloud storage, and sharing capabilities.

## Features

- **Screen Recording**: Record screen + microphone using MediaRecorder API
- **Video Trimming**: Client-side video editing with FFmpeg.wasm
- **Cloud Storage**: Upload to S3-compatible storage (Backblaze B2)
- **Share Links**: Generate public/private shareable video links
- **Analytics**: Track view counts and basic video metrics
- **Authentication**: JWT-based user system

## Tech Stack

### Frontend
- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **FFmpeg.wasm** for video processing
- **MediaRecorder API** for screen capture

### Backend
- **Express.js** with TypeScript
- **MongoDB** with Mongoose ODM
- **AWS SDK** for S3-compatible storage
- **JWT** for authentication
- **bcrypt** for password hashing

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- MongoDB (local or cloud)
- S3-compatible storage (AWS S3, Backblaze B2, etc.)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   
   Create `.env` file in the backend directory:
   ```env
   # Database
   MONGO_CONN_STR=mongodb://localhost:27017/screen-recorder
   
   # JWT
   JWT_SECRET=your-secure-jwt-secret-key-here
   
   # Server
   PORT=8989
   
   # S3 Storage (example with Backblaze B2)
   S3_ENDPOINT=https://s3.us-east-005.backblazeb2.com
   S3_KEY_ID=your-s3-key-id
   S3_APP_KEY=your-s3-secret-key
   S3_BUCKET=your-bucket-name
   S3_REGION=us-east-005
   S3_CORS_ALLOWED_ORIGINS=http://localhost:3000
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   Server will run on `http://localhost:8989`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   
   Create `.env.local` file in the frontend directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8989
   NEXT_PUBLIC_URL=http://localhost:3000
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   Application will run on `http://localhost:3000`

### Database Setup

1. **Install MongoDB** (if running locally)
   - macOS: `brew install mongodb-community`
   - Ubuntu: Follow [MongoDB installation guide](https://docs.mongodb.com/manual/installation/)
   - Windows: Download from [MongoDB website](https://www.mongodb.com/try/download/community)

2. **Start MongoDB service**
   ```bash
   # macOS/Linux
   sudo systemctl start mongod
   # or
   brew services start mongodb-community
   
   # Windows
   net start MongoDB
   ```

### S3 Storage Setup

1. **Create S3 bucket** (or Backblaze B2 bucket)

2. **Configure CORS policy** for your bucket:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["http://localhost:3000"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

3. **Create access credentials** with appropriate permissions

## Architecture Decisions

### Client-Side Video Processing
- **FFmpeg.wasm**: Chosen for client-side video trimming to reduce server load and provide instant feedback
- **MediaRecorder API**: Native browser API for screen recording, ensuring compatibility and performance

### Storage Strategy
- **S3-Compatible Storage**: Using Backblaze B2 for cost-effective cloud storage
- **Signed URLs**: Secure direct uploads and downloads without exposing credentials
- **Presigned Upload URLs**: Allow direct client-to-storage uploads, reducing server bandwidth

### Authentication & Security
- **JWT Tokens**: Stateless authentication for scalability
- **Conditional Auth**: Public recordings accessible without authentication, private recordings require auth
- **bcrypt**: Industry-standard password hashing

### Database Design
- **MongoDB**: Document-based storage suitable for flexible recording metadata
- **Mongoose ODM**: Type-safe database operations with schema validation

### Frontend Architecture
- **Next.js App Router**: Modern React framework with server-side rendering capabilities
- **Component Composition**: Modular components for recording, trimming, and playback
- **Context API**: Global authentication state management

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

### Recordings
- `GET /recordings` - List user's recordings (authenticated)
- `POST /recordings` - Create new recording entry and get upload URL
- `GET /recordings/:link` - Get recording by share link (public/conditional auth)
- `PUT /recordings/:id` - Update recording metadata
- `DELETE /recordings/:id` - Delete recording and associated file



## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


