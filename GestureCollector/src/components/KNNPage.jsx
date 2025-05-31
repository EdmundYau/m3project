import React from "react";
import GestureCollector from "../GestureCollector";
import PDFViewer from "./PDFViewer"; // Adjust the import path as necessary

const KNNPage = () => {
  return (
    <div>
      <h2>KNN Classifier</h2>
      <h1>My Continuous PDF Viewer</h1>
      <PDFViewer />
      <GestureCollector model="knn" />
    </div>
  );
};

export default KNNPage;
