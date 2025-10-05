# AI-Powered Collaborative Drawing Canvas

A real-time collaborative drawing application with integrated AI assistance that helps you solve problems, understand concepts, and visualize ideas - all without leaving your canvas.

![Uploading screen-capture (1).gif…]()

## Overview

This is an innovative collaborative drawing platform where multiple users can draw together on a shared canvas. What makes it unique is the seamless AI integration - simply draw your problem, select a region, and get instant AI-powered explanations and solutions without switching contexts.

##  Key Features

- **Real-time Collaboration**: Multiple users can draw simultaneously on the same canvas
- **AI-Powered Assistance**: Select any region of your drawing to get instant help
  - No need to leave the canvas or switch to an LLM interface
  - Ask questions about what you've drawn
  - Get explanations, solutions, and insights in real-time
- **Perfect for**:
  - 📐 **Mathematical Problem Solving**: Draw equations, get step-by-step solutions
  - 🎓 **Students**: Visualize concepts and get instant explanations
  - 💻 **Competitive Programmers**: Dry run algorithms, trace execution flow
  - 📋 **Planners**: Brainstorm ideas and get AI suggestions
  - 🧠 **Problem Solvers**: Sketch problems and receive guided solutions

##  Getting Started

### Prerequisites

- Node.js 18+ installed
- npm, yarn, pnpm, or bun package manager

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd <project-directory>
```

2. Install dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Run the development server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎨 How It Works

1. **Draw**: Use the canvas tools to sketch problems, diagrams, or ideas
2. **Select**: Highlight any region of your drawing
3. **Ask**: The AI automatically analyzes the selected area
4. **Learn**: Get instant explanations, solutions, or suggestions

No context switching. No copy-pasting. Everything happens right on your canvas.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org) with App Router
- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Font**: [Geist](https://vercel.com/font) by Vercel
- **AI Integration**: Claude AI (or your chosen LLM)
- **Real-time Sync**: WebSocket/WebRTC for collaboration

##  Project Structure

```
├── app/
│   ├── page.tsx         # Main canvas page
│   ├── layout.tsx       # Root layout
│   └── globals.css      # Global styles
├── components/          # React components
├── lib/                 # Utility functions
└── public/             # Static assets
```

## 🔧 Key Technologies

- **[Next.js](https://nextjs.org/docs)**: Full-stack React framework
- **[next/font](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)**: Automatic font optimization

##  Use Cases

### For Students
- Draw mathematical equations and get step-by-step solutions
- Sketch diagrams and receive concept explanations
- Collaborate on group projects with built-in AI tutoring

### For Competitive Programmers
- Visualize algorithm execution
- Dry run code logic with visual traces
- Debug complex data structures interactively

### For Problem Solvers
- Brainstorm solutions visually
- Get AI-powered insights on your sketches
- Plan projects with intelligent suggestions

### For Educators
- Create interactive lessons
- Demonstrate concepts in real-time
- Provide instant feedback to students

## 🚧 Current Status

**MVP (Minimum Viable Product)**

This is the initial release with core functionality. We're actively developing new features and improvements.

### Coming Soon
- Enhanced drawing tools
- More AI model options
- Template library
- Export functionality
- Mobile optimization
- Advanced collaboration features

## 📚 Learn More

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial
- [Next.js GitHub repository](https://github.com/vercel/next.js)

## 🚀 Deployment

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Other Deployment Options
- AWS Amplify
- Netlify
- Railway
- Docker containers

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[Add your license here]

## 💡 Feedback & Support

Have questions or suggestions? We'd love to hear from you!

- Open an issue on GitHub
- [Add your contact/support channels]

---
