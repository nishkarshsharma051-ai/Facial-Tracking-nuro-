# Eye Tracking Application

A comprehensive eye tracking application with real-time facial expression detection and session management.

## Features

- 🎥 Real-time camera-based eye tracking
- 😊 Facial expression recognition
- 📊 Session management and analytics
- 📈 Interactive charts and reports
- 📄 PDF report generation
- 👤 User authentication
- 📱 Responsive design

## Deployment to Netlify

### Option 1: Drag & Drop (Easiest)

1. Run `npm run build` to create the `dist` folder
2. Go to [Netlify](https://netlify.com)
3. Drag and drop the `dist` folder to deploy

### Option 2: Git Integration

1. Push this code to a GitHub repository
2. Connect your GitHub repo to Netlify
3. Netlify will automatically build and deploy

### Option 3: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Camera Permissions

This application requires camera access for eye tracking. Make sure to:

1. Use HTTPS (required for camera access)
2. Grant camera permissions when prompted
3. Use a modern browser (Chrome, Firefox, Safari)

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Firefox 85+
- ✅ Safari 14+
- ✅ Edge 88+

## Technologies Used

- React 18 with TypeScript
- MediaPipe for face detection
- Chart.js for data visualization
- Tailwind CSS for styling
- jsPDF for report generation
- WebRTC for camera access

## Security

- Camera access is only used for eye tracking
- No data is sent to external servers
- All data is stored locally in browser storage
- HTTPS required for camera functionality