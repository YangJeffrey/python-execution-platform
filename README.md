# Fullstack Web Python Execution Platform

Built with Next.js, TypeScript, and FastAPI, the platform uses Docker-in-Docker to provide isolated, real-time code execution environments.

![Demo Screenshot](/public/screenshot-example.png)
[Watch Demo Video](https://raw.githubusercontent.com/yangjeffrey/python-execution-platform/main/public/pythonexecutionplatform.mp4)

### Features

- Secure Python execution environment supporting text and image/file output
- Save and manage multiple one-file Python scripts per user
- Real-time terminal access with command support

### Tech Stack

| Layer         | Technologies                                               |
| ------------- | ---------------------------------------------------------- |
| **Frontend**  | Next.js, Mantine UI, Tailwind CSS, Monaco Editor, Xterm.js |
| **Backend**   | FastAPI, Docker (Docker-in-Docker)                         |
| **Auth & DB** | Auth.js, Prisma ORM, PostgreSQL                            |

### Getting Started

#### Frontend

```bash
yarn install
yarn dev
```

#### Backend

```bash
cd backend
pip install -r requirements.txt
python api.py
```

#### Environment Variables

```bash
DATABASE_URL= ...
GITHUB_ID= ...
GITHUB_SECRET= ...
NEXTAUTH_URL=http://localhost:3000/api/auth
NEXT_PUBLIC_API_ADDRESS=localhost:8000
```
