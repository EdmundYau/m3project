from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np
import joblib
from fastapi.middleware.cors import CORSMiddleware


# Load the trained model and label encoder
knn_model = joblib.load('knn_modelbigger.pkl')
label_encoder = joblib.load('label_encoderbigger.pkl')

#load random forest model
rf_model = joblib.load('random_forest_model.pkl')

#load svm model
svm_model = joblib.load('gesture_svm_model.joblib')
svmlabel_encoder = joblib.load('svmlabel_encoder.pkl')

# Define the data structure expected in the POST request
class GestureInput(BaseModel):
    points: List[float]  # e.g., [x1, y1, x2, y2, ..., x16, y16]

app = FastAPI()
# Allow all origins (or restrict as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your React dev URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/predict")
async def predict_gesture(gesture: GestureInput):
    points = np.array(gesture.points).reshape(1, -1)
    print(f"Received points: {points}")
    try:
        prediction_index = knn_model.predict(points)[0]
        prediction_label = label_encoder.inverse_transform([prediction_index])[0]
        return {"prediction": prediction_label}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/predict-rf")
async def predict_rf(gesture: GestureInput):
    points = np.array(gesture.points).reshape(1, -1)
    print(f"Received points for Random Forest: {points}")
    try:
        prediction_index = rf_model.predict(points)[0]
        prediction_label = label_encoder.inverse_transform([prediction_index])[0]
        return {"prediction": prediction_label}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-svm")
async def predict_svm(gesture: GestureInput):
    points = np.array(gesture.points).reshape(1, -1)
    print(f"Received points for SVM: {points}")
    try:
        prediction_index = svm_model.predict(points)[0]
        prediction_label = label_encoder.inverse_transform([prediction_index])[0]
        return {"prediction": prediction_label}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
