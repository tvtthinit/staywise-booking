CLAUDE.md
│
├── Project overview
├── Tech stack
├── Architecture
├── Domain/business rules
├── Database
├── API conventions
├── Django conventions
├── React conventions
├── Redis/Celery
├── Booking/availability
├── Pricing/payment
├── Security
├── Testing
├── Docker
├── CI/CD
├── Observability
├── Git/PR
└── Claude working rules
# CLAUDE.md

This file contains project-specific instructions for Claude Code.

Claude must read and understand this document before making changes to
the project.

---

# 1. Project Overview

## Project

Travel & Hotel Booking Platform

## Description

This is a production-oriented travel and hotel booking platform.

The platform allows customers to:

- Search hotels
- Search destinations
- Search available rooms
- View hotel details
- View room details
- Check availability
- Compare room prices
- Make hotel reservations
- Manage guests
- Make payments
- Cancel bookings
- Request refunds
- Apply promotions
- Receive booking confirmations
- View booking history
- Manage customer profiles
- Submit reviews and ratings

The administration platform allows:

- Hotel management
- Room management
- Room inventory management
- Availability management
- Pricing management
- Promotion management
- Booking management
- Customer management
- Payment management
- Refund management
- Reports
- Analytics
- User/role management

---

# 2. Main Technology Stack

## Backend

- Python 3.12+
- Django
- Django REST Framework
- Django ORM
- django-filter
- Simple JWT or equivalent authentication
- Pydantic where appropriate

## Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand or Redux Toolkit
- React Hook Form
- Zod
- Tailwind CSS or existing project UI framework

## Database

Primary database:

- PostgreSQL

Alternative supported database:

- MySQL 8+

PostgreSQL is preferred for production unless the project explicitly
requires MySQL.

## Cache / Queue

- Redis
- Celery
- Celery Beat

Redis is used for:

- Caching
- Celery broker
- Distributed locks where appropriate
- Rate limiting
- Temporary state

## Infrastructure

- Docker
- Docker Compose
- Nginx
- Gunicorn
- Linux

## Cloud

Primary target:

- AWS

Possible services:

- ECS / EC2
- RDS PostgreSQL
- ElastiCache Redis
- S3
- CloudFront
- Route 53
- Application Load Balancer
- Secrets Manager
- CloudWatch

## CI/CD

- GitHub Actions
- Docker
- pytest
- Ruff
- Black if used by the project
- mypy
- ESLint
- TypeScript
- Vitest / Jest
- Playwright
- Security scanning

---

# 3. Architecture

Use a modular monolith unless there is a strong reason to introduce
microservices.

Preferred architecture:

```text
React
  |
  | HTTPS / JSON
  |
Django REST API
  |
  +-------------------+
  |                   |
Domain Services      Django ORM
  |                   |
  +---------+---------+
            |
       PostgreSQL
            |
          Redis
            |
          Celery
            |
       Background Jobs