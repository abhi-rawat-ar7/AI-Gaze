let focusScores = [];
let bpmHistory = [];
let distractionCount = 0;
let lastFocusWasZero = false;
const videoElement = document.getElementById('webcam');
const focusBar = document.getElementById('focusBar');
const focusPercent = document.getElementById('focusPercent');
const blinkText = document.getElementById('blinkText'); 
const timerText = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const calibText = document.getElementById('calibText');
let isTracking = false;
let lastEyeState = "open"; 
let currentFocus = 100; 
let hasWarnedLowFocus = false;
let lastSpeechTime = 0;
let isBreakActive = false;
let isCalibrated = false;
let blinkTimestamps = []; 
let startTime = null; 
let pipWindow = null; 
async function toggleFloatingWindow() {
    try {
        if (!window.documentPictureInPicture) {
            alert("Document PiP not supported in this browser.");
            return;
        }
        pipWindow = await documentPictureInPicture.requestWindow({ width: 300, height: 450 });
        const stats = document.querySelector('.stats-panel');
        pipWindow.document.body.append(stats);
        [...document.styleSheets].forEach((styleSheet) => {
            try {
                const css = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                const style = document.createElement('style');
                style.textContent = css;
                pipWindow.document.head.appendChild(style);
            } catch (e) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = styleSheet.href;
                pipWindow.document.head.appendChild(link);
            }
        });
        pipWindow.addEventListener("pagehide", () => {
            document.querySelector('.main-grid').append(stats);
            pipWindow = null;
        });
    } catch (err) { console.error("PiP failed", err); }
}
function updateFocusScore(change) {
    currentFocus = Math.min(100, Math.max(0, currentFocus + change));
    const rounded = Math.floor(currentFocus);
    if (isTracking && isCalibrated && !isBreakActive) {
        focusScores.push(rounded);
        if (rounded === 0 && !lastFocusWasZero) {
            distractionCount++;
            lastFocusWasZero = true;
        } else if (rounded > 0) {
            lastFocusWasZero = false;
        }
    }
    if (focusBar) focusBar.style.width = rounded + "%";
    if (focusPercent) focusPercent.innerText = rounded + "%";
    if (rounded <= 5 && !hasWarnedLowFocus) {
        speakOnce("Focus lost");
        hasWarnedLowFocus = true;
    } else if (rounded > 70) {
        hasWarnedLowFocus = false;
    }
    const color = rounded < 40 ? "#ef4444" : "#10b981";
    if (focusBar) focusBar.style.background = color;
}
function onResults(results) {
    if (!isTracking || isBreakActive || !isCalibrated) return;
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        updateFocusScore(-5); 
        return;
    }
    const landmarks = results.multiFaceLandmarks[0];
    const noseTip = landmarks[1]; 
    const leftFace = landmarks[234];
    const rightFace = landmarks[454];
    const faceCenter = (leftFace.x + rightFace.x) / 2;
    const faceWidth = Math.abs(rightFace.x - leftFace.x);
    const horizontalDeviation = Math.abs(noseTip.x - faceCenter) / faceWidth;
    if (horizontalDeviation > 0.08) { 
        updateFocusScore(-4); 
    } else {
        updateFocusScore(1.5);
        const topEyelid = landmarks[159].y;
        const bottomEyelid = landmarks[145].y;
        const eyeGap = Math.abs(topEyelid - bottomEyelid);
        if (eyeGap < 0.012) {
            if (lastEyeState === "open") {
                blinkTimestamps.push(Date.now());
                lastEyeState = "closed";
            }
        } else {
            lastEyeState = "open";
        }
    }
    updateBPMDisplay();
}
function showSummaryReport() {
    const avgFocus = focusScores.length > 0 
        ? (focusScores.reduce((a, b) => a + b, 0) / focusScores.length).toFixed(1) 
        : 0;
    const avgBPM = bpmHistory.length > 0 
        ? (bpmHistory.reduce((a, b) => a + b, 0) / bpmHistory.length).toFixed(1) 
        : 0;
    const reportWindow = window.open("", "SessionSummary", "width=400,height=600");
    const reportHtml = `
        <html>
        <head>
            <title>Focus Session Report</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
            <style>
                body { font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333; }
                .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
                h1 { color: #10b981; }
                button { background: #10b981; color: white; border: none; padding: 10px 20px; 
                         border-radius: 5px; cursor: pointer; width: 100%; margin-top: 20px; }
            </style>
        </head>
        <body>
            <h1>Session Summary</h1>
            <div class="card"><strong>Average Focus:</strong> ${avgFocus}%</div>
            <div class="card"><strong>Average BPM:</strong> ${avgBPM}</div>
            <div class="card"><strong>Distractions:</strong> ${distractionCount} times</div>
            <button id="downloadPdf">Download PDF Report</button>

            <script>
                document.getElementById('downloadPdf').onclick = function() {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();
                    doc.setFontSize(22);
                    doc.text("Focus Session Report", 20, 20);
                    doc.setFontSize(14);
                    doc.text("Average Focus: ${avgFocus}%", 20, 40);
                    doc.text("Average BPM: ${avgBPM}", 20, 50);
                    doc.text("Total Distractions: ${distractionCount}", 20, 60);
                    doc.text("Generated on: " + new Date().toLocaleString(), 20, 80);
                    doc.save("focus-report.pdf");
                };
            </script>
        </body>
        </html>
    `;
    reportWindow.document.write(reportHtml);
}
startBtn.onclick = async () => {
    if (!isTracking) {
        await toggleFloatingWindow();
        isTracking = true;
        isCalibrated = false;
        currentFocus = 100;
        startTime = Date.now();
        minuteStartTime = startTime; 
        blinkTimestamps = [];
        updateFocusScore(0);
        startBtn.innerText = "Stop Tracking";
        const overlay = document.getElementById('calibrationOverlay');
        const calibTimer = document.getElementById('calibTimer');
        overlay.style.display = 'flex';
        calibText.innerText = "Setting up Tracker...";
        let timeLeft = 5;
        const countdown = setInterval(() => {
            timeLeft--;
            calibTimer.innerText = timeLeft;
            if (pipWindow) {
                pipWindow.document.title = `Calibrating: ${timeLeft}s`;
            }
            if (timeLeft <= 0) {
                clearInterval(countdown);
                calibText.innerText = "Tracker Active!";
                setTimeout(() => {
                    overlay.style.display = 'none';
                    isCalibrated = true; 
                    if (pipWindow) pipWindow.document.title = "AI Gaze Live";
                }, 1000);
            }
        }, 1000);
        timerWorker.postMessage({ type: 'START' });
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = stream;
            await videoElement.play();
            const faceMesh = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });
            faceMesh.setOptions({ 
                refineLandmarks: true, 
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.6 
            });
            faceMesh.onResults(onResults);
            async function runLoop() {
                if (isTracking) {
                    await faceMesh.send({ image: videoElement });
                    requestAnimationFrame(runLoop);
                }
            }
            runLoop();
        } catch (err) {
            console.error(err);
            isTracking = false;
            location.reload();
        }
    } else {
        isTracking = false;
        showSummaryReport();
        setTimeout(() => location.reload(), 3000);
    }
};
function speakOnce(text) {
    const now = Date.now();
    if (now - lastSpeechTime > 1000) { 
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
        lastSpeechTime = now;
    }
}
let currentBPMCount = 0; 
let minuteStartTime = null;
function updateBPMDisplay() {
    if (!isTracking || isBreakActive || !isCalibrated) return;
    const now = Date.now();
    if (!minuteStartTime) minuteStartTime = now;
    const elapsedInMinute = (now - minuteStartTime) / 1000;
    if (elapsedInMinute >= 60) {
        const finalBlinks = blinkTimestamps.length;
        bpmHistory.push(finalBlinks);   
        blinkText.innerText = finalBlinks;
        if (pipWindow) {
            const pipBlink = pipWindow.document.getElementById('blinkText');
            if (pipBlink) pipBlink.innerText = finalBlinks;
        }
        if (finalBlinks < 8) {
            speakOnce("Please take a break and start blinking more");
        } else if (finalBlinks >= 8 && finalBlinks <= 14) {
            speakOnce("Please blink more");
        }
        blinkTimestamps = []; 
        minuteStartTime = now; 
    } else {
        if (minuteStartTime === startTime && blinkText.innerText === "") {
            blinkText.innerText = "Calculating...";
        }
    }
}
function triggerAutoBreak() {
    isBreakActive = true;
    speakOnce("Break time");
    window.focus();
    const createOverlay = (targetDoc) => {
        const overlay = targetDoc.createElement('div');
        overlay.id = "autoBreakOverlay";
        overlay.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 1rem; color: black; text-align: center;">
                <h2 style="margin:0; font-size: 2rem;">EYE REST</h2>
                <p>Look 20 feet away</p>
                <div id="breakClock" style="font-size: 3rem; font-weight: bold; color: #ef4444;">20</div>
            </div>`;
        Object.assign(overlay.style, {
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 99999
        });
        targetDoc.body.appendChild(overlay);
        return overlay;
    };
    const mainOverlay = createOverlay(document);
    let pipOverlay = null;
    if (pipWindow) pipOverlay = createOverlay(pipWindow.document);
    let breakLeft = 20;
    const breakInt = setInterval(() => {
        breakLeft--;
        const clockMain = document.getElementById('breakClock');
        if (clockMain) clockMain.innerText = breakLeft;
        if (pipWindow) {
            const clockPip = pipWindow.document.getElementById('breakClock');
            if (clockPip) clockPip.innerText = breakLeft;
        }
        if (breakLeft <= 0) {
            clearInterval(breakInt);
            if (mainOverlay) mainOverlay.remove();
            if (pipOverlay) pipOverlay.remove();
            isBreakActive = false;
            currentFocus = 100; 
            updateFocusScore(0); 
            speakOnce("Break over");
            timerWorker.postMessage({ type: 'RESET_TIMER' });
        }
    }, 1000);
}
const timerWorker = new Worker('worker.js');
timerWorker.onmessage = (e) => {
    if (e.data.type === 'TICK') {
        const m = Math.floor(e.data.value / 60);
        const s = e.data.value % 60;
        const timeStr = `${m}:${s < 10 ? '0'+s : s}`;
        if (timerText) timerText.innerText = timeStr;
        if (pipWindow) {
            pipWindow.document.title = `Time: ${timeStr} | Focus: ${Math.floor(currentFocus)}%`;
            const pipTimer = pipWindow.document.getElementById('timer');
            if (pipTimer) pipTimer.innerText = timeStr;
        }
    } else if (e.data.type === 'BREAK_TIME') {
        triggerAutoBreak(); 
    }
};