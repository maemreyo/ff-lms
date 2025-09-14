# Fluent Flow - Project Overview

## Purpose
Fluent Flow is a language learning platform focused on interactive video lessons. The platform allows users to:
- Learn languages through YouTube video content
- Generate AI-powered quiz questions from video transcripts
- Participate in group learning sessions
- Track progress and vocabulary enhancement
- Use multiple AI providers for content generation

## Key Features
- **Interactive Video Learning**: YouTube integration via `youtubei.js` for loop-based learning sessions
- **Multi-AI Integration**: Supports Anthropic Claude (primary), OpenAI GPT, and Google Generative AI
- **Group Learning**: Collaborative learning with shared questions, quizzes, group invitations, and progress tracking
- **Question Generation**: AI-powered question generation from video content with multiple difficulty levels
- **Progress Tracking**: User analytics and vocabulary enhancement tracking
- **Custom Prompts**: User-defined learning prompts and vocabulary systems

## Architecture Pattern
The project follows a **service-oriented architecture** with clear separation of concerns:
- Business logic is centralized in dedicated service classes
- UI components are organized by feature domains
- Database operations are handled through Supabase with RLS policies
- State management uses TanStack Query with persistence for server state
- React Context for global application state (AuthContext)

## Target Platform
- Web application built with Next.js 15 App Router
- Deployed on Vercel with auto-deployment from git pushes
- Uses Supabase for backend services and PostgreSQL database