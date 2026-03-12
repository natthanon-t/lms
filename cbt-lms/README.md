# CBT-LMS (Computer-Based Training Learning Management System)

A modern, feature-rich Learning Management System built with React and Vite, designed for computer-based training with support for courses, exams, and learner progress tracking.

## Features

- 📚 **Course Management** - Create, edit, and organize learning content with markdown support
- 📝 **Exam System** - Create and manage exams with detailed question banks
- 📊 **Progress Tracking** - Track learner progress through courses and subtopics
- 🎯 **Personalized Dashboard** - Customized lobby page with in-progress courses and recommendations
- 🔐 **Access Control** - Role-based access control for students, instructors, and administrators
- 🎨 **Modern UI** - Responsive design with status indicators and skill tags
- 🌐 **Thai Language Support** - Full Thai language interface

## Tech Stack

- **Frontend Framework:** React 18+ with Vite
- **Styling:** CSS with responsive design
- **State Management:** React Context API
- **Data Handling:** JSON-based storage with local persistence
- **Routing:** React Router v6

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd cbt-lms
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## Project Structure

```
src/
├── components/          # Reusable React components
├── contexts/           # React Context providers (Auth, AppData)
├── pages/              # Page components (LobbyPage, ContentPage, ExamPage, etc.)
├── services/           # Business logic and utilities
├── styles/             # Global and component styles
└── App.jsx            # Main application component
```

## Key Pages

- **LobbyPage** (`/`) - Personalized dashboard with greeting, in-progress courses, and recommendations
- **ContentPage** (`/content`) - Browse and manage all available courses
- **ContentDetailPage** (`/content/:id`) - View course content and track progress
- **ExamPage** (`/exam`) - Browse and manage exams
- **ExamDetailPage** (`/exam/:id`) - View exam details before taking the exam
- **ExamTakingPage** (`/exam/:id/take`) - Complete an exam

## Development Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Features Highlights

### Adaptive Learning
- Skill-based course recommendations
- Progress tracking with visual indicators
- Personalized greeting and daily quotes on dashboard

### Exam Management
- Create exams with detailed descriptions
- Track attempt counts and learner engagement
- Edit and manage exam content

### Access Control
- Public and private content options
- Manage-only, student-only, and public visibility levels
- Owner-based permissions for content editing

## License

This project is part of a senior project initiative.
