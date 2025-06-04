let canvas, ctx, drawing = false, points = [], gestureStartTime = null;
let isCmdPressed = false;
let squareEffectStartScroll = null;
// Add this global variable to track the current grayscale level
let currentGrayscaleLevel = 0;

// Add these global variables near the top with your other globals
let currentDarknessLevel = 0;  // For triangle's darkness effect

function applyEffect(prediction) {
    // Don't reset all effects, just remove listeners and specific effects

    // Remove any existing scroll listeners first
    window.removeEventListener('scroll', handleScrollGrayscale);
    window.removeEventListener('scroll', handleScrollDarkness);

    // Remove any black overlay
    const blackOverlay = document.getElementById('black-overlay');
    if (blackOverlay) {
        blackOverlay.remove();
    }

    switch (prediction.toLowerCase()) {
        case 'triangle':
            // Keep current grayscale level but reset darkness
            currentDarknessLevel = 0;

            // Apply current grayscale with initial brightness
            document.documentElement.style.filter = `grayscale(${currentGrayscaleLevel}%) brightness(100%)`;

            // Add scroll listener for darkness effect
            window.addEventListener('scroll', handleScrollDarkness);
            break;

        case 'square':
            // Keep the current grayscale level, just update the filter
            document.documentElement.style.filter = `grayscale(${currentGrayscaleLevel}%)`;

            // Add scroll listener to continue increasing grayscale
            window.addEventListener('scroll', handleScrollGrayscale);
            break;

        case 'circle':
            // Only circle completely resets all effects
            removeEffects();
            break;

        default:
            console.log("Unknown prediction, no effect applied");
    }
}

// Modified function for square that increases grayscale with any scroll direction
function handleScrollGrayscale() {
    // Increase grayscale level by a smaller increment (0.3 instead of 0.5 for slower effect)
    currentGrayscaleLevel = Math.min(currentGrayscaleLevel + 0.45, 100);
    document.documentElement.style.filter = `grayscale(${currentGrayscaleLevel}%)`;

    // Optional: add a visual indicator at certain thresholds
    if (Math.round(currentGrayscaleLevel) % 20 === 0 && currentGrayscaleLevel > 0) {
        showPrediction(`Grayscale: ${Math.round(currentGrayscaleLevel)}%`);
    }

    // Remove the scroll listener once we reach 100% grayscale
    if (currentGrayscaleLevel >= 100) {
        window.removeEventListener('scroll', handleScrollGrayscale);
    }
}

// Fix the handleScrollDarkness function to use the correct listener name
function handleScrollDarkness() {
    // Increase both grayscale and darkness gradually
    // Grayscale increases faster than darkness
    currentGrayscaleLevel = Math.min(currentGrayscaleLevel + 0.9, 100);
    currentDarknessLevel = Math.min(currentDarknessLevel + 0.3, 100);

    // Apply both filters
    document.documentElement.style.filter = `grayscale(${currentGrayscaleLevel}%) brightness(${Math.max(100 - currentDarknessLevel, 0)}%)`;

    // Optional: add visual indicators at certain thresholds
    if (Math.round(currentGrayscaleLevel) % 20 === 0 && currentGrayscaleLevel > 0 && currentGrayscaleLevel < 100) {
        showPrediction(`Grayscale: ${Math.round(currentGrayscaleLevel)}%`);
    }

    if (Math.round(currentDarknessLevel) % 20 === 0 && currentDarknessLevel > 0 && currentDarknessLevel < 100) {
        showPrediction(`Darkness: ${Math.round(currentDarknessLevel)}%`);
    }

    // Create black overlay when reaching maximum darkness
    if (currentDarknessLevel >= 100) {
        window.removeEventListener('scroll', handleScrollDarkness);  // Fixed function name here

        // Create black overlay for complete blackout
        let overlay = document.getElementById('black-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'black-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.backgroundColor = 'black';
            overlay.style.zIndex = '999999';
            document.body.appendChild(overlay);
        }

        showPrediction("Screen fully darkened");
    }
}

// Separate the full reset function (only used by circle gesture)
function removeEffects() {
    // Reset all filters
    document.documentElement.style.filter = '';

    // Remove all event listeners
    window.removeEventListener('scroll', handleScrollGrayscale);
    window.removeEventListener('scroll', handleScrollDarkness);

    // Reset all levels
    currentGrayscaleLevel = 0;
    currentDarknessLevel = 0;

    // Remove any overlay
    const blackOverlay = document.getElementById('black-overlay');
    if (blackOverlay) {
        blackOverlay.remove();
    }
}
function initializeCanvas() {
    canvas = document.createElement('canvas');
    canvas.className = 'gesture-canvas-overlay';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#FF5722';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

function handleKeyDown(e) {
    if (e.key === 'Meta' || e.key === 'Command') {
        isCmdPressed = true;
    }
}

function handleKeyUp(e) {
    if (e.key === 'Meta' || e.key === 'Command') {
        isCmdPressed = false;
    }
}

function handleMouseDown(e) {
    if (!isCmdPressed) return;
    drawing = true;
    const x = e.clientX;
    const y = e.clientY;
    gestureStartTime = Date.now() / 1000;
    points = [{ x, y, time: gestureStartTime }];
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function handleMouseMove(e) {
    if (!drawing) return;
    const x = e.clientX;
    const y = e.clientY;
    const time = Date.now() / 1000;
    points.push({ x, y, time });
    ctx.lineTo(x, y);
    ctx.stroke();
    console.log(`Point added: (${x}, ${y}) at time ${time}`);
}

function handleMouseUp(e) {
    if (!drawing) return;
    drawing = false;
    if (points.length < 3) {
        clearCanvas();
        return;
    }
    console.log("Gesture completed with points:", points);
    preprocessAndSend(points);
    clearCanvas();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points = [];
}


function preprocessGesture(rawPoints, targetNumPoints = 16) {
    console.log("Preprocessing gesture with KNN...", rawPoints);
    if (rawPoints.length < 2) return null;
    console.log("Raw points knn:", rawPoints);
    const x = rawPoints.map(p => p.x);
    const y = rawPoints.map(p => p.y);
    const centerX = x.reduce((a, b) => a + b) / x.length;
    const centerY = y.reduce((a, b) => a + b) / y.length;
    const xCentered = x.map(val => val - centerX);
    const yCentered = y.map(val => val - centerY);
    const maxX = Math.max(...xCentered.map(Math.abs));
    const maxY = Math.max(...yCentered.map(Math.abs));
    const scale = Math.min(50 / (2 * maxX || 1), 40 / (2 * maxY || 1));
    const xScaled = xCentered.map(val => val * scale);
    const yScaled = yCentered.map(val => val * scale);
    let cumulative = [0];
    for (let i = 1; i < xScaled.length; i++) {
        const dx = xScaled[i] - xScaled[i - 1];
        const dy = yScaled[i] - yScaled[i - 1];
        cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
    }
    const totalDist = cumulative[cumulative.length - 1];
    if (totalDist === 0) return null;
    const targetDist = Array.from({ length: targetNumPoints }, (_, i) => i * totalDist / (targetNumPoints - 1));
    const xInterp = interpolate(cumulative, xScaled, targetDist);
    const yInterp = interpolate(cumulative, yScaled, targetDist);
    console.log("Processed sequence for KNN:", xInterp, yInterp);
    return xInterp.flatMap((xVal, i) => [xVal, yInterp[i]]);
}

function preprocessGestureWithVelocity(points, targetNumPoints = 16) {
    console.log("Preprocessing gesture with RF...", points);
    if (points.length < 2) return null;
    console.log("Raw points rf:", points);
    const x = points.map(p => p.x);
    const y = points.map(p => p.y);
    const velocityX = points.map((p, i) => i > 0 ? (p.x - points[i - 1].x) / (p.time - points[i - 1].time || 1e-6) : 0);
    const velocityY = points.map((p, i) => i > 0 ? (p.y - points[i - 1].y) / (p.time - points[i - 1].time || 1e-6) : 0);

    const centerX = x.reduce((a, b) => a + b) / x.length;
    const centerY = y.reduce((a, b) => a + b) / y.length;
    const xCentered = x.map(val => val - centerX);
    const yCentered = y.map(val => val - centerY);
    const maxX = Math.max(...xCentered.map(Math.abs));
    const maxY = Math.max(...yCentered.map(Math.abs));
    const scale = Math.min(50 / (2 * maxX || 1), 40 / (2 * maxY || 1));
    const xScaled = xCentered.map(val => val * scale);
    const yScaled = yCentered.map(val => val * scale);

    let cumulative = [0];
    for (let i = 1; i < xScaled.length; i++) {
        const dx = xScaled[i] - xScaled[i - 1];
        const dy = yScaled[i] - yScaled[i - 1];
        cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
    }
    const totalDist = cumulative[cumulative.length - 1];
    if (totalDist === 0) return null;

    const targetDist = Array.from({ length: targetNumPoints }, (_, i) => i * totalDist / (targetNumPoints - 1));
    const xInterp = interpolate(cumulative, xScaled, targetDist);
    const yInterp = interpolate(cumulative, yScaled, targetDist);
    const vxInterp = interpolate(cumulative, velocityX, targetDist);
    const vyInterp = interpolate(cumulative, velocityY, targetDist);

    const flattened = [];
    for (let i = 0; i < targetNumPoints; i++) {
        flattened.push(xInterp[i], yInterp[i], vxInterp[i], vyInterp[i]);
    }
    console.log("Processed sequence for RF:", flattened);
    return flattened;
}

function extractFeatures(points, maxSequenceLength = 100) {
    console.log("Extracting features for SVM...", points);
    // console.log("Raw points svm:", points);
    const x_coords = points.map(p => p.x);
    const y_coords = points.map(p => p.y);
    const x_min = Math.min(...x_coords);
    const x_max = Math.max(...x_coords);
    const x_range = x_max - x_min;
    const x_norm = x_range === 0 ? x_coords.map(() => 0) : x_coords.map(val => (val - x_min) / x_range);

    const y_min = Math.min(...y_coords);
    const y_max = Math.max(...y_coords);
    const y_range = y_max - y_min;
    const y_norm = y_range === 0 ? y_coords.map(() => 0) : y_coords.map(val => (val - y_min) / y_range);

    let sequence = x_norm.map((val, i) => [val, y_norm[i]]);
    if (sequence.length < maxSequenceLength) {
        const padding = new Array(maxSequenceLength - sequence.length).fill([0, 0]);
        sequence = sequence.concat(padding);
    } else if (sequence.length > maxSequenceLength) {
        sequence = sequence.slice(0, maxSequenceLength);
    }
    console.log("Processed sequence for SVM:", sequence.flat());
    return sequence.flat();
}

function preprocessAndSend(points) {
    console.log("Preprocessing gesture...");

    // Call background.js to get model
    chrome.runtime.sendMessage({ action: 'getSelectedModel' }, (response) => {
        console.log("Got model response:", response);

        // Handle null/undefined response with a fallback
        let model = 'knn';  // Default model

        if (response && response.selectedModel) {
            model = response.selectedModel;
        } else {
            console.warn("No model received from background, using default:", model);
        }

        console.log("Using model:", model);

        let processed, endpoint;

        switch (model) {
            case 'knn':
                console.log("Using KNN model for prediction", points);
                processed = preprocessGesture(points);
                endpoint = 'http://localhost:8000/predict';
                break;
            case 'rf':
                console.log("Using RF model for prediction", points);
                processed = preprocessGestureWithVelocity(points);
                endpoint = 'http://localhost:8000/predict-rf';
                break;
            case 'svm':
                console.log("Using SVM model for prediction", points);
                processed = extractFeatures(points, 100);
                endpoint = 'http://localhost:8000/predict-svm';
                break;
            default:
                console.error('Invalid model selected, using default');
                processed = preprocessGesture(points);
                endpoint = 'http://localhost:8000/predict';
                break;
        }

        if (!processed) {
            console.log("Failed to preprocess gesture");
            showPrediction("Invalid gesture");
            return;
        }

        console.log("Sending to endpoint:", endpoint);

        // Show processing indicator
        showPrediction("Processing...");

        // Send the API request using fetch
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ points: processed })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Prediction result:", data);

                // Show the prediction result with model type
                if (data && data.prediction) {
                    // Pass the model type to showPrediction
                    showPrediction(`Predicted (${model.toUpperCase()}): ${data.prediction}`);
                    applyEffect(data.prediction); // Apply the effect based on the prediction
                } else {
                    showPrediction("No prediction returned");
                }
            })
            .catch(error => {
                console.error("API error:", error);
                showPrediction(`Error: ${error.message}`);
            });
    });
}

// Improve the showPrediction function to be more visible
function showPrediction(prediction) {
    let display = document.querySelector('.gesture-prediction');
    if (!display) {
        display = document.createElement('div');
        display.className = 'gesture-prediction';
        display.style.position = 'fixed';
        display.style.top = '20px';
        display.style.right = '20px';
        display.style.padding = '10px 15px';
        display.style.backgroundColor = 'rgba(0,0,0,0.8)';
        display.style.color = 'white';
        display.style.borderRadius = '8px';
        display.style.fontFamily = 'Arial, sans-serif';
        display.style.fontSize = '16px';
        display.style.zIndex = '10000';
        document.body.appendChild(display);
    }

    display.textContent = prediction;
    display.style.opacity = '1';

    // Remove after 3 seconds
    setTimeout(() => {
        display.style.opacity = '0';
    }, 3000);
}


function interpolate(xs, ys, targetXs) {
    return targetXs.map(tx => {
        let i = 0;
        while (i < xs.length - 1 && xs[i + 1] < tx) i++;
        if (i === xs.length - 1) return ys[i];
        const ratio = (tx - xs[i]) / (xs[i + 1] - xs[i] || 1e-6);
        return ys[i] + ratio * (ys[i + 1] - ys[i]);
    });
}

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);

initializeCanvas();
