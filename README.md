# Elanta E-commerce Dashboard

A modern multi-vendor e-commerce dashboard built with Next.js and Firebase.

## Features

- 🔐 Authentication with Firebase Auth
- 🏪 Multi-vendor marketplace management
- 📊 Dashboard with sales analytics
- 📦 Product management
- 🚚 Order processing
- 📈 Store analytics
- 👥 Vendor and customer management
- 🔍 Responsive design for all devices

## Tech Stack

- **Frontend**: Next.js with TypeScript, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **State Management**: React Context API
- **Forms**: React Hook Form
- **Data Visualization**: Chart.js
- **Icons**: React Icons

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Firebase project

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/elanta-dashboard.git
cd elanta-dashboard
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

Copy the `.env.local.example` file to `.env.local` and fill in your Firebase credentials:

```bash
cp .env.local.example .env.local
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Firebase Setup

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password
3. Create Firestore database
4. Enable Storage
5. Get your Firebase configuration and update the `.env.local` file

## Folder Structure

```
elanta-dashboard/
├── public/
├── src/
│   ├── app/               # Next.js app router pages
│   ├── components/        # Reusable UI components
│   │   ├── layout/        # Layout components
│   │   └── ui/            # UI components
│   ├── contexts/          # React context providers
│   ├── lib/               # Utility functions and Firebase setup
│   ├── providers/         # Client-side providers
│   └── types/             # TypeScript type definitions
├── .env.local.example     # Example environment variables
└── README.md              # Project documentation
```

## License

This project is licensed under the MIT License.
