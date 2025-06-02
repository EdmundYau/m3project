import React, { useRef, useState } from "react";
import { saveAs } from "file-saver";
import { v4 as uuidv4 } from "uuid";
import { Link } from "react-router-dom"; // ADD THIS!
import PDFViewer from "./components/PDFViewer"; // Adjust the import path as necessary


const GestureCollector = ({ model }) => {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [username, setUsername] = useState("");
  const [selectedShape, setSelectedShape] = useState("square");
  const [gestures, setGestures] = useState([]);
  const [gestureStartTime, setGestureStartTime] = useState(null);
  const [grayscale, setGrayscale] = useState("none"); // New grayscale state
  const [prediction, setPrediction] = useState(""); // NEW: Store the latest prediction

  function extractFeatures(points, maxSequenceLength = 100) {
    // Extract x and y arrays
    const x_coords = points.map((p) => p.x);
    const y_coords = points.map((p) => p.y);

    // Normalize x
    const x_min = Math.min(...x_coords);
    const x_max = Math.max(...x_coords);
    const x_range = x_max - x_min;
    const x_norm =
      x_range === 0
        ? x_coords.map(() => 0)
        : x_coords.map((val) => (val - x_min) / x_range);

    // Normalize y
    const y_min = Math.min(...y_coords);
    const y_max = Math.max(...y_coords);
    const y_range = y_max - y_min;
    const y_norm =
      y_range === 0
        ? y_coords.map(() => 0)
        : y_coords.map((val) => (val - y_min) / y_range);

    // Combine x and y into sequence
    let sequence = x_norm.map((val, i) => [val, y_norm[i]]);

    // Pad or truncate
    if (sequence.length < maxSequenceLength) {
      const padding = new Array(maxSequenceLength - sequence.length).fill([
        0, 0,
      ]);
      sequence = sequence.concat(padding);
    } else if (sequence.length > maxSequenceLength) {
      sequence = sequence.slice(0, maxSequenceLength);
    }

    // Flatten
    const flattened = sequence.flat();

    return flattened;
  }

  function preprocessGestureWithVelocity(
    points,
    targetNumPoints = 16,
    targetWidth = 50,
    targetHeight = 40
  ) {
    const x = points.map((p) => p.x);
    const y = points.map((p) => p.y);
    const velocityX = points.map((p) => p.velocityX);
    const velocityY = points.map((p) => p.velocityY);

    // Center at geometric center
    const centerX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const centerY = y.reduce((sum, val) => sum + val, 0) / y.length;
    const xCentered = x.map((val) => val - centerX);
    const yCentered = y.map((val) => val - centerY);

    // Scale proportionally
    const maxX = Math.max(...xCentered.map(Math.abs));
    const maxY = Math.max(...yCentered.map(Math.abs));
    const scaleX = maxX > 0 ? targetWidth / (2 * maxX) : 1.0;
    const scaleY = maxY > 0 ? targetHeight / (2 * maxY) : 1.0;
    const scaleFactor = Math.min(scaleX, scaleY);
    const xScaled = xCentered.map((val) => val * scaleFactor);
    const yScaled = yCentered.map((val) => val * scaleFactor);

    // Calculate cumulative distances
    const distances = [];
    for (let i = 1; i < xScaled.length; i++) {
      const dx = xScaled[i] - xScaled[i - 1];
      const dy = yScaled[i] - yScaled[i - 1];
      distances.push(Math.sqrt(dx * dx + dy * dy));
    }

    const cumulativeDistance = [0];
    distances.forEach((d, i) => {
      cumulativeDistance.push(cumulativeDistance[i] + d);
    });
    const totalDistance = cumulativeDistance[cumulativeDistance.length - 1];
    if (totalDistance === 0) {
      return null; // Skip gesture with no movement
    }

    // Remove duplicate cumulative distances
    const uniqueIndices = cumulativeDistance.reduce((indices, val, i, arr) => {
      if (i === 0 || val !== arr[i - 1]) {
        indices.push(i);
      }
      return indices;
    }, []);
    const cumulativeDistanceUnique = uniqueIndices.map(
      (i) => cumulativeDistance[i]
    );
    const xUnique = uniqueIndices.map((i) => xScaled[i]);
    const yUnique = uniqueIndices.map((i) => yScaled[i]);
    const vxUnique = uniqueIndices.map((i) => velocityX[i]);
    const vyUnique = uniqueIndices.map((i) => velocityY[i]);

    if (cumulativeDistanceUnique.length < 2) {
      return null; // Not enough points to interpolate
    }

    // Interpolate to targetNumPoints
    const targetDistances = [];
    for (let i = 0; i < targetNumPoints; i++) {
      targetDistances.push((i * totalDistance) / (targetNumPoints - 1));
    }

    const interpolate = (xs, ys, targetXs) => {
      const result = [];
      for (let tx of targetXs) {
        let i = 0;
        while (i < xs.length - 1 && xs[i + 1] < tx) i++;
        if (i === xs.length - 1) {
          result.push(ys[i]);
        } else {
          const t = (tx - xs[i]) / (xs[i + 1] - xs[i]);
          result.push(ys[i] + t * (ys[i + 1] - ys[i]));
        }
      }
      return result;
    };

    const xResampled = interpolate(
      cumulativeDistanceUnique,
      xUnique,
      targetDistances
    );
    const yResampled = interpolate(
      cumulativeDistanceUnique,
      yUnique,
      targetDistances
    );
    const vxResampled = interpolate(
      cumulativeDistanceUnique,
      vxUnique,
      targetDistances
    );
    const vyResampled = interpolate(
      cumulativeDistanceUnique,
      vyUnique,
      targetDistances
    );

    // Combine features into a single flattened array
    const flattened = [];
    for (let i = 0; i < targetNumPoints; i++) {
      flattened.push(
        xResampled[i],
        yResampled[i],
        vxResampled[i],
        vyResampled[i]
      );
    }

    return flattened;
  }

  // Add this inside your component:

  const preprocessGesture = (
    rawPoints,
    targetNumPoints = 16,
    targetWidth = 50,
    targetHeight = 40
  ) => {
    // Extract x and y coordinates
    const x = rawPoints.map((p) => p.x);
    const y = rawPoints.map((p) => p.y);

    // Center at geometric center
    const centerX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const centerY = y.reduce((sum, val) => sum + val, 0) / y.length;
    const xCentered = x.map((val) => val - centerX);
    const yCentered = y.map((val) => val - centerY);

    // Scale proportionally
    const maxX = Math.max(...xCentered.map(Math.abs));
    const maxY = Math.max(...yCentered.map(Math.abs));
    const scaleX = maxX > 0 ? targetWidth / (2 * maxX) : 1.0;
    const scaleY = maxY > 0 ? targetHeight / (2 * maxY) : 1.0;
    const scaleFactor = Math.min(scaleX, scaleY);
    const xScaled = xCentered.map((val) => val * scaleFactor);
    const yScaled = yCentered.map((val) => val * scaleFactor);

    // Calculate cumulative distances
    let cumulativeDistances = [0];
    for (let i = 1; i < xScaled.length; i++) {
      const dx = xScaled[i] - xScaled[i - 1];
      const dy = yScaled[i] - yScaled[i - 1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      cumulativeDistances.push(cumulativeDistances[i - 1] + distance);
    }

    const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];
    if (totalDistance === 0) {
      // Gesture didn't move, so just duplicate the first point
      return Array(targetNumPoints * 2).fill(0);
    }

    // Interpolate to get targetNumPoints
    const targetDistances = [];
    for (let i = 0; i < targetNumPoints; i++) {
      targetDistances.push((i * totalDistance) / (targetNumPoints - 1));
    }

    const xResampled = [];
    const yResampled = [];

    for (let d of targetDistances) {
      // Find the segment where this distance falls
      let i = 0;
      while (
        i < cumulativeDistances.length - 1 &&
        cumulativeDistances[i + 1] < d
      ) {
        i++;
      }
      const ratio =
        (d - cumulativeDistances[i]) /
        (cumulativeDistances[i + 1] - cumulativeDistances[i]);
      xResampled.push(xScaled[i] + ratio * (xScaled[i + 1] - xScaled[i]));
      yResampled.push(yScaled[i] + ratio * (yScaled[i + 1] - yScaled[i]));
    }

    // Flatten and return [x1, y1, x2, y2, ...]
    const flattened = [];
    for (let i = 0; i < targetNumPoints; i++) {
      flattened.push(xResampled[i], yResampled[i]);
    }

    return flattened;
  };

  // Clear button handler
  const handleClear = () => {
    setPoints([]);
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handlePredict = async (currentPoints) => {
    let processedGesture;
    switch (model) {
      case "knn":
        processedGesture = preprocessGesture(currentPoints);
        break;
      case "rf":
        processedGesture = preprocessGestureWithVelocity(currentPoints);
        break;
      case "svm":
        processedGesture = extractFeatures(currentPoints, 100);
        break;
      default:
        alert("Invalid model specified.");
        return;
    }

    if (!processedGesture) {
      alert("Invalid gesture. Not enough data points or no movement.");
      return;
    }

    let endpoint = "";
    switch (model) {
      case "knn":
        endpoint = "http://localhost:8000/predict";
        break;
      case "rf":
        endpoint = "http://localhost:8000/predict-rf";
        break;
      case "svm":
        endpoint = "http://localhost:8000/predict-svm";
        break;
      default:
        console.error("Invalid model selected");
        return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: processedGesture }),
      });
      const data = await response.json();
      setPrediction(data.prediction); // Set the prediction text here

      // alert(`${model.toUpperCase()} Prediction: ${data.prediction}`);
      // Handle grayscale logic based on prediction
      switch (data.prediction.toLowerCase()) {
        case "square":
          setGrayscale("fade");
          break;
        case "triangle":
          setGrayscale("gray");
          break;
        case "circle":
          setGrayscale("none");
          break;
        default:
          break;
      }
      handleClear();

    } catch (error) {
      console.error("Prediction error:", error);
      alert("Error during prediction. Check console for details.");
    }
  };
  const handlePredictButton = async () => {
    let processedGesture;
    switch (model) {
      case "knn":
        processedGesture = preprocessGesture(points);
        break;
      case "rf":
        processedGesture = preprocessGestureWithVelocity(points);
        break;
      case "svm":
        processedGesture = extractFeatures(points, 100);
        break;
      default:
        alert("Invalid model specified.");
        return;
    }

    if (!processedGesture) {
      alert("Invalid gesture. Not enough data points or no movement.");
      return;
    }

    let endpoint = "";
    switch (model) {
      case "knn":
        endpoint = "http://localhost:8000/predict";
        break;
      case "rf":
        endpoint = "http://localhost:8000/predict-rf";
        break;
      case "svm":
        endpoint = "http://localhost:8000/predict-svm";
        break;
      default:
        console.error("Invalid model selected");
        return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: processedGesture }),
      });
      const data = await response.json();
      setPrediction(data.prediction); // Set the prediction text here
      switch (data.prediction.toLowerCase()) {
        case "square":
          setGrayscale("fade");
          break;
        case "triangle":
          setGrayscale("gray");
          break;
        case "circle":
          setGrayscale("none");
          break;
        default:
          break;
      }
      handleClear();


      // alert(`${model.toUpperCase()} Prediction: ${data.prediction}`);
    } catch (error) {
      console.error("Prediction error:", error);
      alert("Error during prediction. Check console for details.");
    }
  };

  const handleMouseDown = (e) => {
    const startTime = Date.now() / 1000; // Convert to seconds
    setGestureStartTime(startTime);
    setDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = startTime;
    setPoints([{ x, y, time, velocityX: 0, velocityY: 0, speed: 0 }]);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMouseMove = (e) => {
    if (!drawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const currentTime = Date.now() / 1000; // Convert to seconds

    // Calculate velocity if there are previous points
    let velocityX = 0;
    let velocityY = 0;
    let speed = 0;

    if (points.length > 0) {
      const prevPoint = points[points.length - 1];
      const deltaTime = currentTime - prevPoint.time;

      if (deltaTime > 0) {
        velocityX = (x - prevPoint.x) / deltaTime;
        velocityY = (y - prevPoint.y) / deltaTime;
        speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      }
    }

    setPoints((prev) => [
      ...prev,
      { x, y, time: currentTime, velocityX, velocityY, speed },
    ]);

    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    setDrawing(false);
    const endTime = Date.now() / 1000; // Convert to seconds
    const duration = points.length > 0 ? endTime - gestureStartTime : 0;

    // Update the last point to include the final velocities
    if (points.length > 1) {
      const updatedPoints = [...points];
      updatedPoints[updatedPoints.length - 1] = {
        ...updatedPoints[updatedPoints.length - 1],
        isLastPoint: true,
      };
      setPoints(updatedPoints);
    }

    // Store the duration
    if (points.length > 0) {
      const updatedPoints = points.map((point) => ({
        ...point,
        gestureDuration: duration,
      }));
      setPoints(updatedPoints);

      if (model === "knn" || model === "rf" || model === "svm") {
        handlePredict(updatedPoints);
      }
    }
  };

  const handleSaveGesture = () => {
    if (!username.trim() || points.length === 0) {
      alert("Please enter your name and draw a gesture.");
      return;
    }
    const gestureId = uuidv4(); // Generate a unique ID for this gesture
    const startTime = gestureStartTime;
    const endTime = points[points.length - 1].time;
    const duration = endTime - startTime;

    const newGesture = {
      id: gestureId,
      username,
      shape: selectedShape,
      points,
      startTime,
      endTime,
      duration,
    };
    setGestures((prev) => [...prev, newGesture]);
    setPoints([]);

    // Clear canvas
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleDownloadGestures = () => {
    if (gestures.length === 0) {
      alert("No gestures to download.");
      return;
    }

    // Convert to CSV format with expanded features
    let csvContent =
      "gestureId,username,shape,pointIndex,x,y,time,velocityX,velocityY,speed,gestureStartTime,gestureEndTime,gestureDuration\n";

    gestures.forEach((gesture) => {
      gesture.points.forEach((point, index) => {
        csvContent += `${gesture.id},${gesture.username},${
          gesture.shape
        },${index},${point.x},${point.y},${point.time.toFixed(
          3
        )},${point.velocityX.toFixed(3)},${point.velocityY.toFixed(
          3
        )},${point.speed.toFixed(3)},${gesture.startTime.toFixed(
          3
        )},${gesture.endTime.toFixed(3)},${gesture.duration.toFixed(3)}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `${username}_gestures.csv`);
  };

  return (
    <>
      <div>
        {/* Only show name input and shape selection on "/" */}
        {!model && (
          <>
            <div style={{ marginBottom: "15px" }}>
              <label
                htmlFor="username"
                style={{ display: "block", marginBottom: "5px" }}
              >
                Your Name:
              </label>
              <input
                id="username"
                type="text"
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ padding: "5px", width: "200px" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <p style={{ marginBottom: "5px" }}>Select shape to draw:</p>
              <div style={{ display: "flex", gap: "15px" }}>
                {["square", "circle", "triangle"].map((shape) => (
                  <label
                    key={shape}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="shape"
                      value={shape}
                      checked={selectedShape === shape}
                      onChange={() => setSelectedShape(shape)}
                      style={{ marginRight: "5px" }}
                    />
                    {shape.charAt(0).toUpperCase() + shape.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Classifier view (canvas + PDF side by side) */}
        {model ? (
          <div style={{ display: "flex", gap: "20px" }}>
            {/* Canvas */}
            <div
              style={{
                position: "sticky",
                top: "20px",
                alignSelf: "flex-start",
              }}
            >
              <div>
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                style={{ border: "1px solid black" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setDrawing(false)}
              ></canvas>

              <div style={{ marginTop: "20px" }}>
                <button
                  onClick={handlePredictButton}
                  style={{ padding: "5px 10px", marginRight: "10px" }}
                >
                  Predict Gesture ({model.toUpperCase()})
                </button>
                <button onClick={handleClear} style={{ padding: "5px 10px" }}>
                  Clear Canvas
                </button>
              </div>
            </div>
            {prediction && (
              <div style={{ marginTop: "15px" }}>
                <p>
                  <strong>Prediction:</strong> {prediction}
                </p>
              </div>
            )}
            </div>

            {/* PDF Viewer */}
            <div style={{ flex: 1, maxWidth: "600px" }}>
              <PDFViewer grayscale={grayscale} />
            </div>
          </div>
        ) : (
          <>
            {/* Canvas (only on main page) */}
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              style={{ border: "1px solid black" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => setDrawing(false)}
            ></canvas>

            {/* Save/Download/Clear Buttons */}
            <div style={{ marginTop: "15px" }}>
              <button
                onClick={handleSaveGesture}
                style={{ marginRight: "10px", padding: "5px 10px" }}
              >
                Save{" "}
                {selectedShape.charAt(0).toUpperCase() + selectedShape.slice(1)}
              </button>
              <button
                onClick={handleDownloadGestures}
                style={{ marginRight: "10px", padding: "5px 10px" }}
              >
                Download as CSV
              </button>
              <button onClick={handleClear} style={{ padding: "5px 10px" }}>
                Clear Canvas
              </button>
            </div>
            {prediction && (
              <div style={{ marginTop: "15px" }}>
                <p>
                  <strong>Prediction:</strong> {prediction}
                </p>
              </div>
            )}

            {/* Summary */}
            <div style={{ marginTop: "10px" }}>
              <p>{gestures.length} gestures collected</p>
              <ul>
                {["square", "circle", "triangle"].map((shape) => (
                  <li key={shape}>
                    {shape}: {gestures.filter((g) => g.shape === shape).length}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default GestureCollector;
