Moved from a local VS Code environment to a browser-based "Product-as-a-Service" model.
It required shifting our heavy Python processing to TensorFlow.js.
Users can just open a website and have it "just work" in 60 seconds without installing Python or VS Code, we will use the browser's own processing power.
Technology used :-
Frontend: HTML/JavaScript setup because it allows for browser notifications and audio alerts.
The ML Engine: We use FaceMesh (via MediaPipe). It provides 468 3D facial landmarks instantly. This replaces our manual data collection and 30-epoch training because the model is pre-trained to find eyes and pupils.
Real-time Calibration: Instead of a long training session, we do a "5-second look-at-the-corners" calibration to map the gaze to the screen.
Coding :-
index.html (The UI and Layout)
for loading the MediaPipe models and sets up the webcam view.
script.js (The Logic, ML, and Alerts)
script handles the Blink Detection (via Eye Aspect Ratio - EAR)
This script is designed to be "plug and play." It handles the logic for the 20-20-20 rule, timer, audio feedback, and data collection for the heatmap.
style.css (The Look)
This gives our project a modern, dark-themed "SaaS" look with a professional dashboard feel.
features :-
Speed: It loads in seconds because MediaPipe is highly optimized.
Privacy: No video data is sent to a server; all ML happens in the user's RAM.
Accessibility: It works on Chrome, Edge, and Safari without needing Python or libraries.
this is an ML (Machine Learning) project.
Even though it runs in a browser, it uses Computer Vision and Deep Learning models (specifically Convolutional Neural Networks) under the hood to perform facial landmark detection and pupil tracking. By using MediaPipe and TensorFlow.js, we are simply moving the "Inference" (the running of the model) from a heavy Python backend to a lightweight JavaScript frontend.
To generate a heatmap at the end of the session, we need to record "Gaze Points" while the user is working. Since we don't have an eye-tracking hardware, we use the Gaze Vector (where the nose/eyes are pointing) as a proxy.
we are integrating FaceMesh for blink detection, Gaze Estimation based on the nose-tip vector, and the Heatmap recording.
achieves "ML automation" goal:-
Zero Training Time: By using the MediaPipe FaceMesh pre-trained model, the "learning" is already done. The script instantly identifies eye coordinates as soon as the camera starts.
No Background Processing needed: Because it runs in the Chrome tab, it stays active while the user is in a Zoom/Webinar meeting in another window (as long as the Chrome tab isn't minimized or put to sleep by the OS).
Real-Time Feedback: The window.speechSynthesis ensures that even if the user isn't looking at our tab, they hear the instruction to take a break.