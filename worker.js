let seconds = 1200;
let timerId = null;
self.onmessage = function(e) {
    if (e.data.type === 'START') {
        if (timerId) clearInterval(timerId); 
        timerId = setInterval(() => {
            if (seconds > 0) {
                seconds--;
                postMessage({ type: 'TICK', value: seconds });
            } else {
                clearInterval(timerId);
                timerId = null;
                postMessage({ type: 'BREAK_TIME' });
            }
        }, 1000);
    } else if (e.data.type === 'RESET_TIMER') {
        seconds = 1200; // Reset to 20 minutes
        postMessage({ type: 'TICK', value: seconds });
        // Automatically start the next 20-min cycle
        self.onmessage({ data: { type: 'START' } });
    } else if (e.data.type === 'STOP') {
        clearInterval(timerId);
        timerId = null;
        seconds = 1200;
    }

};
