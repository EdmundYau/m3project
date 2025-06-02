import os
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import SVC
from sklearn.metrics import classification_report, confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt
import json

# List all CSV files in the GestureDatasetMax directory
csv_files = [os.path.join('GestureDatasetBigger', f) for f in os.listdir('GestureDatasetBigger') if f.endswith('_gestures.csv')]

# Load and combine all data
all_data = pd.concat(
    [pd.read_csv(file) for file in csv_files],
    ignore_index=True
)
print(f"Loaded {len(all_data)} rows from {len(csv_files)} files.")

# Feature extraction function (as in notebook)
def extract_features(df, max_sequence_length=100):
    features = []
    labels = []
    for gesture_id, group in df.groupby('gestureId'):
        x_coords = group['x'].values
        y_coords = group['y'].values
        x_range = x_coords.max() - x_coords.min()
        y_range = y_coords.max() - y_coords.min()
        if x_range == 0:
            x_coords = np.zeros_like(x_coords)
        else:
            x_coords = (x_coords - x_coords.min()) / x_range
        if y_range == 0:
            y_coords = np.zeros_like(y_coords)
        else:
            y_coords = (y_coords - y_coords.min()) / y_range
        sequence = np.column_stack((x_coords, y_coords))
        if len(sequence) < max_sequence_length:
            padding = np.zeros((max_sequence_length - len(sequence), 2))
            sequence = np.vstack((sequence, padding))
        else:
            sequence = sequence[:max_sequence_length]
        features.append(sequence.flatten())
        labels.append(group['shape'].iloc[0])
    return np.array(features), np.array(labels)

X, y = extract_features(all_data)
print(f'Feature matrix shape: {X.shape}')
print(f'Labels shape: {y.shape}')

# Encode labels and split data
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)
with open('svm_label_encoder_classes_max.json', 'w') as f:
    json.dump(label_encoder.classes_.tolist(), f)
X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)
print(f'Train set: {X_train.shape}, Test set: {X_test.shape}')

# Train SVM
svm_model = SVC(kernel='rbf', gamma='auto')
svm_model.fit(X_train, y_train)

# Evaluate
y_pred = svm_model.predict(X_test)
print("Classification Report:")
print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))

# Save model and label encoder
joblib.dump(svm_model, 'gesture_svm_model_max.joblib')
joblib.dump(label_encoder, 'svm_label_encoder_max.pkl')

# Save confusion matrix plot
cm = confusion_matrix(y_test, y_pred)
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=label_encoder.classes_)
disp.plot(cmap=plt.cm.Blues, xticks_rotation=45)
plt.title('SVM Confusion Matrix (GestureDatasetMax)')
plt.tight_layout()
plt.savefig('svm_confusion_matrix_max.png')
plt.close()

print('Model, label encoder, and confusion matrix saved.') 