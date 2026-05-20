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

## Production Deployment

You can deploy this static web application to any modern hosting provider (Vercel, Netlify, GitHub Pages, etc.).

### Build the Project
```bash
# Generate the production build
npm run build
```
This will create a `dist` folder containing the optimized production assets. You can deploy this folder to your hosting provider of choice.


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